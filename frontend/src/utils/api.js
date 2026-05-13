// src/utils/api.js
// ─── Axios API client with JWT auth, refresh, and interceptors ────────────────

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Inject Authorization header
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

// Auto-attach stored token on module load
const storedToken = localStorage.getItem("access_token");
if (storedToken) setAuthToken(storedToken);

// ── Response interceptor: refresh JWT on 401 ──────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers["Authorization"] = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });
        const newAccess = data.access;
        localStorage.setItem("access_token", newAccess);
        setAuthToken(newAccess);
        processQueue(null, newAccess);
        originalRequest.headers["Authorization"] = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setAuthToken(null);
        window.dispatchEvent(new CustomEvent("auth:expired"));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── API methods ───────────────────────────────────────────────────────────────

// Auth
export const authAPI = {
  register: (data)   => api.post("/auth/register/", data),
  login:    (data)   => api.post("/auth/login/", data),
  logout:   (token)  => api.post("/auth/logout/", { refresh: token }),
  refresh:  (token)  => api.post("/auth/token/refresh/", { refresh: token }),
  changePassword: (data) => api.post("/auth/change-password/", data),
};

// Profile
export const profileAPI = {
  get:        ()     => api.get("/profile/"),
  update:     (data) => api.patch("/profile/", data),
  uploadKYC:  (data) => api.post("/profile/kyc/", data, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  dashboard:  ()     => api.get("/dashboard/"),
};

// Wallet
export const walletAPI = {
  getWallets:      ()          => api.get("/wallet/"),
  getTransactions: (params)    => api.get("/wallet/transactions/", { params }),
};

// Markets
export const marketsAPI = {
  getCategories:  ()       => api.get("/markets/categories/"),
  getAll:         (params) => api.get("/markets/", { params }),
  getBySlug:      (slug)   => api.get(`/markets/${slug}/`),
  getCandles:     (slug, params) => api.get(`/markets/${slug}/candles/`, { params }),
  getTicks:       (slug, params) => api.get(`/markets/${slug}/ticks/`, { params }),
};

// Trade Types
export const tradeTypesAPI = {
  getAll:   (params) => api.get("/trade-types/", { params }),
};

// Trades
export const tradesAPI = {
  place:    (data)   => api.post("/trades/place/", data),
  getAll:   (params) => api.get("/trades/", { params }),
  getActive: ()      => api.get("/trades/active/"),
  getById:  (id)     => api.get(`/trades/${id}/`),
};

// Robots
export const robotsAPI = {
  getAll:    (params)     => api.get("/robots/", { params }),
  create:    (data)       => api.post("/robots/", data),
  getById:   (id)         => api.get(`/robots/${id}/`),
  update:    (id, data)   => api.patch(`/robots/${id}/`, data),
  delete:    (id)         => api.delete(`/robots/${id}/`),
  start:     (id)         => api.post(`/robots/${id}/start/`),
  stop:      (id)         => api.post(`/robots/${id}/stop/`),
  getLogs:   (id, params) => api.get(`/robots/${id}/logs/`, { params }),
  community: (params)     => api.get("/robots/community/", { params }),
};

// Payments — M-Pesa
export const mpesaAPI = {
  deposit:  (data) => api.post("/payments/mpesa/deposit/", data),
  withdraw: (data) => api.post("/payments/mpesa/withdraw/", data),
  history:  ()     => api.get("/payments/mpesa/history/"),
};

// Payments — PayPal
export const paypalAPI = {
  deposit:  (data)      => api.post("/payments/paypal/deposit/", data),
  capture:  (order_id)  => api.post("/payments/paypal/capture/", { order_id }),
  withdraw: (data)      => api.post("/payments/paypal/withdraw/", data),
};

// Payments — Binance
export const binanceAPI = {
  deposit:  (data) => api.post("/payments/binance/deposit/", data),
  withdraw: (data) => api.post("/payments/binance/withdraw/", data),
};

// Notifications
export const notificationsAPI = {
  getAll:      (params) => api.get("/notifications/", { params }),
  markRead:    (id)     => api.post(`/notifications/${id}/read/`),
  markAllRead: ()       => api.post("/notifications/mark-read/"),
};

export default api;
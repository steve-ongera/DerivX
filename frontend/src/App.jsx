// src/App.jsx
import React, { createContext, useContext, useEffect, useReducer, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

// Pages
import Home        from "./pages/Home";
import Trade       from "./pages/Trade";
import Markets     from "./pages/Markets";
import MarketDetail from "./pages/MarketDetail";
import Robot       from "./pages/Robot";
import Wallet      from "./pages/Wallet";
import Profile     from "./pages/Profile";
import Login       from "./pages/Login";
import Register    from "./pages/Register";
import NotFound    from "./pages/NotFound";

// Utils
import { api, setAuthToken } from "./utils/api";
import { wsManager } from "./utils/websocket";

// ─────────────────────────────────────────────
// AUTH CONTEXT
// ─────────────────────────────────────────────

export const AuthContext = createContext(null);

const initialState = {
  user: null,
  wallets: [],
  loading: true,
  isAuthenticated: false,
  unreadNotifications: 0,
};

function authReducer(state, action) {
  switch (action.type) {
    case "LOGIN":
      return { ...state, user: action.user, isAuthenticated: true, loading: false };
    case "LOGOUT":
      return { ...initialState, loading: false };
    case "SET_WALLETS":
      return { ...state, wallets: action.wallets };
    case "UPDATE_BALANCE":
      return {
        ...state,
        wallets: state.wallets.map((w) =>
          w.currency === action.currency
            ? { ...w, balance: action.balance, demo_balance: action.demo_balance }
            : w
        ),
      };
    case "SET_UNREAD":
      return { ...state, unreadNotifications: action.count };
    case "LOADED":
      return { ...state, loading: false };
    default:
      return state;
  }
}

// ─────────────────────────────────────────────
// AUTH PROVIDER
// ─────────────────────────────────────────────

function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setAuthToken(null);
    wsManager.disconnectAll();
    dispatch({ type: "LOGOUT" });
  }, []);

  const login = useCallback((userData, tokens) => {
    localStorage.setItem("access_token", tokens.access);
    localStorage.setItem("refresh_token", tokens.refresh);
    setAuthToken(tokens.access);
    dispatch({ type: "LOGIN", user: userData });

    // Connect WebSocket streams
    wsManager.connect("trades");
    wsManager.connect("notifications");

    // Listen for balance updates from WS
    wsManager.on("trades", "balance_update", (msg) => {
      Object.entries(msg).forEach(([currency, data]) => {
        if (typeof data === "object") {
          dispatch({ type: "UPDATE_BALANCE", currency, ...data });
        }
      });
    });

    wsManager.on("notifications", "unread_count", (msg) => {
      dispatch({ type: "SET_UNREAD", count: msg.count });
    });
  }, []);

  // Restore session on page load
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      dispatch({ type: "LOADED" });
      return;
    }
    setAuthToken(token);
    api.get("/profile/")
      .then((res) => {
        dispatch({ type: "LOGIN", user: res.data });
        wsManager.connect("trades");
        wsManager.connect("notifications");
      })
      .catch(() => {
        logout();
      });
  }, [logout]);

  // Fetch wallets when authenticated
  useEffect(() => {
    if (!state.isAuthenticated) return;
    api.get("/wallet/").then((res) => {
      dispatch({ type: "SET_WALLETS", wallets: res.data.results || res.data });
    });
  }, [state.isAuthenticated]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// ─────────────────────────────────────────────
// PROTECTED ROUTE
// ─────────────────────────────────────────────

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-loader">
        <span className="bi bi-arrow-repeat spin" />
      </div>
    );
  }

  return isAuthenticated
    ? children
    : <Navigate to="/login" state={{ from: location }} replace />;
}

// ─────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/"                      element={<Home />} />
          <Route path="/markets"               element={<Markets />} />
          <Route path="/markets/:slug"         element={<MarketDetail />} />
          <Route path="/login"                 element={<Login />} />
          <Route path="/register"              element={<Register />} />

          {/* Protected */}
          <Route path="/trade"                 element={<ProtectedRoute><Trade /></ProtectedRoute>} />
          <Route path="/trade/:slug"           element={<ProtectedRoute><Trade /></ProtectedRoute>} />
          <Route path="/robot"                 element={<ProtectedRoute><Robot /></ProtectedRoute>} />
          <Route path="/wallet"                element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
          <Route path="/profile"               element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*"                      element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
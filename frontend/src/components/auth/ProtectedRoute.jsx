// src/components/auth/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import Spinner from "../common/Spinner";
import api from "../../utils/api";

/**
 * Wraps routes that require authentication.
 *
 * Usage in App.jsx:
 *   <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
 *
 * On first render it validates the stored token against the API.
 * While validating it shows a full-screen spinner.
 * If invalid / expired → redirects to /login, preserving the intended path.
 */
const ProtectedRoute = ({ children, redirectTo = "/login" }) => {
  const location = useLocation();
  const [status, setStatus] = useState("checking"); // "checking" | "ok" | "fail"

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setStatus("fail"); return; }

    // Lightweight token check — hit a lightweight authenticated endpoint
    api.get("/wallet/")
      .then(() => setStatus("ok"))
      .catch(() => {
        // Try refresh
        const refresh = localStorage.getItem("refresh_token");
        if (!refresh) { setStatus("fail"); return; }

        api.post("/auth/token/refresh/", { refresh })
          .then((res) => {
            localStorage.setItem("access_token", res.data.access);
            setStatus("ok");
          })
          .catch(() => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            setStatus("fail");
          });
      });
  }, []);

  if (status === "checking") {
    return (
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: "100vh", flexDirection: "column", gap: "var(--space-md)",
          background: "var(--bg-base)",
        }}
      >
        <Spinner size="lg" color="primary" />
        <span style={{ color: "var(--text-muted)", fontSize: "var(--font-size-sm)" }}>
          Verifying session…
        </span>
      </div>
    );
  }

  if (status === "fail") {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
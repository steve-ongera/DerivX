
// ═══════════════════════════════════════════════════════════════
// src/pages/Login.jsx
// ═══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authAPI } from "../utils/api";
import { useAuth } from "../App";

export default function Login() {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const location     = useLocation();
  const from         = location.state?.from?.pathname || "/trade";

  const [form,    setForm]    = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async () => {
    if (!form.email || !form.password) { setError("Please fill all fields."); return; }
    setLoading(true); setError("");
    try {
      const { data } = await authAPI.login(form);
      login(data.user, { access: data.access, refresh: data.refresh });
      navigate(from, { replace: true });
    } catch (err) {
      const d = err.response?.data;
      setError(typeof d === "object" ? Object.values(d).flat().join(" ") : "Invalid credentials.");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <svg width="48" height="48" viewBox="0 0 56 56" fill="none" style={{ margin: "0 auto 12px" }}>
            <rect width="56" height="56" rx="10" fill="#6366f1" />
            <path d="M12 40 L20 20 L28 32 L36 18 L44 40" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Welcome back</h1>
          <p className="text-muted text-sm">Sign in to your DerivX account</p>
        </div>

        <div className="flex flex-col gap-md">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" placeholder="you@example.com"
              value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••"
              value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          </div>
        </div>

        {error && <div className="badge badge--danger w-full mt-md" style={{ padding: "8px 12px", justifyContent: "flex-start" }}><i className="bi bi-exclamation-circle" /> {error}</div>}

        <button className="btn btn--primary btn--full btn--lg mt-lg" onClick={handleSubmit} disabled={loading}>
          {loading ? <><i className="bi bi-arrow-repeat spin" /> Signing in…</> : <><i className="bi bi-box-arrow-in-right" /> Sign In</>}
        </button>

        <p className="text-center text-muted text-sm mt-lg">
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "var(--color-primary-light)", fontWeight: 600 }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}


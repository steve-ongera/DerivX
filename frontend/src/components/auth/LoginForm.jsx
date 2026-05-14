// src/components/auth/LoginForm.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../common/Button";
import { useToast } from "../common/Toast";
import api from "../../utils/api";

const LoginForm = ({ onSuccess }) => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = "Valid email required";
    if (form.password.length < 6) errs.password = "Password must be at least 6 characters";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await api.post("/auth/login/", form);
      const { access, refresh } = res.data;
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      toast.success("Welcome back!");
      onSuccess ? onSuccess(res.data) : navigate("/");
    } catch (err) {
      const detail = err?.response?.data?.detail || "Invalid credentials";
      toast.error(detail);
      setErrors({ general: detail });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
      {errors.general && (
        <div
          style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "var(--radius-md)", padding: "var(--space-sm) var(--space-md)",
            fontSize: "var(--font-size-sm)", color: "var(--color-danger)",
            display: "flex", alignItems: "center", gap: "var(--space-sm)",
          }}
        >
          <i className="bi bi-exclamation-circle" />
          {errors.general}
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Email Address</label>
        <div style={{ position: "relative" }}>
          <i
            className="bi bi-envelope"
            style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: "var(--text-muted)", fontSize: 14,
            }}
          />
          <input
            className={`form-input ${errors.email ? "form-input--error" : ""}`}
            style={{ paddingLeft: 36 }}
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={set("email")}
            autoComplete="email"
          />
        </div>
        {errors.email && <span className="form-error">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Password</label>
        <div style={{ position: "relative" }}>
          <i
            className="bi bi-lock"
            style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: "var(--text-muted)", fontSize: 14,
            }}
          />
          <input
            className={`form-input ${errors.password ? "form-input--error" : ""}`}
            style={{ paddingLeft: 36, paddingRight: 40 }}
            type={showPass ? "text" : "password"}
            placeholder="••••••••"
            value={form.password}
            onChange={set("password")}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer",
            }}
          >
            <i className={`bi ${showPass ? "bi-eye-slash" : "bi-eye"}`} />
          </button>
        </div>
        {errors.password && <span className="form-error">{errors.password}</span>}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Link
          to="/forgot-password"
          style={{ fontSize: "var(--font-size-xs)", color: "var(--color-primary-light)" }}
        >
          Forgot password?
        </Link>
      </div>

      <Button type="submit" variant="primary" full loading={loading}>
        <i className="bi bi-box-arrow-in-right" />
        Sign In
      </Button>

      <div className="divider" />

      <p style={{ textAlign: "center", fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>
        Don't have an account?{" "}
        <Link to="/register" style={{ color: "var(--color-primary-light)", fontWeight: 600 }}>
          Create one free
        </Link>
      </p>
    </form>
  );
};

export default LoginForm;
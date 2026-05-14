// src/components/auth/RegisterForm.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../common/Button";
import { useToast } from "../common/Toast";
import api from "../../utils/api";

const RegisterForm = ({ onSuccess }) => {
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", password: "", confirm_password: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = "First name is required";
    if (!form.last_name.trim())  errs.last_name  = "Last name is required";
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = "Valid email required";
    if (form.password.length < 8) errs.password = "Password must be at least 8 characters";
    if (form.password !== form.confirm_password) errs.confirm_password = "Passwords do not match";
    if (!agreed) errs.agreed = "You must agree to the terms";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await api.post("/auth/register/", form);
      toast.success("Account created! Please log in.");
      onSuccess ? onSuccess(res.data) : navigate("/login");
    } catch (err) {
      const data = err?.response?.data || {};
      const fieldErrors = {};
      Object.keys(data).forEach((k) => {
        fieldErrors[k] = Array.isArray(data[k]) ? data[k][0] : data[k];
      });
      setErrors(fieldErrors);
      if (data.detail) toast.error(data.detail);
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ name, label, type = "text", placeholder, icon, autoComplete }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ position: "relative" }}>
        {icon && (
          <i
            className={`bi ${icon}`}
            style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: "var(--text-muted)", fontSize: 14,
            }}
          />
        )}
        <input
          className={`form-input ${errors[name] ? "form-input--error" : ""}`}
          style={{ paddingLeft: icon ? 36 : undefined }}
          type={type}
          placeholder={placeholder}
          value={form[name]}
          onChange={set(name)}
          autoComplete={autoComplete}
        />
      </div>
      {errors[name] && <span className="form-error">{errors[name]}</span>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
      <div className="grid grid-2" style={{ gap: "var(--space-sm)" }}>
        <Field name="first_name" label="First Name" placeholder="John"   icon="bi-person" />
        <Field name="last_name"  label="Last Name"  placeholder="Kamau"  icon="bi-person" />
      </div>

      <Field name="email" label="Email Address" type="email"
        placeholder="you@example.com" icon="bi-envelope" autoComplete="email" />

      <Field name="phone" label="Phone (optional)" type="tel"
        placeholder="+254 712 345 678" icon="bi-phone" />

      {/* Password */}
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
            placeholder="Min 8 characters"
            value={form.password}
            onChange={set("password")}
            autoComplete="new-password"
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
        {/* Strength hint */}
        {form.password && (
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1, height: 3, borderRadius: 99,
                  background: form.password.length >= i * 2
                    ? i <= 1 ? "var(--color-danger)"
                      : i <= 2 ? "var(--color-warning)"
                      : i <= 3 ? "var(--color-info)"
                      : "var(--color-success)"
                    : "var(--bg-elevated)",
                  transition: "background 0.2s",
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Confirm Password</label>
        <div style={{ position: "relative" }}>
          <i
            className="bi bi-lock-fill"
            style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: "var(--text-muted)", fontSize: 14,
            }}
          />
          <input
            className={`form-input ${errors.confirm_password ? "form-input--error" : ""}`}
            style={{ paddingLeft: 36 }}
            type={showPass ? "text" : "password"}
            placeholder="Repeat password"
            value={form.confirm_password}
            onChange={set("confirm_password")}
            autoComplete="new-password"
          />
        </div>
        {errors.confirm_password && <span className="form-error">{errors.confirm_password}</span>}
      </div>

      {/* Terms */}
      <label style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-sm)", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          style={{ marginTop: 2, accentColor: "var(--color-primary)" }}
        />
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", lineHeight: 1.6 }}>
          I agree to the{" "}
          <Link to="/terms" style={{ color: "var(--color-primary-light)" }}>Terms of Service</Link>
          {" "}and{" "}
          <Link to="/privacy" style={{ color: "var(--color-primary-light)" }}>Privacy Policy</Link>.
          Trading involves risk. Only invest what you can afford to lose.
        </span>
      </label>
      {errors.agreed && <span className="form-error">{errors.agreed}</span>}

      <Button type="submit" variant="primary" full loading={loading} disabled={!agreed}>
        <i className="bi bi-person-plus" />
        Create Account
      </Button>

      <div className="divider" />

      <p style={{ textAlign: "center", fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>
        Already have an account?{" "}
        <Link to="/login" style={{ color: "var(--color-primary-light)", fontWeight: 600 }}>
          Sign in
        </Link>
      </p>
    </form>
  );
};

export default RegisterForm;
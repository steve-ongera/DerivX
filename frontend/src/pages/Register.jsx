
// ═══════════════════════════════════════════════════════════════
// src/pages/Register.jsx
// ═══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../utils/api";
import { useAuth } from "../App";

export default function Register() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [form, setForm] = useState({ email: "", username: "", first_name: "", last_name: "", phone_number: "", country: "KE", password: "", password_confirm: "", referral_code: "" });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [step,     setStep]     = useState(1);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await authAPI.register(form);
      login(data.user, { access: data.access, refresh: data.refresh });
      navigate("/trade", { replace: true });
    } catch (err) {
      const d = err.response?.data;
      setError(typeof d === "object" ? Object.values(d).flat().join(" ") : "Registration failed.");
      setStep(1);
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <svg width="44" height="44" viewBox="0 0 56 56" fill="none" style={{ margin: "0 auto 12px" }}>
            <rect width="56" height="56" rx="10" fill="#6366f1" />
            <path d="M12 40 L20 20 L28 32 L36 18 L44 40" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Create your account</h1>
          <p className="text-muted text-sm">Start trading in under 2 minutes</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-sm" style={{ marginBottom: 20, justifyContent: "center" }}>
          {[1, 2].map((s) => (
            <React.Fragment key={s}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: step >= s ? "var(--color-primary)" : "var(--bg-elevated)",
                color: step >= s ? "#fff" : "var(--text-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 12,
              }}>{s}</div>
              {s < 2 && <div style={{ flex: 1, height: 2, background: step > s ? "var(--color-primary)" : "var(--border-color)", maxWidth: 60 }} />}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-md">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className="form-input" placeholder="John" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" placeholder="Doe" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input className="form-input" placeholder="trader123" value={form.username} onChange={(e) => set("username", e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" placeholder="254712345678" value={form.phone_number} onChange={(e) => set("phone_number", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <input className="form-input" placeholder="KE" value={form.country} onChange={(e) => set("country", e.target.value)} />
              </div>
            </div>
            <button className="btn btn--primary btn--full" onClick={() => { if (!form.email || !form.username) { setError("Email and username required."); return; } setError(""); setStep(2); }}>
              Continue <i className="bi bi-arrow-right" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-md">
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input className="form-input" type="password" placeholder="Min 8 characters" value={form.password} onChange={(e) => set("password", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input className="form-input" type="password" placeholder="Repeat password" value={form.password_confirm} onChange={(e) => set("password_confirm", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Referral Code (optional)</label>
              <input className="form-input" placeholder="Enter referral code" value={form.referral_code} onChange={(e) => set("referral_code", e.target.value)} />
            </div>
            <p className="text-xs text-muted" style={{ lineHeight: 1.6 }}>
              By creating an account you agree to our Terms of Service. Your demo account starts with $10,000 virtual balance.
            </p>
            <div className="flex gap-sm">
              <button className="btn btn--outline" onClick={() => setStep(1)}><i className="bi bi-arrow-left" /> Back</button>
              <button className="btn btn--success btn--full" onClick={handleSubmit} disabled={loading}>
                {loading ? <><i className="bi bi-arrow-repeat spin" /> Creating…</> : <><i className="bi bi-check-lg" /> Create Account</>}
              </button>
            </div>
          </div>
        )}

        {error && <div className="badge badge--danger w-full mt-md" style={{ padding: "8px 12px", justifyContent: "flex-start" }}><i className="bi bi-exclamation-circle" /> {error}</div>}

        <p className="text-center text-muted text-sm mt-lg">
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--color-primary-light)", fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}



// ═══════════════════════════════════════════════════════════════
// src/pages/Profile.jsx
// ═══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import { profileAPI, authAPI } from "../utils/api";
import { useAuth } from "../App";

export default function Profile() {
  const { user, dispatch } = useAuth();
  const [form,    setForm]    = useState({ first_name: user?.first_name || "", last_name: user?.last_name || "", phone_number: user?.phone_number || "", country: user?.country || "" });
  const [pwForm,  setPwForm]  = useState({ old_password: "", new_password: "", new_password_confirm: "" });
  const [saving,  setSaving]  = useState(false);
  const [savingPw,setSavingPw]= useState(false);
  const [msg,     setMsg]     = useState("");
  const [pwMsg,   setPwMsg]   = useState("");

  const saveProfile = async () => {
    setSaving(true); setMsg("");
    try {
      const { data } = await profileAPI.update(form);
      dispatch({ type: "LOGIN", user: data });
      setMsg("Profile updated successfully.");
    } catch { setMsg("Update failed."); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    setSavingPw(true); setPwMsg("");
    try {
      await authAPI.changePassword(pwForm);
      setPwMsg("Password changed successfully.");
      setPwForm({ old_password: "", new_password: "", new_password_confirm: "" });
    } catch (err) {
      const d = err.response?.data;
      setPwMsg(typeof d === "object" ? Object.values(d).flat().join(" ") : "Failed to change password.");
    } finally { setSavingPw(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar />
        <main className="main-content" style={{ flex: 1, maxWidth: 640 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
            <i className="bi bi-person-circle" style={{ color: "var(--color-primary)" }} /> Profile
          </h1>

          {/* Avatar */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card__header"><span className="card__title">Account Info</span></div>
            <div className="flex items-center gap-lg" style={{ marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase()}
              </div>
              <div>
                <div className="font-bold" style={{ fontSize: 16 }}>{user?.first_name} {user?.last_name}</div>
                <div className="text-muted text-sm">{user?.email}</div>
                <div className="flex gap-sm" style={{ marginTop: 6 }}>
                  <span className={`badge ${user?.is_email_verified ? "badge--success" : "badge--warning"}`}>
                    <i className={`bi bi-${user?.is_email_verified ? "check" : "exclamation"}-circle`} /> Email
                  </span>
                  <span className="badge badge--muted">Referral: {user?.referral_code}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { label: "First Name",    key: "first_name"    },
                { label: "Last Name",     key: "last_name"     },
                { label: "Phone Number",  key: "phone_number"  },
                { label: "Country",       key: "country"       },
              ].map((f) => (
                <div key={f.key} className="form-group">
                  <label className="form-label">{f.label}</label>
                  <input className="form-input" value={form[f.key]} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            {msg && <div className={`badge ${msg.includes("success") ? "badge--success" : "badge--danger"} mt-md`} style={{ padding: "8px 12px" }}>{msg}</div>}
            <button className="btn btn--primary mt-md" onClick={saveProfile} disabled={saving}>
              {saving ? <><i className="bi bi-arrow-repeat spin" /> Saving…</> : <><i className="bi bi-check" /> Save Changes</>}
            </button>
          </div>

          {/* Change password */}
          <div className="card">
            <div className="card__header"><span className="card__title"><i className="bi bi-lock" /> Change Password</span></div>
            <div className="flex flex-col gap-md">
              {[
                { label: "Current Password",  key: "old_password"         },
                { label: "New Password",       key: "new_password"         },
                { label: "Confirm Password",   key: "new_password_confirm" },
              ].map((f) => (
                <div key={f.key} className="form-group">
                  <label className="form-label">{f.label}</label>
                  <input className="form-input" type="password" value={pwForm[f.key]} onChange={(e) => setPwForm((p) => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            {pwMsg && <div className={`badge ${pwMsg.includes("success") ? "badge--success" : "badge--danger"} mt-md`} style={{ padding: "8px 12px" }}>{pwMsg}</div>}
            <button className="btn btn--outline mt-md" onClick={changePassword} disabled={savingPw}>
              {savingPw ? <><i className="bi bi-arrow-repeat spin" /> Updating…</> : <><i className="bi bi-lock" /> Update Password</>}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}


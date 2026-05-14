// src/components/robot/RobotBuilder.jsx
import React, { useState, useEffect } from "react";
import { robotsAPI, marketsAPI, tradeTypesAPI } from "../../utils/api";

const STRATEGIES = [
  { value: "flat_bet",      label: "Flat Bet",       icon: "bi-dash-lg",        desc: "Same stake every trade. Safe and predictable." },
  { value: "martingale",    label: "Martingale",     icon: "bi-arrow-up-right", desc: "Double stake on every loss. High risk, high reward." },
  { value: "anti_martingale", label: "Anti-Martingale", icon: "bi-arrow-down-left", desc: "Double on wins, reset on loss. Ride the winning streak." },
  { value: "dalembert",    label: "D'Alembert",     icon: "bi-plus-slash-minus", desc: "Increase by 1 unit on loss, decrease on win." },
  { value: "fibonacci",     label: "Fibonacci",      icon: "bi-infinity",        desc: "Follow the Fibonacci sequence on consecutive losses." },
];

const DURATION_UNITS = [
  { value: "t", label: "Ticks" },
  { value: "s", label: "Seconds" },
  { value: "m", label: "Minutes" },
];

export default function RobotBuilder({ existing = null, onSave, onCancel }) {
  const [markets,    setMarkets]    = useState([]);
  const [tradeTypes, setTradeTypes] = useState([]);
  const [step,       setStep]       = useState(1); // 1=basics, 2=strategy, 3=risk

  const [form, setForm] = useState({
    name:                  existing?.name                  || "",
    description:           existing?.description           || "",
    market_slug:           existing?.market?.slug          || "",
    trade_type_slug:       existing?.trade_type?.slug      || "",
    account_type:          existing?.account_type          || "demo",
    strategy:              existing?.strategy              || "flat_bet",
    initial_stake:         existing?.initial_stake         || "1.00",
    max_stake:             existing?.max_stake             || "100.00",
    stake_multiplier:      existing?.stake_multiplier      || "2.00",
    stake_step:            existing?.stake_step            || "1.00",
    duration:              existing?.duration              || 5,
    duration_unit:         existing?.duration_unit         || "t",
    take_profit:           existing?.take_profit           || "",
    stop_loss:             existing?.stop_loss             || "",
    max_trades:            existing?.max_trades            || "",
    max_consecutive_losses: existing?.max_consecutive_losses || "",
    is_public:             existing?.is_public             || false,
  });

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  useEffect(() => {
    marketsAPI.getAll({ page_size: 100 }).then((r) => setMarkets(r.data.results || r.data));
  }, []);

  useEffect(() => {
    if (!form.market_slug) return;
    tradeTypesAPI.getAll({ market: form.market_slug }).then((r) => {
      const types = r.data.results || r.data;
      setTradeTypes(types.filter((t) => t.supports_robots));
    });
  }, [form.market_slug]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name || !form.market_slug || !form.trade_type_slug) {
      setError("Name, market and trade type are required.");
      return;
    }
    setError(""); setSaving(true);
    try {
      const payload = {
        ...form,
        initial_stake:          parseFloat(form.initial_stake),
        max_stake:               parseFloat(form.max_stake),
        stake_multiplier:        parseFloat(form.stake_multiplier),
        stake_step:              parseFloat(form.stake_step),
        duration:                parseInt(form.duration),
        take_profit:             form.take_profit  ? parseFloat(form.take_profit)  : null,
        stop_loss:               form.stop_loss    ? parseFloat(form.stop_loss)    : null,
        max_trades:              form.max_trades   ? parseInt(form.max_trades)     : null,
        max_consecutive_losses:  form.max_consecutive_losses ? parseInt(form.max_consecutive_losses) : null,
      };
      const res = existing
        ? await robotsAPI.update(existing.id, payload)
        : await robotsAPI.create(payload);
      onSave?.(res.data);
    } catch (err) {
      const d = err.response?.data;
      setError(typeof d === "object" ? Object.values(d).flat().join(" ") : "Failed to save robot.");
    } finally {
      setSaving(false);
    }
  };

  const selectedStrategy = STRATEGIES.find((s) => s.value === form.strategy);

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <div className="card__header">
        <span className="card__title">
          <i className="bi bi-robot" style={{ color: "var(--color-primary)" }} />
          {" "}{existing ? "Edit Robot" : "Build New Robot"}
        </span>
        {/* Step indicator */}
        <div className="flex items-center gap-sm">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              style={{
                width: 28, height: 28, borderRadius: "50%",
                border: `2px solid ${step === s ? "var(--color-primary)" : step > s ? "var(--color-success)" : "var(--border-color)"}`,
                background: step === s ? "var(--color-primary)" : step > s ? "var(--color-success)" : "transparent",
                color: step >= s ? "#fff" : "var(--text-muted)",
                fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}
            >
              {step > s ? <i className="bi bi-check" /> : s}
            </button>
          ))}
        </div>
      </div>

      {/* ── STEP 1: Basics ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-md">
          <div className="form-group">
            <label className="form-label">Robot Name *</label>
            <input className="form-input" placeholder="My Trading Bot" value={form.name}
              onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} placeholder="What does this robot do?"
              value={form.description} onChange={(e) => set("description", e.target.value)}
              style={{ resize: "vertical" }} />
          </div>
          <div className="flex gap-md">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Market *</label>
              <select className="form-select" value={form.market_slug}
                onChange={(e) => { set("market_slug", e.target.value); set("trade_type_slug", ""); }}>
                <option value="">Select market…</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.slug}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Trade Type *</label>
              <select className="form-select" value={form.trade_type_slug}
                onChange={(e) => set("trade_type_slug", e.target.value)}
                disabled={!form.market_slug}>
                <option value="">Select type…</option>
                {tradeTypes.map((t) => (
                  <option key={t.slug} value={t.slug}>{t.display_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-md">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Duration</label>
              <input className="form-input" type="number" min="1" value={form.duration}
                onChange={(e) => set("duration", e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Unit</label>
              <select className="form-select" value={form.duration_unit}
                onChange={(e) => set("duration_unit", e.target.value)}>
                {DURATION_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["demo", "real"].map((acc) => (
              <button key={acc} onClick={() => set("account_type", acc)}
                className={`btn ${form.account_type === acc ? "btn--primary" : "btn--outline"} btn--sm`}
                style={{ flex: 1 }}>
                {acc === "demo" ? <><i className="bi bi-mortarboard" /> Demo</> : <><i className="bi bi-currency-dollar" /> Real</>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 2: Strategy ───────────────────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col gap-md">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {STRATEGIES.map((s) => (
              <div
                key={s.value}
                onClick={() => set("strategy", s.value)}
                style={{
                  padding: 14, borderRadius: "var(--radius-md)", cursor: "pointer",
                  border: `2px solid ${form.strategy === s.value ? "var(--color-primary)" : "var(--border-color)"}`,
                  background: form.strategy === s.value ? "rgba(99,102,241,0.1)" : "var(--bg-base)",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div className="flex items-center gap-sm" style={{ marginBottom: 6 }}>
                  <i className={s.icon} style={{ color: form.strategy === s.value ? "var(--color-primary-light)" : "var(--text-muted)", fontSize: 18 }} />
                  <span className="font-bold" style={{ fontSize: 13, color: form.strategy === s.value ? "var(--text-primary)" : "var(--text-secondary)" }}>{s.label}</span>
                </div>
                <p className="text-xs text-muted">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Strategy-specific settings */}
          <div style={{ background: "var(--bg-base)", borderRadius: "var(--radius-md)", padding: "var(--space-md)" }}>
            <div className="text-xs text-muted" style={{ marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {selectedStrategy?.label} Settings
            </div>
            <div className="flex gap-md">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Initial Stake (USD)</label>
                <input className="form-input" type="number" min="0.35" step="0.01"
                  value={form.initial_stake} onChange={(e) => set("initial_stake", e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Max Stake (USD)</label>
                <input className="form-input" type="number" min="1" step="1"
                  value={form.max_stake} onChange={(e) => set("max_stake", e.target.value)} />
              </div>
            </div>
            {["martingale", "anti_martingale"].includes(form.strategy) && (
              <div className="form-group mt-md">
                <label className="form-label">Multiplier</label>
                <input className="form-input" type="number" min="1.1" max="10" step="0.1"
                  value={form.stake_multiplier} onChange={(e) => set("stake_multiplier", e.target.value)} />
              </div>
            )}
            {form.strategy === "dalembert" && (
              <div className="form-group mt-md">
                <label className="form-label">Step Amount (USD)</label>
                <input className="form-input" type="number" min="0.01" step="0.01"
                  value={form.stake_step} onChange={(e) => set("stake_step", e.target.value)} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 3: Risk Management ─────────────────────────────── */}
      {step === 3 && (
        <div className="flex flex-col gap-md">
          <p className="text-muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
            Set limits to automatically stop the robot when targets are hit.
            Leave blank to run indefinitely.
          </p>
          <div className="flex gap-md">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Take Profit (USD)</label>
              <input className="form-input" type="number" placeholder="e.g. 50" min="0" step="0.01"
                value={form.take_profit} onChange={(e) => set("take_profit", e.target.value)} />
              <span className="form-error" style={{ color: "var(--color-success)" }}>Stop when profit ≥ this amount</span>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Stop Loss (USD)</label>
              <input className="form-input" type="number" placeholder="e.g. 20" min="0" step="0.01"
                value={form.stop_loss} onChange={(e) => set("stop_loss", e.target.value)} />
              <span className="form-error">Stop when loss ≥ this amount</span>
            </div>
          </div>
          <div className="flex gap-md">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Max Trades per Session</label>
              <input className="form-input" type="number" placeholder="e.g. 100" min="1"
                value={form.max_trades} onChange={(e) => set("max_trades", e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Max Consecutive Losses</label>
              <input className="form-input" type="number" placeholder="e.g. 5" min="1"
                value={form.max_consecutive_losses} onChange={(e) => set("max_consecutive_losses", e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-sm" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={form.is_public} onChange={(e) => set("is_public", e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "var(--color-primary)" }} />
            <span className="text-sm">Share this robot in the community marketplace</span>
          </label>
        </div>
      )}

      {error && <div className="badge badge--danger w-full mt-md" style={{ padding: "8px 12px", justifyContent: "flex-start" }}><i className="bi bi-exclamation-circle" /> {error}</div>}

      {/* Navigation */}
      <div className="flex justify-between gap-sm mt-lg">
        <button className="btn btn--outline" onClick={step > 1 ? () => setStep(step - 1) : onCancel}>
          <i className={`bi bi-${step > 1 ? "arrow-left" : "x"}`} />
          {step > 1 ? "Back" : "Cancel"}
        </button>
        {step < 3 ? (
          <button className="btn btn--primary" onClick={() => setStep(step + 1)}>
            Next <i className="bi bi-arrow-right" />
          </button>
        ) : (
          <button className="btn btn--success" onClick={handleSave} disabled={saving}>
            {saving ? <><i className="bi bi-arrow-repeat spin" /> Saving…</> : <><i className="bi bi-check-lg" /> Save Robot</>}
          </button>
        )}
      </div>
    </div>
  );
}


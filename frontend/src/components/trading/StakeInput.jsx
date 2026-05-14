
// ─────────────────────────────────────────────────────────────────────────────
// src/components/trading/StakeInput.jsx
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo } from "react";

const QUICK_STAKES = [0.35, 1, 5, 10, 25, 50, 100, 250, 500];

export function StakeInput({
  stake,
  onChange,
  payoutPct    = 85,
  minStake     = 0.35,
  maxStake     = 50000,
  balance      = 0,
  accountType  = "demo",
}) {
  const stakeNum  = parseFloat(stake) || 0;
  const payout    = useMemo(() => ((stakeNum * payoutPct) / 100 + stakeNum).toFixed(2), [stakeNum, payoutPct]);
  const profit    = useMemo(() => ((stakeNum * payoutPct) / 100).toFixed(2), [stakeNum, payoutPct]);
  const isOverBalance = stakeNum > parseFloat(balance);
  const isUnderMin    = stakeNum > 0 && stakeNum < minStake;
  const isOverMax     = stakeNum > maxStake;
  const hasError      = isOverBalance || isUnderMin || isOverMax;

  const handleChange = (val) => {
    const clean = val.replace(/[^0-9.]/g, "");
    onChange(clean);
  };

  const adjust = (delta) => {
    const next = Math.max(minStake, Math.min(maxStake, parseFloat((stakeNum + delta).toFixed(2))));
    onChange(String(next));
  };

  const quickBtns = QUICK_STAKES.filter((s) => s >= minStake && s <= maxStake).slice(0, 6);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span className="text-xs text-muted">Stake (USD)</span>
        <span className="text-xs" style={{ color: isOverBalance ? "var(--color-danger)" : "var(--text-muted)" }}>
          {accountType === "demo" ? "Demo" : "Real"} balance: <strong>${parseFloat(balance).toFixed(2)}</strong>
        </span>
      </div>

      {/* Main input row */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 6 }}>
        <button className="btn btn--ghost" onClick={() => adjust(-1)} style={{ padding: "0 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
          <i className="bi bi-dash-lg" />
        </button>

        <div style={{ flex: 1, position: "relative" }}>
          <span style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: "var(--text-muted)", fontSize: 16, fontWeight: 700, pointerEvents: "none",
          }}>$</span>
          <input
            type="number"
            className={`form-input text-mono ${hasError ? "form-input--error" : ""}`}
            value={stake}
            min={minStake}
            max={maxStake}
            step="0.01"
            onChange={(e) => handleChange(e.target.value)}
            style={{
              textAlign:  "center",
              fontSize:   22,
              fontWeight: 800,
              padding:    "12px 12px 12px 28px",
              letterSpacing: -0.5,
            }}
          />
        </div>

        <button className="btn btn--ghost" onClick={() => adjust(1)} style={{ padding: "0 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
          <i className="bi bi-plus-lg" />
        </button>
      </div>

      {/* Validation messages */}
      {isUnderMin    && <div className="form-error" style={{ marginTop: 4 }}>Minimum stake is ${minStake}</div>}
      {isOverMax     && <div className="form-error" style={{ marginTop: 4 }}>Maximum stake is ${maxStake}</div>}
      {isOverBalance && <div className="form-error" style={{ marginTop: 4 }}>Insufficient balance</div>}

      {/* Quick stake buttons */}
      <div style={{ display: "flex", gap: 4, marginTop: 10, flexWrap: "wrap" }}>
        {quickBtns.map((s) => (
          <button
            key={s}
            onClick={() => onChange(String(s))}
            className="btn btn--ghost btn--sm"
            style={{
              flex:        1,
              minWidth:    44,
              border:      `1px solid ${stakeNum === s ? "var(--color-primary)" : "var(--border-color)"}`,
              color:       stakeNum === s ? "var(--color-primary-light)" : "var(--text-muted)",
              background:  stakeNum === s ? "rgba(99,102,241,0.1)" : "transparent",
            }}
          >
            ${s}
          </button>
        ))}
        <button
          onClick={() => onChange(String(parseFloat(balance).toFixed(2)))}
          className="btn btn--ghost btn--sm"
          style={{ flex: 1, minWidth: 44, fontSize: 10 }}
          title="Use full balance"
        >
          Max
        </button>
      </div>

      {/* Payout breakdown */}
      <div style={{
        marginTop: 12,
        padding:   "10px 14px",
        background:"var(--bg-base)",
        borderRadius: "var(--radius-md)",
        border:    "1px solid var(--border-color)",
        display:   "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <div className="text-xs text-muted">Stake</div>
          <div className="text-mono font-bold" style={{ fontSize: 14 }}>${stakeNum.toFixed(2)}</div>
        </div>
        <div style={{ color: "var(--text-muted)" }}>
          <i className="bi bi-arrow-right" />
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="text-xs text-muted">Profit ({payoutPct}%)</div>
          <div className="text-mono font-bold text-success" style={{ fontSize: 14 }}>+${profit}</div>
        </div>
        <div style={{ color: "var(--text-muted)" }}>
          <i className="bi bi-equals" />
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="text-xs text-muted">Payout</div>
          <div className="text-mono font-bold" style={{ fontSize: 14, color: "var(--color-accent)" }}>${payout}</div>
        </div>
      </div>
    </div>
  );
}
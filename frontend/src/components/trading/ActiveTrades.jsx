// src/components/trading/ActiveTrades.jsx
import React, { useState } from "react";

export default function ActiveTrades({ trades = [], onTradeClick }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!trades.length) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "var(--space-xl)" }}>
        <i className="bi bi-inbox" style={{ fontSize: 36, color: "var(--text-muted)", display: "block", marginBottom: 10 }} />
        <p className="font-bold" style={{ marginBottom: 4 }}>No open trades</p>
        <p className="text-muted text-sm">Your active trades will appear here</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">
          <i className="bi bi-activity" style={{ color: "var(--color-primary)" }} /> Active Trades
        </span>
        <div className="flex items-center gap-sm">
          <span className="badge badge--primary">{trades.length}</span>
          <span className="live-dot" />
        </div>
      </div>

      {/* Desktop table */}
      <div className="table-wrapper" style={{ display: "none" }} id="active-trades-table">
        <table className="table">
          <thead>
            <tr>
              <th>Contract</th>
              <th>Market</th>
              <th>Type</th>
              <th>Stake</th>
              <th>Payout</th>
              <th>Entry</th>
              <th>Account</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id} onClick={() => onTradeClick?.(t)} style={{ cursor: "pointer" }}>
                <td>
                  <span className="text-mono text-xs" style={{ color: "var(--color-accent)" }}>
                    {t.contract_id}
                  </span>
                </td>
                <td className="font-bold" style={{ color: "var(--text-primary)" }}>{t.market_name}</td>
                <td>
                  <span className={`badge ${
                    t.trade_type_name?.toLowerCase().includes("rise") || t.trade_type_name?.toLowerCase().includes("higher") ? "badge--success" :
                    t.trade_type_name?.toLowerCase().includes("fall") || t.trade_type_name?.toLowerCase().includes("lower")  ? "badge--danger"  :
                    t.trade_type_name?.toLowerCase().includes("even") ? "badge--info"    :
                    t.trade_type_name?.toLowerCase().includes("odd")  ? "badge--warning" :
                    "badge--primary"
                  }`}>
                    {t.trade_type_name}
                  </span>
                </td>
                <td className="text-mono">${parseFloat(t.stake).toFixed(2)}</td>
                <td className="text-mono text-success">${parseFloat(t.payout).toFixed(2)}</td>
                <td className="text-mono text-xs">
                  {t.entry_price ? parseFloat(t.entry_price).toFixed(5) : "—"}
                </td>
                <td>
                  <span className={`badge ${t.account_type === "demo" ? "badge--muted" : "badge--success"}`}>
                    {t.account_type}
                  </span>
                </td>
                <td className="text-xs text-muted">
                  {t.expiry_time ? new Date(t.expiry_time).toLocaleTimeString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card stack */}
      <div className="flex flex-col gap-sm" style={{ marginTop: 4 }}>
        {trades.map((t) => {
          const isExpanded = expandedId === t.id;
          const typeColor =
            t.trade_type_name?.toLowerCase().includes("rise")   ? "var(--color-rise)"  :
            t.trade_type_name?.toLowerCase().includes("fall")   ? "var(--color-fall)"  :
            t.trade_type_name?.toLowerCase().includes("even")   ? "var(--color-even)"  :
            t.trade_type_name?.toLowerCase().includes("odd")    ? "var(--color-odd)"   :
            "var(--color-primary)";

          return (
            <div
              key={t.id}
              style={{
                padding:      "12px var(--space-md)",
                background:   "var(--bg-base)",
                borderRadius: "var(--radius-md)",
                border:       `1px solid var(--border-color)`,
                borderLeft:   `4px solid ${typeColor}`,
                cursor:       "pointer",
                transition:   "background var(--transition-fast)",
              }}
              onClick={() => setExpandedId(isExpanded ? null : t.id)}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-elevated)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-base)"}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold" style={{ fontSize: 13, color: "var(--text-primary)" }}>
                    {t.market_name}
                  </div>
                  <div className="text-xs" style={{ color: typeColor, fontWeight: 700, marginTop: 2 }}>
                    {t.trade_type_name} · {t.account_type}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="text-mono font-bold" style={{ fontSize: 14 }}>
                    ${parseFloat(t.stake).toFixed(2)}
                  </div>
                  <div className="text-xs text-success">→ ${parseFloat(t.payout).toFixed(2)}</div>
                </div>
              </div>

              {isExpanded && (
                <div style={{
                  marginTop: 10, paddingTop: 10,
                  borderTop: "1px solid var(--border-color)",
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8, fontSize: 12,
                }}>
                  {[
                    { label: "Contract",  value: t.contract_id,       mono: true  },
                    { label: "Entry",     value: t.entry_price ? parseFloat(t.entry_price).toFixed(5) : "—", mono: true },
                    { label: "Expires",   value: t.expiry_time ? new Date(t.expiry_time).toLocaleTimeString() : "—" },
                    { label: "Duration",  value: `${t.duration} ${t.duration_unit}` },
                    { label: "Payout %",  value: `${parseFloat(t.payout_pct || 85).toFixed(0)}%` },
                  ].map((info) => (
                    <div key={info.label}>
                      <div className="text-xs text-muted">{info.label}</div>
                      <div className={`font-bold ${info.mono ? "text-mono" : ""}`} style={{ fontSize: 11, marginTop: 2 }}>
                        {info.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
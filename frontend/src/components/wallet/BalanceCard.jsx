// src/components/wallet/BalanceCard.jsx
import React from "react";
import Button from "../common/Button";

const BalanceCard = ({ wallet, onDeposit, onWithdraw, loading }) => {
  const balance = wallet?.balance ?? "0.00";
  const currency = wallet?.currency ?? "USD";
  const demoBalance = wallet?.demo_balance ?? "10,000.00";

  return (
    <div className="card" style={{ background: "linear-gradient(135deg, var(--bg-surface) 0%, rgba(99,102,241,0.08) 100%)" }}>
      <div className="flex items-center justify-between mb-md">
        <span className="stat-card__label">
          <i className="bi bi-wallet2" style={{ marginRight: 6 }} />
          Live Balance
        </span>
        <span className="badge badge--success">
          <span className="live-dot" style={{ marginRight: 4 }} />
          Active
        </span>
      </div>

      <div style={{ marginBottom: "var(--space-lg)" }}>
        <div className="stat-card__value text-success" style={{ fontSize: "var(--font-size-2xl)" }}>
          {currency} {parseFloat(balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </div>
        <div className="text-muted text-xs" style={{ marginTop: 4 }}>
          Demo: {currency} {parseFloat(demoBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </div>
      </div>

      <div className="flex gap-sm">
        <Button variant="success" full onClick={onDeposit} loading={loading}>
          <i className="bi bi-plus-circle" />
          Deposit
        </Button>
        <Button variant="outline" full onClick={onWithdraw}>
          <i className="bi bi-arrow-up-circle" />
          Withdraw
        </Button>
      </div>

      <div className="divider" />

      <div className="grid grid-3" style={{ gap: "var(--space-sm)" }}>
        {[
          { label: "Today P&L", value: wallet?.today_pnl ?? "+$0.00", color: "text-success" },
          { label: "Open Trades", value: wallet?.open_trades ?? 0, color: "text-primary" },
          { label: "Win Rate", value: wallet?.win_rate ? `${wallet.win_rate}%` : "N/A", color: "text-accent" },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div className={`font-bold text-sm ${s.color}`}>{s.value}</div>
            <div className="text-muted text-xs">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BalanceCard;
// ═══════════════════════════════════════════════════════════════
// src/pages/Wallet.jsx
// ═══════════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import DepositModal from "../components/wallet/DepositModal";
import WithdrawModal from "../components/wallet/WithdrawModal";
import { walletAPI } from "../utils/api";
import { useAuth } from "../App";

const TX_TYPE_BADGES = {
  deposit:      "badge--success",
  withdrawal:   "badge--warning",
  trade_open:   "badge--primary",
  trade_win:    "badge--success",
  trade_loss:   "badge--danger",
  bonus:        "badge--info",
  referral:     "badge--info",
};

export default function Wallet() {
  const { wallets } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [showDeposit,  setShowDeposit]  = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [txFilter,     setTxFilter]     = useState("");
  const [loading,      setLoading]      = useState(true);

  const loadTx = () => {
    setLoading(true);
    const params = { page_size: 30 };
    if (txFilter) params.type = txFilter;
    walletAPI.getTransactions(params).then((r) => setTransactions(r.data.results || r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { loadTx(); }, [txFilter]);

  const totalBalance = wallets.reduce((acc, w) => {
    if (w.currency === "USD") return acc + parseFloat(w.balance || 0);
    return acc;
  }, 0);

  const totalDeposited = transactions
    .filter((t) => t.transaction_type === "deposit" && t.status === "completed")
    .reduce((a, t) => a + parseFloat(t.amount || 0), 0);

  const totalWithdrawn = transactions
    .filter((t) => t.transaction_type === "withdrawal" && t.status === "completed")
    .reduce((a, t) => a + parseFloat(t.amount || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      {showDeposit  && <DepositModal  onClose={() => setShowDeposit(false)}  onSuccess={loadTx} wallets={wallets} />}
      {showWithdraw && <WithdrawModal onClose={() => setShowWithdraw(false)} onSuccess={loadTx} wallets={wallets} />}
      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar />
        <main className="main-content" style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
            <i className="bi bi-wallet2" style={{ color: "var(--color-primary)" }} /> Wallet
          </h1>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 16, marginBottom: 28 }}>
            <div className="stat-card">
              <div className="stat-card__icon" style={{ background: "rgba(99,102,241,0.15)", color: "var(--color-primary)" }}>
                <i className="bi bi-wallet2" />
              </div>
              <span className="stat-card__label">Total Balance (USD)</span>
              <span className="stat-card__value" style={{ color: "var(--color-success)" }}>${totalBalance.toFixed(2)}</span>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon" style={{ background: "rgba(34,197,94,0.15)", color: "var(--color-success)" }}>
                <i className="bi bi-arrow-down-circle" />
              </div>
              <span className="stat-card__label">Total Deposited</span>
              <span className="stat-card__value">${totalDeposited.toFixed(2)}</span>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon" style={{ background: "rgba(245,158,11,0.15)", color: "var(--color-warning)" }}>
                <i className="bi bi-arrow-up-circle" />
              </div>
              <span className="stat-card__label">Total Withdrawn</span>
              <span className="stat-card__value">${totalWithdrawn.toFixed(2)}</span>
            </div>
          </div>

          {/* Per-currency wallet cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12, marginBottom: 28 }}>
            {wallets.map((w) => (
              <div key={w.id} className="card" style={{ borderColor: "var(--border-color-light)" }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                  <span className="font-bold" style={{ fontSize: 15 }}>{w.currency}</span>
                  <span className="badge badge--muted">{w.currency}</span>
                </div>
                <div className="text-xs text-muted">Real</div>
                <div className="text-mono font-bold" style={{ fontSize: 20, color: "var(--color-success)", marginBottom: 4 }}>
                  {parseFloat(w.balance).toFixed(w.currency === "BTC" ? 8 : 2)}
                </div>
                <div className="text-xs text-muted">Demo</div>
                <div className="text-mono" style={{ fontSize: 14, color: "var(--color-accent)" }}>
                  {parseFloat(w.demo_balance).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-sm" style={{ marginBottom: 24 }}>
            <button className="btn btn--success" onClick={() => setShowDeposit(true)}>
              <i className="bi bi-arrow-down-circle-fill" /> Deposit
            </button>
            <button className="btn btn--outline" onClick={() => setShowWithdraw(true)}>
              <i className="bi bi-arrow-up-circle" /> Withdraw
            </button>
          </div>

          {/* Transactions */}
          <div className="card">
            <div className="card__header">
              <span className="card__title">Transaction History</span>
              <select className="form-select" value={txFilter} onChange={(e) => setTxFilter(e.target.value)} style={{ width: 180, padding: "6px 10px", fontSize: 13 }}>
                <option value="">All types</option>
                <option value="deposit">Deposits</option>
                <option value="withdrawal">Withdrawals</option>
                <option value="trade_win">Trade Wins</option>
                <option value="trade_loss">Trade Losses</option>
              </select>
            </div>
            {loading ? (
              <div className="text-center text-muted" style={{ padding: "var(--space-xl)" }}>
                <i className="bi bi-arrow-repeat spin" style={{ fontSize: 24 }} />
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>Date</th><th>Type</th><th>Method</th><th>Amount</th><th>Balance After</th><th>Status</th><th>Reference</th></tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--text-muted)" }}>No transactions yet</td></tr>
                    )}
                    {transactions.map((t) => (
                      <tr key={t.id}>
                        <td className="text-xs text-muted">{new Date(t.created_at).toLocaleString()}</td>
                        <td><span className={`badge ${TX_TYPE_BADGES[t.transaction_type] || "badge--muted"}`}>{t.transaction_type.replace(/_/g, " ")}</span></td>
                        <td className="text-xs">{t.payment_method}</td>
                        <td className={`text-mono font-bold ${["deposit","trade_win","bonus"].includes(t.transaction_type) ? "text-success" : "text-danger"}`}>
                          {["deposit","trade_win","bonus"].includes(t.transaction_type) ? "+" : "-"}${parseFloat(t.amount).toFixed(2)} {t.currency}
                        </td>
                        <td className="text-mono text-sm">${parseFloat(t.balance_after).toFixed(2)}</td>
                        <td><span className={`badge ${t.status === "completed" ? "badge--success" : t.status === "pending" ? "badge--warning" : "badge--danger"}`}>{t.status}</span></td>
                        <td><span className="text-mono text-xs text-muted">{t.reference}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
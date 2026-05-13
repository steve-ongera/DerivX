// ═══════════════════════════════════════════════════════════════
// src/pages/Robot.jsx  — Robot trading management page
// ═══════════════════════════════════════════════════════════════
import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import RobotBuilder, { RobotCard } from "../components/robot/RobotBuilder";
import { robotsAPI } from "../utils/api";
import { wsManager } from "../utils/websocket";

export default function Robot() {
  const [robots,       setRobots]       = useState([]);
  const [showBuilder,  setShowBuilder]  = useState(false);
  const [editingRobot, setEditingRobot] = useState(null);
  const [logsRobot,    setLogsRobot]    = useState(null);
  const [logs,         setLogs]         = useState([]);
  const [activeTab,    setActiveTab]    = useState("my"); // my | community
  const [community,    setCommunity]    = useState([]);
  const [loading,      setLoading]      = useState(true);

  const loadRobots = useCallback(() => {
    setLoading(true);
    robotsAPI.getAll().then((r) => setRobots(r.data.results || r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadRobots(); }, [loadRobots]);

  useEffect(() => {
    if (activeTab === "community") {
      robotsAPI.community().then((r) => setCommunity(r.data.results || r.data));
    }
  }, [activeTab]);

  // Live log streaming
  useEffect(() => {
    if (!logsRobot) return;
    const key = wsManager.connectRobot(logsRobot.id);
    const unsub = wsManager.on(key, "robot_log", (msg) => {
      setLogs((prev) => [msg.log, ...prev.slice(0, 99)]);
    });
    const unsubStatus = wsManager.on(key, "robot_status", (msg) => {
      setRobots((prev) => prev.map((r) =>
        r.id === logsRobot.id ? { ...r, status: msg.status, session_profit: msg.session_profit } : r
      ));
    });
    // Load recent logs
    robotsAPI.getLogs(logsRobot.id).then((r) => setLogs(r.data.results || r.data));
    return () => { unsub(); unsubStatus(); wsManager.disconnect(key); };
  }, [logsRobot]);

  const handleStart = async (robot) => {
    await robotsAPI.start(robot.id);
    setRobots((prev) => prev.map((r) => r.id === robot.id ? { ...r, status: "active" } : r));
  };

  const handleStop = async (robot) => {
    await robotsAPI.stop(robot.id);
    setRobots((prev) => prev.map((r) => r.id === robot.id ? { ...r, status: "stopped" } : r));
  };

  const handleDelete = async (robot) => {
    if (!confirm(`Delete robot "${robot.name}"?`)) return;
    await robotsAPI.delete(robot.id);
    setRobots((prev) => prev.filter((r) => r.id !== robot.id));
  };

  const handleSave = (saved) => {
    if (editingRobot) {
      setRobots((prev) => prev.map((r) => r.id === saved.id ? saved : r));
    } else {
      setRobots((prev) => [saved, ...prev]);
    }
    setShowBuilder(false);
    setEditingRobot(null);
  };

  const LOG_COLORS = { success: "var(--color-success)", warning: "var(--color-warning)", error: "var(--color-danger)", trade: "var(--color-accent)", info: "var(--text-secondary)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar />
        <main className="main-content" style={{ flex: 1 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                <i className="bi bi-robot" style={{ color: "var(--color-primary)" }} /> Robot Trading
              </h1>
              <p className="text-muted">Automate your trades with rule-based bots</p>
            </div>
            <button className="btn btn--primary" onClick={() => { setShowBuilder(true); setEditingRobot(null); }}>
              <i className="bi bi-plus-circle" /> New Robot
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-sm" style={{ marginBottom: 20 }}>
            {[{ id: "my", label: "My Robots" }, { id: "community", label: "Community" }].map((t) => (
              <button key={t.id} className={`btn btn--sm ${activeTab === t.id ? "btn--primary" : "btn--outline"}`} onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Builder modal */}
          {showBuilder && (
            <div className="modal-overlay" onClick={() => setShowBuilder(false)}>
              <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 660 }}>
                <RobotBuilder
                  existing={editingRobot}
                  onSave={handleSave}
                  onCancel={() => { setShowBuilder(false); setEditingRobot(null); }}
                />
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: logsRobot ? "1fr 380px" : "1fr", gap: 20 }}>
            {/* Robot list */}
            <div className="flex flex-col gap-md">
              {loading && (
                <div className="text-center text-muted" style={{ padding: "var(--space-2xl)" }}>
                  <i className="bi bi-arrow-repeat spin" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
                  Loading robots…
                </div>
              )}

              {activeTab === "my" && !loading && robots.length === 0 && (
                <div className="card" style={{ textAlign: "center", padding: "var(--space-2xl)" }}>
                  <i className="bi bi-robot" style={{ fontSize: 48, color: "var(--text-muted)", display: "block", marginBottom: 12 }} />
                  <p className="font-bold" style={{ marginBottom: 8 }}>No robots yet</p>
                  <p className="text-muted text-sm" style={{ marginBottom: 16 }}>Build your first automated trading robot</p>
                  <button className="btn btn--primary" onClick={() => setShowBuilder(true)}>
                    <i className="bi bi-plus-circle" /> Build Robot
                  </button>
                </div>
              )}

              {activeTab === "my" && robots.map((robot) => (
                <RobotCard
                  key={robot.id}
                  robot={robot}
                  onStart={handleStart}
                  onStop={handleStop}
                  onEdit={(r) => { setEditingRobot(r); setShowBuilder(true); }}
                  onDelete={handleDelete}
                  onViewLogs={(r) => { setLogsRobot(r); setLogs([]); }}
                />
              ))}

              {activeTab === "community" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
                  {community.map((r) => (
                    <div key={r.id} className="card">
                      <div className="font-bold" style={{ marginBottom: 6 }}>{r.name}</div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Win rate</span>
                        <span className={`font-bold ${parseFloat(r.win_rate) >= 50 ? "text-success" : "text-danger"}`}>{r.win_rate}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Trades</span>
                        <span className="font-bold text-mono">{r.total_trades}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Profit</span>
                        <span className={`font-bold text-mono ${parseFloat(r.total_profit) >= 0 ? "text-success" : "text-danger"}`}>
                          ${parseFloat(r.total_profit).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live log panel */}
            {logsRobot && (
              <div className="card" style={{ height: "fit-content", position: "sticky", top: 16 }}>
                <div className="card__header">
                  <span className="card__title"><i className="bi bi-terminal" /> {logsRobot.name}</span>
                  <button className="btn btn--ghost btn--sm" onClick={() => setLogsRobot(null)}>
                    <i className="bi bi-x" />
                  </button>
                </div>
                <div className="robot-log">
                  {logs.length === 0 && <span className="text-muted text-xs">Waiting for activity…</span>}
                  {logs.map((log, i) => (
                    <div key={i} className="robot-log__entry">
                      <span className="robot-log__time">{new Date(log.created_at).toLocaleTimeString()}</span>
                      <span className="robot-log__msg" style={{ color: LOG_COLORS[log.level] || "var(--text-secondary)" }}>
                        [{log.level?.toUpperCase()}] {log.message}
                        {log.profit !== null && log.profit !== undefined && (
                          <span style={{ color: parseFloat(log.profit) >= 0 ? "var(--color-success)" : "var(--color-danger)", marginLeft: 6 }}>
                            {parseFloat(log.profit) >= 0 ? "+" : ""}${parseFloat(log.profit).toFixed(2)}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// src/pages/Wallet.jsx
// ═══════════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import { DepositModal, WithdrawModal } from "../components/layout/Sidebar";
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


// ═══════════════════════════════════════════════════════════════
// src/pages/Home.jsx  — Landing / dashboard
// ═══════════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import { marketsAPI, profileAPI } from "../utils/api";
import { useAuth } from "../App";

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [featured, setFeatured]   = useState([]);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    marketsAPI.getAll({ featured: "true", page_size: 6 }).then((r) => setFeatured(r.data.results || r.data));
    if (isAuthenticated) profileAPI.dashboard().then((r) => setDashboard(r.data));
  }, [isAuthenticated]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ display: "flex", flex: 1 }}>
        {isAuthenticated && <Sidebar />}
        <main style={{ flex: 1, padding: "var(--space-xl) var(--space-lg)" }}>

          {/* Hero (public) */}
          {!isAuthenticated && (
            <div style={{
              textAlign: "center", padding: "80px 20px",
              background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%)",
              marginBottom: 60,
            }}>
              <h1 style={{ fontSize: "clamp(32px,6vw,56px)", fontWeight: 900, letterSpacing: -2, marginBottom: 16, lineHeight: 1.1 }}>
                Trade Smarter.<br />
                <span style={{ color: "var(--color-primary)" }}>Automate</span> Faster.
              </h1>
              <p className="text-muted" style={{ fontSize: 18, maxWidth: 520, margin: "0 auto 32px", lineHeight: 1.7 }}>
                Binary options, Forex, Crypto and Synthetic Indices — all in one platform. Powered by real-time data and intelligent robots.
              </p>
              <div className="flex items-center gap-md" style={{ justifyContent: "center", flexWrap: "wrap" }}>
                <Link to="/register" className="btn btn--primary btn--lg">Get Started Free</Link>
                <Link to="/markets"  className="btn btn--outline btn--lg">Browse Markets</Link>
              </div>
              <div className="flex items-center gap-lg" style={{ justifyContent: "center", marginTop: 40, flexWrap: "wrap" }}>
                {[["M-Pesa", "bi-phone"], ["PayPal", "bi-paypal"], ["Binance", "bi-currency-bitcoin"]].map(([label, icon]) => (
                  <div key={label} className="flex items-center gap-sm text-muted" style={{ fontSize: 14 }}>
                    <i className={icon} style={{ fontSize: 20, color: "var(--color-accent)" }} /> {label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Authenticated dashboard */}
          {isAuthenticated && dashboard && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
                Welcome back, {dashboard.user?.first_name || "Trader"} 👋
              </h2>
              <p className="text-muted" style={{ marginBottom: 24 }}>Here's your trading overview</p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 28 }}>
                {[
                  { label: "Total Trades",    value: dashboard.total_trades_count,  icon: "bi-bar-chart",        color: "var(--color-primary)" },
                  { label: "Win Rate",        value: `${dashboard.win_rate}%`,       icon: "bi-trophy",           color: "var(--color-success)" },
                  { label: "Total P/L",       value: `$${parseFloat(dashboard.total_profit).toFixed(2)}`, icon: "bi-cash-coin", color: parseFloat(dashboard.total_profit) >= 0 ? "var(--color-success)" : "var(--color-danger)" },
                  { label: "Active Robots",   value: dashboard.active_robots_count,  icon: "bi-robot",            color: "var(--color-accent)"  },
                  { label: "Open Trades",     value: dashboard.active_trades_count,  icon: "bi-activity",         color: "var(--color-warning)" },
                ].map((s) => (
                  <div key={s.label} className="stat-card">
                    <div className="stat-card__icon" style={{ background: `${s.color}18`, color: s.color }}><i className={s.icon} /></div>
                    <span className="stat-card__label">{s.label}</span>
                    <span className="stat-card__value text-mono" style={{ fontSize: 22, color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-sm" style={{ marginBottom: 32 }}>
                <Link to="/trade"  className="btn btn--primary"><i className="bi bi-lightning-charge-fill" /> Trade Now</Link>
                <Link to="/robot"  className="btn btn--outline"><i className="bi bi-robot" /> My Robots</Link>
                <Link to="/wallet" className="btn btn--outline"><i className="bi bi-wallet2" /> Wallet</Link>
              </div>
            </div>
          )}

          {/* Featured markets */}
          <div>
            <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Featured Markets</h2>
              <Link to="/markets" className="btn btn--ghost btn--sm">View all <i className="bi bi-arrow-right" /></Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
              {featured.map((m) => {
                const pct = parseFloat(m.price_change_pct_24h);
                return (
                  <Link key={m.id} to={`/trade/${m.slug}`} style={{ textDecoration: "none" }}>
                    <div className="card" style={{ transition: "border-color var(--transition-fast)" }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--color-primary)"}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-color)"}>
                      <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                        <span className="font-bold" style={{ color: "var(--text-primary)" }}>{m.name}</span>
                        <span className={`badge ${pct >= 0 ? "badge--success" : "badge--danger"}`} style={{ fontSize: 11 }}>
                          {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
                        </span>
                      </div>
                      <div className="text-mono font-bold" style={{ fontSize: 24, color: "var(--text-primary)", letterSpacing: -1 }}>
                        {parseFloat(m.current_price).toFixed(m.display_decimals)}
                      </div>
                      <div className="text-xs text-muted" style={{ marginTop: 8 }}>{m.symbol} · Payout up to 95%</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Feature strips (public) */}
          {!isAuthenticated && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20, marginTop: 60 }}>
              {[
                { icon: "bi-robot",          title: "Robot Trading",     desc: "Build automated bots with Martingale, Fibonacci and custom strategies." },
                { icon: "bi-graph-up-arrow", title: "8 Trade Types",     desc: "Rise/Fall, Even/Odd, Touch, Digits, Asian, Lookback and more." },
                { icon: "bi-shield-check",   title: "Secure Payments",   desc: "Deposit & withdraw via M-Pesa, PayPal and Binance Pay." },
                { icon: "bi-lightning",      title: "Real-Time Charts",  desc: "Live candlestick charts powered by WebSocket price feeds." },
              ].map((f) => (
                <div key={f.title} className="card" style={{ textAlign: "center" }}>
                  <i className={f.icon} style={{ fontSize: 36, color: "var(--color-primary)", display: "block", marginBottom: 12 }} />
                  <div className="font-bold" style={{ marginBottom: 8 }}>{f.title}</div>
                  <p className="text-muted text-sm" style={{ lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


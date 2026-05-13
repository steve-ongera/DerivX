
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


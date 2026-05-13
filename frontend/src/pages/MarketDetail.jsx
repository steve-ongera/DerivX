
// ═══════════════════════════════════════════════════════════════
// src/pages/MarketDetail.jsx  — SEO slug page
// ═══════════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import TradingChart from "../components/trading/TradingChart";
import { marketsAPI } from "../utils/api";

export default function MarketDetail() {
  const { slug }  = useParams();
  const [market, setMarket]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    marketsAPI.getBySlug(slug)
      .then((r) => {
        setMarket(r.data);
        // Dynamic SEO title
        document.title = `${r.data.meta_title || r.data.name} | Trade on DerivX`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute("content", r.data.meta_description || `Trade ${r.data.name} on DerivX.`);
      })
      .finally(() => setLoading(false));
    return () => { document.title = "DerivX — Trade Forex, Crypto & Synthetic Indices"; };
  }, [slug]);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <div className="page-loader"><i className="bi bi-arrow-repeat spin" /></div>
    </div>
  );

  if (!market) return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <div className="page-loader"><span className="text-muted">Market not found</span></div>
    </div>
  );

  const pct = parseFloat(market.price_change_pct_24h);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar />
        <main className="main-content" style={{ flex: 1 }}>
          {/* Breadcrumb */}
          <div className="text-xs text-muted" style={{ marginBottom: 16 }}>
            <Link to="/markets" style={{ color: "var(--text-muted)" }}>Markets</Link>
            {" / "}
            <Link to={`/markets?category=${market.category?.slug}`} style={{ color: "var(--text-muted)" }}>{market.category?.name}</Link>
            {" / "}
            <span style={{ color: "var(--text-secondary)" }}>{market.name}</span>
          </div>

          {/* Title + CTA */}
          <div className="flex justify-between items-center" style={{ marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{market.name}</h1>
              <div className="flex items-center gap-md">
                <span className="text-muted text-sm">{market.symbol}</span>
                <span className={`badge ${market.status === "open" ? "badge--success" : "badge--danger"}`}>
                  {market.status === "open" && <span className="live-dot" style={{ width: 6, height: 6, marginRight: 4 }} />}
                  {market.status}
                </span>
                {market.is_featured && <span className="badge badge--primary"><i className="bi bi-star-fill" /> Featured</span>}
              </div>
            </div>
            <Link to={`/trade/${market.slug}`} className="btn btn--primary btn--lg">
              <i className="bi bi-lightning-charge-fill" /> Trade Now
            </Link>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Current Price", value: parseFloat(market.current_price).toFixed(market.display_decimals), color: "var(--text-primary)" },
              { label: "24h Change",    value: `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`, color: pct >= 0 ? "var(--color-success)" : "var(--color-danger)" },
              { label: "Volatility",   value: `${market.volatility}%` },
              { label: "Min Stake",    value: `$${market.minimum_stake}` },
              { label: "Max Stake",    value: `$${market.maximum_stake}` },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <span className="stat-card__label">{s.label}</span>
                <span className="stat-card__value text-mono" style={{ fontSize: 20, color: s.color || "var(--text-primary)" }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ marginBottom: 24 }}>
            <TradingChart market={market} />
          </div>

          {/* Description + trade types */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
            <div className="card">
              <div className="card__header"><span className="card__title">About {market.name}</span></div>
              <p className="text-muted" style={{ lineHeight: 1.8, fontSize: 14 }}>
                {market.description || `${market.name} is a ${market.category?.name} instrument available for trading on DerivX. Trade binary options contracts including Rise/Fall, Even/Odd, Touch/No Touch and more.`}
              </p>
            </div>
            <div className="card">
              <div className="card__header"><span className="card__title">Available Contracts</span></div>
              <div className="flex flex-col gap-sm">
                {(market.trade_types || []).map((tt) => (
                  <div key={tt.slug} className="flex justify-between items-center" style={{ padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
                    <span className="text-sm font-bold">{tt.display_name}</span>
                    <span className="badge badge--success">{tt.max_payout_pct}%</span>
                  </div>
                ))}
                {!market.trade_types?.length && <p className="text-muted text-sm">No contracts listed</p>}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
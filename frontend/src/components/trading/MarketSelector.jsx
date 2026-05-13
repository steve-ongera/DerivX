// src/components/trading/MarketSelector.jsx
import React, { useEffect, useState } from "react";
import { marketsAPI } from "../../utils/api";

export default function MarketSelector({ selectedMarket, onSelect }) {
  const [categories, setCategories] = useState([]);
  const [markets,    setMarkets]    = useState([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [search,     setSearch]     = useState("");
  const [open,       setOpen]       = useState(false);

  useEffect(() => {
    marketsAPI.getCategories().then((r) => {
      setCategories(r.data);
      if (r.data.length) setActiveCategory(r.data[0].slug);
    });
  }, []);

  useEffect(() => {
    const params = {};
    if (activeCategory) params.category = activeCategory;
    if (search)         params.search   = search;
    marketsAPI.getAll(params).then((r) => setMarkets(r.data.results || r.data));
  }, [activeCategory, search]);

  return (
    <div style={{ position: "relative" }}>
      <button
        className="btn btn--outline"
        onClick={() => setOpen((o) => !o)}
        style={{ minWidth: 220, justifyContent: "space-between" }}
      >
        <span className="flex items-center gap-sm">
          <i className="bi bi-graph-up-arrow" />
          {selectedMarket ? selectedMarket.name : "Select Market"}
        </span>
        <i className={`bi bi-chevron-${open ? "up" : "down"}`} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0,
          width: 380, maxHeight: 480,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          zIndex: 200, overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          {/* Search */}
          <div style={{ padding: "var(--space-sm) var(--space-md)", borderBottom: "1px solid var(--border-color)" }}>
            <input
              className="form-input"
              placeholder="Search markets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{ padding: "8px 12px" }}
            />
          </div>

          {/* Category tabs */}
          <div className="flex" style={{
            gap: 4, padding: "var(--space-sm)",
            borderBottom: "1px solid var(--border-color)",
            overflowX: "auto", flexShrink: 0,
          }}>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                className={`chart-timeframe-btn ${activeCategory === cat.slug ? "active" : ""}`}
                onClick={() => setActiveCategory(cat.slug)}
                style={{ whiteSpace: "nowrap" }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Market list */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {markets.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between"
                onClick={() => { onSelect(m); setOpen(false); }}
                style={{
                  padding: "10px var(--space-md)",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border-color)",
                  background: selectedMarket?.id === m.id ? "rgba(99,102,241,0.08)" : "transparent",
                  transition: "background var(--transition-fast)",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-elevated)"}
                onMouseLeave={(e) => e.currentTarget.style.background = selectedMarket?.id === m.id ? "rgba(99,102,241,0.08)" : "transparent"}
              >
                <div>
                  <div className="font-bold" style={{ fontSize: "var(--font-size-sm)" }}>{m.name}</div>
                  <div className="text-xs text-muted">{m.symbol}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="text-mono" style={{ fontSize: "var(--font-size-sm)", fontWeight: 700 }}>
                    {parseFloat(m.current_price).toFixed(m.display_decimals)}
                  </div>
                  <div className={`text-xs font-bold ${parseFloat(m.price_change_pct_24h) >= 0 ? "text-success" : "text-danger"}`}>
                    {parseFloat(m.price_change_pct_24h) >= 0 ? "+" : ""}
                    {parseFloat(m.price_change_pct_24h).toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
            {!markets.length && (
              <div className="text-muted text-center" style={{ padding: "var(--space-xl)" }}>
                No markets found
              </div>
            )}
          </div>
        </div>
      )}

      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 199 }}
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}


// src/components/trading/ActiveTrades.jsx
export function ActiveTrades({ trades = [], onTradeClick }) {
  if (!trades.length) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "var(--space-xl)" }}>
        <i className="bi bi-inbox" style={{ fontSize: 32, color: "var(--text-muted)" }} />
        <p className="text-muted" style={{ marginTop: 8 }}>No open trades</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">
          <i className="bi bi-activity" style={{ color: "var(--color-primary)" }} /> Active Trades
        </span>
        <span className="badge badge--primary">{trades.length}</span>
      </div>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Contract</th>
              <th>Market</th>
              <th>Type</th>
              <th>Stake</th>
              <th>Payout</th>
              <th>Entry</th>
              <th>Expiry</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr
                key={t.id}
                onClick={() => onTradeClick?.(t)}
                style={{ cursor: "pointer" }}
              >
                <td>
                  <span className="text-mono text-xs">{t.contract_id}</span>
                </td>
                <td className="font-bold" style={{ color: "var(--text-primary)" }}>
                  {t.market_name}
                </td>
                <td>
                  <span className={`badge ${
                    t.trade_type_name?.toLowerCase().includes("rise") ? "badge--success" :
                    t.trade_type_name?.toLowerCase().includes("fall") ? "badge--danger"  :
                    "badge--primary"
                  }`}>
                    {t.trade_type_name}
                  </span>
                </td>
                <td className="text-mono">${parseFloat(t.stake).toFixed(2)}</td>
                <td className="text-mono text-success">${parseFloat(t.payout).toFixed(2)}</td>
                <td className="text-mono text-xs">{t.entry_price ? parseFloat(t.entry_price).toFixed(4) : "—"}</td>
                <td className="text-xs text-muted">
                  {t.expiry_time ? new Date(t.expiry_time).toLocaleTimeString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// src/components/trading/TradeHistory.jsx
export function TradeHistory({ trades = [] }) {
  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">
          <i className="bi bi-clock-history" /> Trade History
        </span>
      </div>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Contract</th>
              <th>Market</th>
              <th>Type</th>
              <th>Stake</th>
              <th>P/L</th>
              <th>Result</th>
              <th>Closed</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--text-muted)" }}>
                  No trade history yet
                </td>
              </tr>
            )}
            {trades.map((t) => (
              <tr key={t.id}>
                <td><span className="text-mono text-xs">{t.contract_id}</span></td>
                <td className="font-bold" style={{ color: "var(--text-primary)" }}>{t.market_name}</td>
                <td><span className="badge badge--muted">{t.trade_type_name}</span></td>
                <td className="text-mono">${parseFloat(t.stake).toFixed(2)}</td>
                <td className={`text-mono font-bold ${parseFloat(t.profit_loss) >= 0 ? "text-success" : "text-danger"}`}>
                  {parseFloat(t.profit_loss) >= 0 ? "+" : ""}${parseFloat(t.profit_loss).toFixed(2)}
                </td>
                <td>
                  <span className={`badge ${
                    t.status === "won"  ? "badge--success" :
                    t.status === "lost" ? "badge--danger"  :
                    "badge--muted"
                  }`}>
                    {t.status === "won"  && <i className="bi bi-check-circle-fill" />}
                    {t.status === "lost" && <i className="bi bi-x-circle-fill" />}
                    {" "}{t.status}
                  </span>
                </td>
                <td className="text-xs text-muted">
                  {t.close_time ? new Date(t.close_time).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// src/components/trading/Ticker.jsx
export function Ticker({ markets = [], onSelect }) {
  return (
    <div className="ticker-strip">
      {markets.map((m) => {
        const pct = parseFloat(m.price_change_pct_24h);
        return (
          <div
            key={m.id}
            className="ticker-item"
            onClick={() => onSelect?.(m)}
          >
            <span className="ticker-item__symbol">{m.symbol}</span>
            <span className="ticker-item__price">
              {parseFloat(m.current_price).toFixed(m.display_decimals)}
            </span>
            <span className={`ticker-item__change ${pct >= 0 ? "up" : "down"}`}>
              {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
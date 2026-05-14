// ═══════════════════════════════════════════════════════════════
// src/pages/Trade.jsx  — Main trading terminal
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import TradingChart from "../components/trading/TradingChart";
import TradePanel from "../components/trading/TradePanel";
import MarketSelector from "../components/trading/MarketSelector";
import ActiveTrades from "../components/trading/ActiveTrades";
import TradeHistory from "../components/trading/TradeHistory";
import Ticker from "../components/trading/Ticker";
import { marketsAPI, tradesAPI } from "../utils/api";
import { wsManager } from "../utils/websocket";
import { useAuth } from "../App";

export default function Trade() {
  const { slug }      = useParams();
  const navigate      = useNavigate();
  const { dispatch }  = useAuth();

  const [market,       setMarket]       = useState(null);
  const [markets,      setMarkets]      = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [lastDigit,    setLastDigit]    = useState(null);
  const [activeTrades, setActiveTrades] = useState([]);
  const [history,      setHistory]      = useState([]);
  const [activeTab,    setActiveTab]    = useState("active");

  // Load featured markets for ticker
  useEffect(() => {
    marketsAPI.getAll({ featured: "true", page_size: 20 }).then((r) =>
      setMarkets(r.data.results || r.data)
    );
  }, []);

  // Load market by slug (or first available)
  useEffect(() => {
    if (slug) {
      marketsAPI.getBySlug(slug).then((r) => setMarket(r.data)).catch(() => navigate("/trade"));
    } else {
      marketsAPI.getAll({ page_size: 1, featured: "true" }).then((r) => {
        const first = (r.data.results || r.data)[0];
        if (first) navigate(`/trade/${first.slug}`, { replace: true });
      });
    }
  }, [slug, navigate]);

  // Load active & history trades
  const loadTrades = useCallback(() => {
    tradesAPI.getActive().then((r) => setActiveTrades(r.data));
    tradesAPI.getAll({ status: "won,lost,cancelled", page_size: 20 }).then((r) =>
      setHistory(r.data.results || r.data)
    );
  }, []);

  useEffect(() => { loadTrades(); }, [loadTrades]);

  // WS: listen for settled trades
  useEffect(() => {
    const unsub = wsManager.on("trades", "trade_settled", (msg) => {
      setActiveTrades((prev) => prev.filter((t) => t.id !== msg.trade.id));
      setHistory((prev) => [msg.trade, ...prev.slice(0, 19)]);
    });
    const unsubOpen = wsManager.on("trades", "trade_opened", (msg) => {
      setActiveTrades((prev) => [msg.trade, ...prev]);
    });
    const unsubBal = wsManager.on("trades", "balance_update", (msg) => {
      Object.entries(msg).forEach(([currency, data]) => {
        if (typeof data === "object")
          dispatch({ type: "UPDATE_BALANCE", currency, ...data });
      });
    });
    return () => { unsub(); unsubOpen(); unsubBal(); };
  }, [dispatch]);

  const handlePriceUpdate = useCallback(({ price, digit }) => {
    setCurrentPrice(price);
    setLastDigit(digit);
  }, []);

  const handleTradePlace = useCallback((trade) => {
    setActiveTrades((prev) => [trade, ...prev]);
  }, []);

  const handleMarketSelect = (m) => navigate(`/trade/${m.slug}`);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg-base)" }}>
      <Navbar />
      <Ticker markets={markets} onSelect={handleMarketSelect} />

      <div style={{ display: "flex", flex: 1, gap: 0 }}>
        <Sidebar />

        <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, overflow: "hidden" }}>
          {/* Top bar */}
          <div className="flex items-center gap-md" style={{ padding: "var(--space-md) var(--space-lg)", borderBottom: "1px solid var(--border-color)", flexWrap: "wrap", gap: 12 }}>
            <MarketSelector selectedMarket={market} onSelect={handleMarketSelect} />
            {market && (
              <div className="flex items-center gap-md" style={{ flex: 1, flexWrap: "wrap" }}>
                <div>
                  <div className="text-xs text-muted">24h Change</div>
                  <div className={`font-bold text-mono ${parseFloat(market.price_change_pct_24h) >= 0 ? "text-success" : "text-danger"}`}>
                    {parseFloat(market.price_change_pct_24h) >= 0 ? "+" : ""}{parseFloat(market.price_change_pct_24h).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Volatility</div>
                  <div className="font-bold text-mono">{market.volatility}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Min Stake</div>
                  <div className="font-bold text-mono">${market.minimum_stake}</div>
                </div>
                <span className={`badge ${market.status === "open" ? "badge--success" : "badge--danger"}`}>
                  {market.status === "open" && <span className="live-dot" style={{ width: 6, height: 6, marginRight: 4 }} />}
                  {market.status}
                </span>
              </div>
            )}
          </div>

          {/* Chart + Panel */}
          <div style={{ display: "flex", flex: 1, gap: 0, overflow: "hidden" }}>
            <div style={{ flex: 1, padding: "var(--space-md) var(--space-lg)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              {market ? (
                <TradingChart
                  market={market}
                  onPriceUpdate={handlePriceUpdate}
                />
              ) : (
                <div className="card" style={{ height: 420, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div className="text-muted text-center">
                    <i className="bi bi-graph-up" style={{ fontSize: 48, display: "block", marginBottom: 12 }} />
                    Select a market to start trading
                  </div>
                </div>
              )}

              {/* Trades tabs */}
              <div>
                <div className="flex gap-sm" style={{ marginBottom: 12 }}>
                  {[
                    { id: "active",  label: `Active (${activeTrades.length})` },
                    { id: "history", label: "History" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      className={`chart-timeframe-btn ${activeTab === tab.id ? "active" : ""}`}
                      onClick={() => setActiveTab(tab.id)}
                      style={{ padding: "6px 16px", fontSize: 13 }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                {activeTab === "active"
                  ? <ActiveTrades trades={activeTrades} />
                  : <TradeHistory trades={history} />
                }
              </div>
            </div>

            {/* Side panel */}
            <div style={{ borderLeft: "1px solid var(--border-color)", padding: "var(--space-md)", overflowY: "auto", flexShrink: 0 }}>
              <TradePanel
                market={market}
                currentPrice={currentPrice}
                lastDigit={lastDigit}
                onTradePlace={handleTradePlace}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
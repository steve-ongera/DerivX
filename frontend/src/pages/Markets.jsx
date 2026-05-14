// ═══════════════════════════════════════════════════════════════
// src/pages/Markets.jsx
// ═══════════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import { marketsAPI } from "../utils/api";

export default function Markets() {
  const navigate = useNavigate();
  const [categories,     setCategories]     = useState([]);
  const [markets,        setMarkets]        = useState([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [search,         setSearch]         = useState("");
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    marketsAPI.getCategories().then((r) => {
      // Handle both array and paginated {results:[]} responses
      const data = Array.isArray(r.data) ? r.data : (r.data.results || []);
      setCategories(data);
      if (data.length) setActiveCategory(data[0].slug);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page_size: 50 };
    if (activeCategory) params.category = activeCategory;
    if (search)         params.search   = search;
    marketsAPI.getAll(params)
      .then((r) => setMarkets(r.data.results || r.data))
      .finally(() => setLoading(false));
  }, [activeCategory, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar />
        <main className="main-content" style={{ gridColumn: "unset", flex: 1 }}>
          {/* Header */}
          <div className="flex justify-between items-center" style={{ marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Markets</h1>
              <p className="text-muted">Browse all available trading instruments</p>
            </div>
            <input
              className="form-input"
              placeholder="Search markets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 240, padding: "8px 14px" }}
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-sm" style={{ marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                className={`btn btn--sm ${activeCategory === cat.slug ? "btn--primary" : "btn--outline"}`}
                onClick={() => setActiveCategory(cat.slug)}
                style={{ whiteSpace: "nowrap" }}
              >
                {cat.name}
                <span className="badge badge--muted" style={{ marginLeft: 6 }}>{cat.market_count}</span>
              </button>
            ))}
          </div>

          {/* Market grid */}
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card" style={{ height: 140, background: "var(--bg-elevated)" }}>
                  <div className="pulse" style={{ height: "100%", borderRadius: "var(--radius-md)", background: "var(--bg-base)" }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {markets.map((m) => {
                const pct = parseFloat(m.price_change_pct_24h);
                return (
                  // ✅ Outer card is a div, not a Link — no nested <a> issue
                  <div
                    key={m.id}
                    className="card"
                    onClick={() => navigate(`/markets/${m.slug}`)}
                    style={{
                      transition: "all var(--transition-fast)",
                      cursor: "pointer",
                      borderColor: m.is_featured ? "rgba(99,102,241,0.4)" : "var(--border-color)",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--color-primary)"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = m.is_featured ? "rgba(99,102,241,0.4)" : "var(--border-color)"}
                  >
                    <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                      <div>
                        <div className="font-bold" style={{ fontSize: 15, color: "var(--text-primary)" }}>{m.name}</div>
                        <div className="text-xs text-muted">{m.symbol}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        {m.is_featured && (
                          <span className="badge badge--primary" style={{ fontSize: 10 }}>
                            <i className="bi bi-star-fill" /> Featured
                          </span>
                        )}
                        <span className={`badge ${m.status === "open" ? "badge--success" : "badge--muted"}`} style={{ fontSize: 10 }}>
                          {m.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-xs text-muted">Current Price</div>
                        <div className="text-mono font-bold" style={{ fontSize: 20, color: "var(--text-primary)" }}>
                          {parseFloat(m.current_price).toFixed(m.display_decimals)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="text-xs text-muted">24h Change</div>
                        <div className={`font-bold text-mono ${pct >= 0 ? "text-success" : "text-danger"}`}>
                          {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="text-xs text-muted">Vol: {m.volatility}%</span>
                      <span className="text-xs text-muted">Min: ${m.minimum_stake}</span>
                      {/* ✅ button with stopPropagation instead of nested <Link> */}
                      <button
                        className="btn btn--primary btn--sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/trade/${m.slug}`); }}
                        style={{ padding: "3px 12px", fontSize: 11 }}
                      >
                        Trade
                      </button>
                    </div>
                  </div>
                );
              })}
              {markets.length === 0 && !loading && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "var(--space-2xl)", color: "var(--text-muted)" }}>
                  <i className="bi bi-search" style={{ fontSize: 36, display: "block", marginBottom: 12 }} />
                  No markets found
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
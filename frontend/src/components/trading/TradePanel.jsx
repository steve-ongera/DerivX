// src/components/trading/TradePanel.jsx
import React, { useState, useEffect, useCallback } from "react";
import { tradesAPI, tradeTypesAPI } from "../../utils/api";
import { useAuth } from "../../App";

const CONTRACT_CATEGORIES = [
  {
    id: "updown",
    label: "Up / Down",
    icon: "bi-arrow-up-down",
    types: ["rise", "fall"],
  },
  {
    id: "highlow",
    label: "High / Low",
    icon: "bi-bar-chart-steps",
    types: ["higher", "lower"],
  },
  {
    id: "touchnotouch",
    label: "Touch",
    icon: "bi-hand-index",
    types: ["touch", "no-touch"],
  },
  {
    id: "digits",
    label: "Digits",
    icon: "bi-123",
    types: ["even", "odd", "matches", "differs", "over", "under"],
  },
];

const DURATION_UNITS = [
  { value: "t", label: "Ticks" },
  { value: "s", label: "Seconds" },
  { value: "m", label: "Minutes" },
  { value: "h", label: "Hours" },
];

const QUICK_STAKES = [1, 5, 10, 25, 50, 100];

export default function TradePanel({ market, currentPrice, lastDigit, onTradePlace }) {
  const { wallets, dispatch } = useAuth();

  const [tradeTypes,     setTradeTypes]     = useState([]);
  const [activeCategory, setActiveCategory] = useState("updown");
  const [selectedType,   setSelectedType]   = useState(null);
  const [stake,          setStake]          = useState("1.00");
  const [duration,       setDuration]       = useState(5);
  const [durationUnit,   setDurationUnit]   = useState("t");
  const [accountType,    setAccountType]    = useState("demo");
  const [barrier,        setBarrier]        = useState("");
  const [selectedDigit,  setSelectedDigit]  = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [success,        setSuccess]        = useState("");
  const [payout,         setPayout]         = useState(0);
  const [payoutPct,      setPayoutPct]      = useState(85);

  // Load trade types for this market
  useEffect(() => {
    if (!market?.slug) return;
    tradeTypesAPI.getAll({ market: market.slug }).then((res) => {
      setTradeTypes(res.data.results || res.data);
    });
  }, [market?.slug]);

  // Auto-select first type in category
  useEffect(() => {
    const category = CONTRACT_CATEGORIES.find((c) => c.id === activeCategory);
    if (!category) return;
    const first = tradeTypes.find(
      (t) => t.contract_category === activeCategory
    );
    if (first) setSelectedType(first);
  }, [activeCategory, tradeTypes]);

  // Recalculate payout
  useEffect(() => {
    const s = parseFloat(stake) || 0;
    const pct = selectedType?.max_payout_pct || 85;
    setPayoutPct(pct);
    setPayout(((s * pct) / 100 + s).toFixed(2));
  }, [stake, selectedType]);

  const usdWallet = wallets.find((w) => w.currency === "USD");
  const balance = accountType === "demo"
    ? parseFloat(usdWallet?.demo_balance || 0)
    : parseFloat(usdWallet?.balance || 0);

  const needsBarrier = selectedType?.requires_barrier;
  const needsDigit   = selectedType?.requires_last_digit;

  const handleStakeChange = (val) => {
    const clean = val.replace(/[^0-9.]/g, "");
    setStake(clean);
  };

  const adjustStake = (delta) => {
    const current = parseFloat(stake) || 0;
    const next = Math.max(0.35, parseFloat((current + delta).toFixed(2)));
    setStake(String(next));
  };

  const placeTrade = useCallback(
    async (direction) => {
      if (!market || !selectedType) return;
      setError("");
      setSuccess("");
      setLoading(true);

      const payload = {
        market_slug:     market.slug,
        trade_type_slug: direction === "rise"  ? "rise"
                       : direction === "fall"  ? "fall"
                       : selectedType.slug,
        stake:           parseFloat(stake),
        duration:        parseInt(duration),
        duration_unit:   durationUnit,
        account_type:    accountType,
      };

      if (needsBarrier && barrier)  payload.barrier        = parseFloat(barrier);
      if (needsDigit && selectedDigit !== null) payload.selected_digit = selectedDigit;

      try {
        const { data } = await tradesAPI.place(payload);
        setSuccess(`✓ Trade placed! Contract: ${data.contract_id}`);
        onTradePlace?.(data);
        // Balance refresh via WebSocket — also refresh context
        setTimeout(() => setSuccess(""), 4000);
      } catch (err) {
        const msg = err.response?.data;
        if (typeof msg === "object") {
          setError(Object.values(msg).flat().join(" "));
        } else {
          setError("Trade placement failed. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [market, selectedType, stake, duration, durationUnit, accountType, barrier, selectedDigit, needsBarrier, needsDigit, onTradePlace]
  );

  const filteredTypes = tradeTypes.filter(
    (t) => t.contract_category === activeCategory
  );

  return (
    <div className="trade-panel">
      {/* Account toggle */}
      <div className="flex" style={{ background: "var(--bg-base)", borderRadius: "var(--radius-md)", padding: 4, gap: 4 }}>
        {["demo", "real"].map((acc) => (
          <button
            key={acc}
            onClick={() => setAccountType(acc)}
            className="btn btn--sm"
            style={{
              flex: 1,
              background: accountType === acc ? "var(--color-primary)" : "transparent",
              color: accountType === acc ? "#fff" : "var(--text-muted)",
              border: "none",
            }}
          >
            {acc === "demo" ? <><i className="bi bi-mortarboard" /> Demo</> : <><i className="bi bi-currency-dollar" /> Real</>}
          </button>
        ))}
      </div>

      {/* Balance */}
      <div style={{ textAlign: "center" }}>
        <div className="text-xs text-muted" style={{ marginBottom: 2 }}>
          {accountType === "demo" ? "Demo" : "Real"} Balance
        </div>
        <div className="text-mono font-bold" style={{ fontSize: 22, color: "var(--color-success)" }}>
          ${balance.toFixed(2)}
        </div>
      </div>

      <hr className="divider" />

      {/* Contract category tabs */}
      <div>
        <div className="text-xs text-muted" style={{ marginBottom: 8 }}>Trade Type</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 6 }}>
          {CONTRACT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`trade-type-btn ${activeCategory === cat.id ? "active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <i className={cat.icon} />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sub-types */}
      {filteredTypes.length > 0 && (
        <div>
          <div className="text-xs text-muted" style={{ marginBottom: 8 }}>Contract</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {filteredTypes.map((tt) => (
              <button
                key={tt.slug}
                className={`badge ${selectedType?.slug === tt.slug ? "badge--primary" : "badge--muted"}`}
                style={{ cursor: "pointer", padding: "6px 12px", fontSize: 12 }}
                onClick={() => setSelectedType(tt)}
              >
                {tt.display_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Digit picker (Even/Odd/Matches etc.) */}
      {needsDigit && (
        <div>
          <div className="text-xs text-muted" style={{ marginBottom: 8 }}>
            Select Digit
            {lastDigit !== null && (
              <span className="badge badge--info" style={{ marginLeft: 8 }}>
                Last: {lastDigit}
              </span>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4 }}>
            {[0,1,2,3,4,5,6,7,8,9].map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDigit(d)}
                style={{
                  padding: "8px 0",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${selectedDigit === d ? "var(--color-primary)" : "var(--border-color)"}`,
                  background: selectedDigit === d ? "rgba(99,102,241,0.15)" : "var(--bg-base)",
                  color: selectedDigit === d ? "var(--color-primary-light)" : "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Barrier input */}
      {needsBarrier && (
        <div className="form-group">
          <label className="form-label">Barrier</label>
          <input
            className="form-input"
            type="number"
            placeholder={currentPrice ? String(currentPrice) : "Enter barrier"}
            value={barrier}
            onChange={(e) => setBarrier(e.target.value)}
            step="0.01"
          />
        </div>
      )}

      <hr className="divider" />

      {/* Stake */}
      <div>
        <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
          <span className="text-xs text-muted">Stake (USD)</span>
          <div className="flex items-center gap-sm">
            <button className="btn btn--ghost btn--sm" onClick={() => adjustStake(-1)}>
              <i className="bi bi-dash" />
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => adjustStake(1)}>
              <i className="bi bi-plus" />
            </button>
          </div>
        </div>

        <input
          className="form-input text-mono"
          type="number"
          value={stake}
          onChange={(e) => handleStakeChange(e.target.value)}
          min="0.35"
          step="0.01"
          style={{ fontSize: 22, fontWeight: 700, textAlign: "center", padding: "12px" }}
        />

        {/* Quick stake buttons */}
        <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
          {QUICK_STAKES.map((s) => (
            <button
              key={s}
              className="btn btn--ghost btn--sm"
              style={{ flex: 1, minWidth: 40 }}
              onClick={() => setStake(String(s))}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <div className="text-xs text-muted" style={{ marginBottom: 8 }}>Duration</div>
        <div className="flex gap-sm">
          <input
            className="form-input text-mono"
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
            style={{ flex: 1, textAlign: "center", fontWeight: 700 }}
          />
          <select
            className="form-select"
            value={durationUnit}
            onChange={(e) => setDurationUnit(e.target.value)}
            style={{ flex: 1 }}
          >
            {DURATION_UNITS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Payout display */}
      <div className="payout-display">
        <span>Payout ({payoutPct}%)</span>
        <strong>${payout}</strong>
      </div>

      {/* Error / success feedback */}
      {error   && <div className="badge badge--danger w-full" style={{ padding: "8px 12px", justifyContent: "flex-start" }}><i className="bi bi-exclamation-circle" /> {error}</div>}
      {success && <div className="badge badge--success w-full" style={{ padding: "8px 12px", justifyContent: "flex-start" }}>{success}</div>}

      {/* Buy buttons */}
      {activeCategory === "updown" ? (
        <div className="buy-buttons">
          <button
            className="btn btn--rise"
            onClick={() => placeTrade("rise")}
            disabled={loading || !market}
          >
            {loading ? <i className="bi bi-arrow-repeat spin" /> : <i className="bi bi-arrow-up-circle-fill" />}
            Rise
          </button>
          <button
            className="btn btn--fall"
            onClick={() => placeTrade("fall")}
            disabled={loading || !market}
          >
            {loading ? <i className="bi bi-arrow-repeat spin" /> : <i className="bi bi-arrow-down-circle-fill" />}
            Fall
          </button>
        </div>
      ) : (
        <button
          className="btn btn--primary btn--full btn--lg"
          onClick={() => placeTrade("buy")}
          disabled={loading || !market || !selectedType}
        >
          {loading
            ? <><i className="bi bi-arrow-repeat spin" /> Placing…</>
            : <><i className="bi bi-lightning-charge-fill" /> Place Trade</>
          }
        </button>
      )}
    </div>
  );
}
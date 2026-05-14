// src/components/wallet/BinanceForm.jsx
import React, { useState } from "react";
import Button from "../common/Button";

const COINS = [
  { symbol: "USDT", name: "Tether", icon: "bi-coin" },
  { symbol: "BTC",  name: "Bitcoin", icon: "bi-currency-bitcoin" },
  { symbol: "ETH",  name: "Ethereum", icon: "bi-gem" },
  { symbol: "BNB",  name: "BNB", icon: "bi-hexagon" },
];

const BinanceForm = ({ type = "deposit", onSubmit, loading }) => {
  const [coin, setCoin] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState({});

  const validate = () => {
    const errs = {};
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0)
      errs.amount = "Enter a valid amount";
    if (type === "withdraw" && address.trim().length < 26)
      errs.address = "Enter a valid wallet address";
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setError(errs); return; }
    setError({});
    onSubmit({ coin, amount: parseFloat(amount), address });
  };

  return (
    <div>
      <div
        style={{
          display: "flex", alignItems: "center", gap: "var(--space-sm)",
          padding: "var(--space-md)", background: "rgba(240,185,11,0.08)",
          borderRadius: "var(--radius-md)", marginBottom: "var(--space-lg)",
          border: "1px solid rgba(240,185,11,0.25)",
        }}
      >
        <i className="bi bi-currency-bitcoin" style={{ fontSize: 28, color: "#F0B90B" }} />
        <div>
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--text-primary)" }}>
            Binance Pay · Crypto {type === "deposit" ? "Deposit" : "Withdrawal"}
          </div>
          <div className="text-muted text-xs">Low fees · Blockchain verified</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        {/* Coin selector */}
        <div className="form-group">
          <label className="form-label">Select Coin</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-xs)" }}>
            {COINS.map((c) => (
              <button
                key={c.symbol}
                type="button"
                onClick={() => setCoin(c.symbol)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 4, padding: "10px 6px",
                  borderRadius: "var(--radius-md)",
                  background: coin === c.symbol ? "rgba(240,185,11,0.15)" : "var(--bg-base)",
                  border: coin === c.symbol ? "1px solid #F0B90B" : "1px solid var(--border-color)",
                  color: coin === c.symbol ? "#F0B90B" : "var(--text-secondary)",
                  cursor: "pointer", transition: "all var(--transition-fast)",
                  fontSize: "var(--font-size-xs)", fontWeight: 700,
                }}
              >
                <i className={`bi ${c.icon}`} style={{ fontSize: 18 }} />
                {c.symbol}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Amount ({coin})</label>
          <input
            className={`form-input ${error.amount ? "form-input--error" : ""}`}
            type="number"
            placeholder="0.00"
            step="any"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {error.amount && <span className="form-error">{error.amount}</span>}
        </div>

        {type === "withdraw" && (
          <div className="form-group">
            <label className="form-label">Withdrawal Address ({coin})</label>
            <input
              className={`form-input ${error.address ? "form-input--error" : ""}`}
              type="text"
              placeholder={`Paste your ${coin} wallet address`}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-xs)" }}
            />
            {error.address && <span className="form-error">{error.address}</span>}
          </div>
        )}

        {type === "deposit" && (
          <div
            style={{
              background: "var(--bg-base)", padding: "var(--space-md)",
              borderRadius: "var(--radius-md)", textAlign: "center",
            }}
          >
            <div className="text-muted text-xs" style={{ marginBottom: 8 }}>
              Your {coin} Deposit Address
            </div>
            {/* QR placeholder */}
            <div
              style={{
                width: 120, height: 120, margin: "0 auto 8px",
                background: "var(--bg-elevated)", borderRadius: "var(--radius-md)",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px dashed var(--border-color-light)",
              }}
            >
              <i className="bi bi-qr-code" style={{ fontSize: 48, color: "var(--text-muted)" }} />
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--font-size-xs)",
                color: "var(--text-muted)", wordBreak: "break-all",
                padding: "6px 10px", background: "var(--bg-surface)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              Address loads after clicking Pay
            </div>
          </div>
        )}

        <div
          className="text-xs text-muted"
          style={{
            background: "rgba(240,185,11,0.05)", padding: "var(--space-sm) var(--space-md)",
            borderRadius: "var(--radius-md)", border: "1px solid rgba(240,185,11,0.15)",
          }}
        >
          <i className="bi bi-shield-check" style={{ marginRight: 4, color: "#F0B90B" }} />
          Always verify the address. Crypto transfers are irreversible.
        </div>

        <Button type="submit" full loading={loading}
          style={{ background: "#F0B90B", color: "#000", fontWeight: 700 }}
          variant="outline"
        >
          <i className="bi bi-currency-bitcoin" />
          {type === "deposit" ? "Generate Deposit Address" : "Submit Withdrawal"}
        </Button>
      </form>
    </div>
  );
};

export default BinanceForm;
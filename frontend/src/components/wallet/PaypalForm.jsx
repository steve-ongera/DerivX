// src/components/wallet/PaypalForm.jsx
import React, { useState } from "react";
import Button from "../common/Button";

const PaypalForm = ({ type = "deposit", onSubmit, loading }) => {
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState({});

  const validate = () => {
    const errs = {};
    if (!amount || isNaN(amount) || parseFloat(amount) < 5)
      errs.amount = "Minimum amount is $5.00";
    if (type === "withdraw" && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      errs.email = "Enter a valid PayPal email address";
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setError(errs); return; }
    setError({});
    onSubmit({ amount: parseFloat(amount), email });
  };

  const quickAmounts = [10, 25, 50, 100];

  return (
    <div>
      <div
        style={{
          display: "flex", alignItems: "center", gap: "var(--space-sm)",
          padding: "var(--space-md)", background: "rgba(0,112,186,0.08)",
          borderRadius: "var(--radius-md)", marginBottom: "var(--space-lg)",
          border: "1px solid rgba(0,112,186,0.25)",
        }}
      >
        <i className="bi bi-paypal" style={{ fontSize: 28, color: "#003087" }} />
        <div>
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--text-primary)" }}>
            PayPal {type === "deposit" ? "Checkout" : "Payout"}
          </div>
          <div className="text-muted text-xs">Secure · Global · Instant</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        <div className="form-group">
          <label className="form-label">Amount (USD)</label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                color: "var(--text-muted)", fontSize: "var(--font-size-sm)",
              }}
            >
              $
            </span>
            <input
              className={`form-input ${error.amount ? "form-input--error" : ""}`}
              style={{ paddingLeft: 28 }}
              type="number"
              placeholder="0.00"
              min="5"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {error.amount && <span className="form-error">{error.amount}</span>}
        </div>

        <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap" }}>
          {quickAmounts.map((a) => (
            <button
              key={a}
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => setAmount(String(a))}
            >
              ${a}
            </button>
          ))}
        </div>

        {type === "withdraw" && (
          <div className="form-group">
            <label className="form-label">PayPal Email</label>
            <input
              className={`form-input ${error.email ? "form-input--error" : ""}`}
              type="email"
              placeholder="you@paypal.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error.email && <span className="form-error">{error.email}</span>}
          </div>
        )}

        {type === "deposit" && amount && (
          <div
            style={{
              background: "var(--bg-base)", padding: "var(--space-sm) var(--space-md)",
              borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)",
            }}
          >
            <div className="flex justify-between">
              <span className="text-muted">Amount</span>
              <span>${parseFloat(amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between" style={{ marginTop: 4 }}>
              <span className="text-muted">Fee (2.5%)</span>
              <span className="text-danger">-${(parseFloat(amount || 0) * 0.025).toFixed(2)}</span>
            </div>
            <div className="divider" style={{ margin: "8px 0" }} />
            <div className="flex justify-between font-bold">
              <span>You receive</span>
              <span className="text-success">${(parseFloat(amount || 0) * 0.975).toFixed(2)}</span>
            </div>
          </div>
        )}

        <Button type="submit" variant="primary" full loading={loading}>
          <i className="bi bi-paypal" />
          {type === "deposit" ? "Pay with PayPal" : "Request Payout"}
        </Button>
      </form>
    </div>
  );
};

export default PaypalForm;
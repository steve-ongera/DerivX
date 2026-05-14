// src/components/wallet/MpesaForm.jsx
import React, { useState } from "react";
import Button from "../common/Button";

const MpesaForm = ({ type = "deposit", onSubmit, loading }) => {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState({});

  const validate = () => {
    const errs = {};
    if (!phone.match(/^(?:\+254|0|254)?[17]\d{8}$/))
      errs.phone = "Enter a valid Safaricom number (e.g. 0712345678)";
    if (!amount || isNaN(amount) || parseFloat(amount) < 10)
      errs.amount = "Minimum amount is KES 10";
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setError(errs); return; }
    setError({});
    onSubmit({ phone, amount: parseFloat(amount) });
  };

  const quickAmounts = [100, 500, 1000, 5000];

  return (
    <div>
      <div
        style={{
          display: "flex", alignItems: "center", gap: "var(--space-sm)",
          padding: "var(--space-md)", background: "rgba(34,197,94,0.08)",
          borderRadius: "var(--radius-md)", marginBottom: "var(--space-lg)",
          border: "1px solid rgba(34,197,94,0.2)",
        }}
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/200px-M-PESA_LOGO-01.svg.png"
          alt="M-Pesa" height={28}
          style={{ height: 28, width: "auto" }}
        />
        <div>
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--text-primary)" }}>
            M-Pesa {type === "deposit" ? "STK Push" : "B2C Transfer"}
          </div>
          <div className="text-muted text-xs">Instant · Safaricom Kenya</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        <div className="form-group">
          <label className="form-label">M-Pesa Phone Number</label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                color: "var(--text-muted)", fontSize: "var(--font-size-sm)", pointerEvents: "none",
              }}
            >
              +254
            </span>
            <input
              className={`form-input ${error.phone ? "form-input--error" : ""}`}
              style={{ paddingLeft: 48 }}
              type="tel"
              placeholder="712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {error.phone && <span className="form-error">{error.phone}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Amount (KES)</label>
          <input
            className={`form-input ${error.amount ? "form-input--error" : ""}`}
            type="number"
            placeholder="Enter amount"
            min="10"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
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
              KES {a.toLocaleString()}
            </button>
          ))}
        </div>

        {type === "deposit" && (
          <div
            className="text-xs text-muted"
            style={{
              background: "var(--bg-base)", padding: "var(--space-sm) var(--space-md)",
              borderRadius: "var(--radius-md)", lineHeight: 1.8,
            }}
          >
            <i className="bi bi-info-circle" style={{ marginRight: 4 }} />
            An STK push will be sent to your phone. Enter your M-Pesa PIN to confirm.
          </div>
        )}

        <Button type="submit" variant="success" full loading={loading}>
          <i className={`bi ${type === "deposit" ? "bi-phone" : "bi-send"}`} />
          {type === "deposit" ? "Send STK Push" : "Withdraw via M-Pesa"}
        </Button>
      </form>
    </div>
  );
};

export default MpesaForm;
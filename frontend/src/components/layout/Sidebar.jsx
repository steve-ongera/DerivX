// src/components/layout/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../App";

const NAV_ITEMS = [
  { to: "/",        icon: "bi-house-door",       label: "Home",    exact: true },
  { to: "/trade",   icon: "bi-lightning-charge",  label: "Trade"   },
  { to: "/markets", icon: "bi-grid-3x3-gap",      label: "Markets" },
  { to: "/robot",   icon: "bi-robot",             label: "Robots"  },
  { to: "/wallet",  icon: "bi-wallet2",           label: "Wallet"  },
  { to: "/profile", icon: "bi-person-circle",     label: "Profile" },
];

export default function Sidebar() {
  const { isAuthenticated } = useAuth();
  const items = isAuthenticated ? NAV_ITEMS : NAV_ITEMS.filter((n) => ["/", "/markets"].includes(n.to));

  return (
    <aside className="sidebar">
      <nav className="sidebar__nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) => `sidebar__link${isActive ? " active" : ""}`}
          >
            <i className={item.icon} style={{ fontSize: 19 }} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ marginTop: "auto", padding: "0 var(--space-sm) var(--space-md)" }}>
        <div className="sidebar__link" style={{ color: "var(--text-muted)", cursor: "default" }}>
          <i className="bi bi-shield-check" style={{ fontSize: 16, color: "var(--color-success)" }} />
          <span style={{ fontSize: 11 }}>Secure Platform</span>
        </div>
      </div>
    </aside>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// src/components/wallet/DepositModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import { mpesaAPI, paypalAPI, binanceAPI } from "../../utils/api";

const PAYMENT_METHODS = [
  { id: "mpesa",   label: "M-Pesa",       icon: "bi-phone",           color: "#00b300" },
  { id: "paypal",  label: "PayPal",       icon: "bi-paypal",          color: "#003087" },
  { id: "binance", label: "Binance Pay",  icon: "bi-currency-bitcoin", color: "#f0b90b" },
];

export function DepositModal({ onClose, onSuccess }) {
  const [method,   setMethod]   = useState("mpesa");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  // M-Pesa fields
  const [mpesaPhone,  setMpesaPhone]  = useState("");
  const [mpesaAmount, setMpesaAmount] = useState("");

  // PayPal fields
  const [ppAmount,   setPpAmount]   = useState("");
  const [ppCurrency, setPpCurrency] = useState("USD");

  // Binance fields
  const [bnCoin,   setBnCoin]   = useState("USDT");
  const [bnAmount, setBnAmount] = useState("");

  const handleSubmit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      if (method === "mpesa") {
        await mpesaAPI.deposit({ phone_number: mpesaPhone, amount: parseFloat(mpesaAmount) });
        setSuccess("STK Push sent! Enter your M-Pesa PIN on your phone.");

      } else if (method === "paypal") {
        const { data } = await paypalAPI.deposit({ amount: parseFloat(ppAmount), currency: ppCurrency });
        if (data.approve_url) {
          window.open(data.approve_url, "_blank");
          setSuccess("PayPal window opened. Complete payment there.");
        }

      } else if (method === "binance") {
        const { data } = await binanceAPI.deposit({ coin: bnCoin, amount: parseFloat(bnAmount) });
        if (data.checkout_url) {
          window.open(data.checkout_url, "_blank");
          setSuccess("Binance Pay opened. Complete payment there.");
        }
      }
      onSuccess?.();
    } catch (err) {
      const d = err.response?.data;
      setError(typeof d === "object" ? Object.values(d).flat().join(" ") : "Deposit failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span className="modal__title">
            <i className="bi bi-arrow-down-circle-fill text-success" /> Deposit Funds
          </span>
          <button className="modal__close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        {/* Payment method selector */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 20 }}>
          {PAYMENT_METHODS.map((pm) => (
            <button
              key={pm.id}
              onClick={() => setMethod(pm.id)}
              style={{
                padding: "12px 8px",
                borderRadius: "var(--radius-md)",
                border: `2px solid ${method === pm.id ? pm.color : "var(--border-color)"}`,
                background: method === pm.id ? `${pm.color}15` : "var(--bg-base)",
                color: method === pm.id ? pm.color : "var(--text-secondary)",
                cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
                transition: "all var(--transition-fast)",
              }}
            >
              <i className={pm.icon} style={{ fontSize: 22 }} />
              {pm.label}
            </button>
          ))}
        </div>

        {/* M-Pesa form */}
        {method === "mpesa" && (
          <div className="flex flex-col gap-md">
            <div className="form-group">
              <label className="form-label">Phone Number (254XXXXXXXXX)</label>
              <input className="form-input" placeholder="254712345678" value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (KES)</label>
              <input className="form-input" type="number" placeholder="100" value={mpesaAmount}
                onChange={(e) => setMpesaAmount(e.target.value)} min="10" />
            </div>
          </div>
        )}

        {/* PayPal form */}
        {method === "paypal" && (
          <div className="flex flex-col gap-md">
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input className="form-input" type="number" placeholder="10.00" value={ppAmount}
                onChange={(e) => setPpAmount(e.target.value)} min="5" step="0.01" />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-select" value={ppCurrency} onChange={(e) => setPpCurrency(e.target.value)}>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
              </select>
            </div>
          </div>
        )}

        {/* Binance form */}
        {method === "binance" && (
          <div className="flex flex-col gap-md">
            <div className="form-group">
              <label className="form-label">Coin</label>
              <select className="form-select" value={bnCoin} onChange={(e) => setBnCoin(e.target.value)}>
                <option value="USDT">USDT — Tether</option>
                <option value="BTC">BTC — Bitcoin</option>
                <option value="ETH">ETH — Ethereum</option>
                <option value="BNB">BNB — BNB Coin</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input className="form-input" type="number" placeholder="10" value={bnAmount}
                onChange={(e) => setBnAmount(e.target.value)} min="1" step="0.01" />
            </div>
          </div>
        )}

        {error   && <div className="badge badge--danger w-full mt-md" style={{ padding: "8px 12px", justifyContent: "flex-start" }}><i className="bi bi-exclamation-triangle" /> {error}</div>}
        {success && <div className="badge badge--success w-full mt-md" style={{ padding: "8px 12px", justifyContent: "flex-start" }}><i className="bi bi-check-circle" /> {success}</div>}

        <div className="flex gap-sm mt-lg">
          <button className="btn btn--outline btn--full" onClick={onClose}>Cancel</button>
          <button className="btn btn--success btn--full" onClick={handleSubmit} disabled={loading}>
            {loading ? <><i className="bi bi-arrow-repeat spin" /> Processing…</> : <><i className="bi bi-arrow-down-circle" /> Deposit</>}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// src/components/wallet/WithdrawModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
export function WithdrawModal({ onClose, onSuccess, wallets = [] }) {
  const [method,     setMethod]     = useState("mpesa");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaAmt,   setMpesaAmt]   = useState("");
  const [ppEmail,    setPpEmail]    = useState("");
  const [ppAmt,      setPpAmt]      = useState("");
  const [ppCurrency, setPpCurrency] = useState("USD");
  const [bnCoin,     setBnCoin]     = useState("USDT");
  const [bnNetwork,  setBnNetwork]  = useState("TRC20");
  const [bnAddress,  setBnAddress]  = useState("");
  const [bnAmt,      setBnAmt]      = useState("");

  const handleSubmit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      if (method === "mpesa") {
        await mpesaAPI.withdraw({ phone_number: mpesaPhone, amount: parseFloat(mpesaAmt) });
        setSuccess("Withdrawal initiated. Funds will arrive via M-Pesa shortly.");
      } else if (method === "paypal") {
        await paypalAPI.withdraw({ paypal_email: ppEmail, amount: parseFloat(ppAmt), currency: ppCurrency });
        setSuccess("PayPal withdrawal initiated.");
      } else if (method === "binance") {
        await binanceAPI.withdraw({ coin: bnCoin, network: bnNetwork, wallet_address: bnAddress, amount: parseFloat(bnAmt) });
        setSuccess("Crypto withdrawal submitted to the blockchain.");
      }
      onSuccess?.();
    } catch (err) {
      const d = err.response?.data;
      setError(typeof d === "object" ? Object.values(d).flat().join(" ") : "Withdrawal failed.");
    } finally {
      setLoading(false);
    }
  };

  const NETWORKS = { USDT: ["TRC20", "ERC20", "BSC"], BTC: ["BTC"], ETH: ["ERC20"], BNB: ["BSC"] };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span className="modal__title"><i className="bi bi-arrow-up-circle-fill text-warning" /> Withdraw Funds</span>
          <button className="modal__close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 20 }}>
          {PAYMENT_METHODS.map((pm) => (
            <button key={pm.id} onClick={() => setMethod(pm.id)} style={{
              padding: "12px 8px", borderRadius: "var(--radius-md)",
              border: `2px solid ${method === pm.id ? pm.color : "var(--border-color)"}`,
              background: method === pm.id ? `${pm.color}15` : "var(--bg-base)",
              color: method === pm.id ? pm.color : "var(--text-secondary)",
              cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
              transition: "all var(--transition-fast)",
            }}>
              <i className={pm.icon} style={{ fontSize: 22 }} />{pm.label}
            </button>
          ))}
        </div>

        {method === "mpesa" && (
          <div className="flex flex-col gap-md">
            <div className="form-group">
              <label className="form-label">Phone Number (254XXXXXXXXX)</label>
              <input className="form-input" placeholder="254712345678" value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (KES, min 50)</label>
              <input className="form-input" type="number" placeholder="100" value={mpesaAmt} onChange={(e) => setMpesaAmt(e.target.value)} min="50" />
            </div>
          </div>
        )}

        {method === "paypal" && (
          <div className="flex flex-col gap-md">
            <div className="form-group">
              <label className="form-label">PayPal Email</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={ppEmail} onChange={(e) => setPpEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input className="form-input" type="number" placeholder="10.00" value={ppAmt} onChange={(e) => setPpAmt(e.target.value)} min="5" step="0.01" />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-select" value={ppCurrency} onChange={(e) => setPpCurrency(e.target.value)}>
                <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
          </div>
        )}

        {method === "binance" && (
          <div className="flex flex-col gap-md">
            <div className="form-group">
              <label className="form-label">Coin</label>
              <select className="form-select" value={bnCoin} onChange={(e) => { setBnCoin(e.target.value); setBnNetwork(NETWORKS[e.target.value][0]); }}>
                <option value="USDT">USDT</option><option value="BTC">BTC</option>
                <option value="ETH">ETH</option><option value="BNB">BNB</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Network</label>
              <select className="form-select" value={bnNetwork} onChange={(e) => setBnNetwork(e.target.value)}>
                {(NETWORKS[bnCoin] || []).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Wallet Address</label>
              <input className="form-input" placeholder="Enter wallet address" value={bnAddress} onChange={(e) => setBnAddress(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input className="form-input" type="number" placeholder="5" value={bnAmt} onChange={(e) => setBnAmt(e.target.value)} min="5" step="0.01" />
            </div>
          </div>
        )}

        {error   && <div className="badge badge--danger w-full mt-md" style={{ padding: "8px 12px", justifyContent: "flex-start" }}><i className="bi bi-exclamation-triangle" /> {error}</div>}
        {success && <div className="badge badge--success w-full mt-md" style={{ padding: "8px 12px", justifyContent: "flex-start" }}><i className="bi bi-check-circle" /> {success}</div>}

        <div className="flex gap-sm mt-lg">
          <button className="btn btn--outline btn--full" onClick={onClose}>Cancel</button>
          <button className="btn btn--danger btn--full" onClick={handleSubmit} disabled={loading}>
            {loading ? <><i className="bi bi-arrow-repeat spin" /> Processing…</> : <><i className="bi bi-arrow-up-circle" /> Withdraw</>}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// src/components/common/Toast.jsx
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, createContext, useContext } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = "info", duration = 4000 }) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const ICONS = { success: "bi-check-circle-fill", error: "bi-x-circle-fill", warning: "bi-exclamation-triangle-fill", info: "bi-info-circle-fill" };
  const COLORS = { success: "var(--color-success)", error: "var(--color-danger)", warning: "var(--color-warning)", info: "var(--color-primary-light)" };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            <i className={ICONS[t.type] || ICONS.info} style={{ color: COLORS[t.type], fontSize: 18, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{t.message}</span>
            <button onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
              <i className="bi bi-x" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() { return useContext(ToastContext); }
// src/components/wallet/DepositModal.jsx
import React, { useState } from "react";
import Modal from "../common/Modal";
import MpesaForm from "./MpesaForm";
import PaypalForm from "./PaypalForm";
import BinanceForm from "./BinanceForm";
import { useToast } from "../common/Toast";
import api from "../../utils/api";

const METHODS = [
  { id: "mpesa",   label: "M-Pesa",  icon: "bi-phone-fill",       color: "#22c55e" },
  { id: "paypal",  label: "PayPal",  icon: "bi-paypal",           color: "#003087" },
  { id: "binance", label: "Crypto",  icon: "bi-currency-bitcoin", color: "#F0B90B" },
];

const DepositModal = ({ isOpen, onClose, onSuccess }) => {
  const [method, setMethod] = useState("mpesa");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post(`/payments/${method}/deposit/`, data);
      toast.success("Deposit initiated successfully!");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Deposit failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Deposit Funds">
      <div
        style={{
          display: "flex",
          gap: "var(--space-xs)",
          marginBottom: "var(--space-lg)",
          background: "var(--bg-base)",
          padding: 4,
          borderRadius: "var(--radius-md)",
        }}
      >
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMethod(m.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "10px 8px",
              borderRadius: "var(--radius-sm)",
              background: method === m.id ? "var(--bg-elevated)" : "transparent",
              border: method === m.id ? `1px solid ${m.color}` : "1px solid transparent",
              color: method === m.id ? m.color : "var(--text-muted)",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
              fontSize: "var(--font-size-xs)",
              fontWeight: 700,
            }}
          >
            <i className={`bi ${m.icon}`} style={{ fontSize: 20 }} />
            {m.label}
          </button>
        ))}
      </div>

      {method === "mpesa"   && <MpesaForm   type="deposit" onSubmit={handleSubmit} loading={loading} />}
      {method === "paypal"  && <PaypalForm  type="deposit" onSubmit={handleSubmit} loading={loading} />}
      {method === "binance" && <BinanceForm type="deposit" onSubmit={handleSubmit} loading={loading} />}
    </Modal>
  );
};

export default DepositModal;
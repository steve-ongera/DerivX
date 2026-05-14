// src/components/common/Toast.jsx
import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ message, type = "info", duration = 4000 }) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
      return id;
    },
    [removeToast]
  );

  const toast = {
    success: (msg, opts) => addToast({ message: msg, type: "success", ...opts }),
    error:   (msg, opts) => addToast({ message: msg, type: "error",   ...opts }),
    warning: (msg, opts) => addToast({ message: msg, type: "warning", ...opts }),
    info:    (msg, opts) => addToast({ message: msg, type: "info",    ...opts }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ICONS = {
  success: "bi-check-circle-fill",
  error:   "bi-x-circle-fill",
  warning: "bi-exclamation-triangle-fill",
  info:    "bi-info-circle-fill",
};

const COLORS = {
  success: "var(--color-success)",
  error:   "var(--color-danger)",
  warning: "var(--color-warning)",
  info:    "var(--color-primary-light)",
};

const ToastItem = ({ toast, onClose }) => (
  <div className={`toast toast--${toast.type}`}>
    <i
      className={`bi ${ICONS[toast.type]}`}
      style={{ color: COLORS[toast.type], fontSize: "18px", flexShrink: 0 }}
    />
    <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: "var(--text-primary)" }}>
      {toast.message}
    </span>
    <button
      onClick={onClose}
      style={{
        background: "none",
        border: "none",
        color: "var(--text-muted)",
        cursor: "pointer",
        padding: "2px",
        lineHeight: 1,
      }}
    >
      <i className="bi bi-x" style={{ fontSize: "16px" }} />
    </button>
  </div>
);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

export default ToastProvider;
// src/components/wallet/TransactionTable.jsx
import React, { useState } from "react";
import Badge from "../common/Badge";
import Spinner from "../common/Spinner";

const METHOD_ICONS = {
  mpesa:   { icon: "bi-phone-fill",       color: "#22c55e" },
  paypal:  { icon: "bi-paypal",           color: "#003087" },
  binance: { icon: "bi-currency-bitcoin", color: "#F0B90B" },
  system:  { icon: "bi-gear-fill",        color: "var(--color-primary)" },
};

const STATUS_VARIANT = {
  completed: "success",
  pending:   "warning",
  failed:    "danger",
  cancelled: "muted",
};

const FILTER_OPTIONS = ["all", "deposit", "withdrawal"];

const TransactionTable = ({ transactions = [], loading }) => {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = transactions.filter((t) => {
    const matchType = filter === "all" || t.type === filter;
    const matchSearch =
      !search ||
      t.reference?.toLowerCase().includes(search.toLowerCase()) ||
      t.method?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div
        className="card__header"
        style={{ padding: "var(--space-md) var(--space-lg)", margin: 0, borderBottom: "1px solid var(--border-color)" }}
      >
        <span className="card__title">Transaction History</span>
        <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
          {/* Filter tabs */}
          <div
            style={{
              display: "flex", background: "var(--bg-base)",
              borderRadius: "var(--radius-md)", padding: 2, gap: 2,
            }}
          >
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                style={{
                  padding: "4px 12px", borderRadius: "var(--radius-sm)",
                  background: filter === f ? "var(--bg-elevated)" : "transparent",
                  border: "none", color: filter === f ? "var(--text-primary)" : "var(--text-muted)",
                  cursor: "pointer", fontSize: "var(--font-size-xs)", fontWeight: 600,
                  textTransform: "capitalize",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <i
              className="bi bi-search"
              style={{
                position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                color: "var(--text-muted)", fontSize: 12,
              }}
            />
            <input
              className="form-input"
              style={{ paddingLeft: 28, width: 160, fontSize: "var(--font-size-xs)", height: 32 }}
              placeholder="Search ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Spinner center />
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center", padding: "var(--space-2xl)",
            color: "var(--text-muted)", fontSize: "var(--font-size-sm)",
          }}
        >
          <i className="bi bi-inbox" style={{ fontSize: 40, display: "block", marginBottom: 8 }} />
          No transactions found
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => {
                const m = METHOD_ICONS[tx.method] || METHOD_ICONS.system;
                return (
                  <tr key={tx.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <i className={`bi ${m.icon}`} style={{ color: m.color, fontSize: 16 }} />
                        <span style={{ textTransform: "capitalize" }}>{tx.method || "System"}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          textTransform: "capitalize",
                          color: tx.type === "deposit" ? "var(--color-success)" : "var(--color-danger)",
                          fontWeight: 600,
                        }}
                      >
                        {tx.type === "deposit" ? "+" : "-"} {tx.type}
                      </span>
                    </td>
                    <td>
                      <span
                        className="text-mono font-bold"
                        style={{ color: tx.type === "deposit" ? "var(--color-success)" : "var(--color-danger)" }}
                      >
                        {tx.type === "deposit" ? "+" : "-"}
                        {tx.currency} {parseFloat(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td>
                      <span
                        className="text-mono"
                        style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}
                      >
                        {tx.reference || "—"}
                      </span>
                    </td>
                    <td>
                      <Badge variant={STATUS_VARIANT[tx.status] || "muted"}>
                        {tx.status}
                      </Badge>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)" }}>
                      {tx.created_at
                        ? new Date(tx.created_at).toLocaleString("en-GB", {
                            day: "2-digit", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TransactionTable;
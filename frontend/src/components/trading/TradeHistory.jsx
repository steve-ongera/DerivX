export function TradeHistory({ trades = [] }) {
  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">
          <i className="bi bi-clock-history" /> Trade History
        </span>
      </div>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Contract</th>
              <th>Market</th>
              <th>Type</th>
              <th>Stake</th>
              <th>P/L</th>
              <th>Result</th>
              <th>Closed</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--text-muted)" }}>
                  No trade history yet
                </td>
              </tr>
            )}
            {trades.map((t) => (
              <tr key={t.id}>
                <td><span className="text-mono text-xs">{t.contract_id}</span></td>
                <td className="font-bold" style={{ color: "var(--text-primary)" }}>{t.market_name}</td>
                <td><span className="badge badge--muted">{t.trade_type_name}</span></td>
                <td className="text-mono">${parseFloat(t.stake).toFixed(2)}</td>
                <td className={`text-mono font-bold ${parseFloat(t.profit_loss) >= 0 ? "text-success" : "text-danger"}`}>
                  {parseFloat(t.profit_loss) >= 0 ? "+" : ""}${parseFloat(t.profit_loss).toFixed(2)}
                </td>
                <td>
                  <span className={`badge ${
                    t.status === "won"  ? "badge--success" :
                    t.status === "lost" ? "badge--danger"  :
                    "badge--muted"
                  }`}>
                    {t.status === "won"  && <i className="bi bi-check-circle-fill" />}
                    {t.status === "lost" && <i className="bi bi-x-circle-fill" />}
                    {" "}{t.status}
                  </span>
                </td>
                <td className="text-xs text-muted">
                  {t.close_time ? new Date(t.close_time).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
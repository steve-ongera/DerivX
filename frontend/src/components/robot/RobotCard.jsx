
// ─────────────────────────────────────────────────────────────────────────────
// src/components/robot/RobotCard.jsx
// ─────────────────────────────────────────────────────────────────────────────
export function RobotCard({ robot, onStart, onStop, onEdit, onDelete, onViewLogs }) {
  const statusColors = {
    active:  "var(--color-success)",
    stopped: "var(--text-muted)",
    error:   "var(--color-danger)",
    paused:  "var(--color-warning)",
  };
  const statusColor = statusColors[robot.status] || "var(--text-muted)";
  const isRunning   = robot.status === "active";
  const profit      = parseFloat(robot.session_profit || 0);

  return (
    <div className={`robot-card ${isRunning ? "running" : robot.status === "error" ? "error" : ""}`}>
      <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
        <div>
          <div className="font-bold" style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="bi bi-robot" style={{ color: "var(--color-primary)" }} />
            {robot.name}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 2 }}>
            {robot.market?.name} · {robot.trade_type?.display_name}
          </div>
        </div>
        <span className="badge" style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}30` }}>
          {isRunning && <span className="live-dot" style={{ marginRight: 4, width: 6, height: 6 }} />}
          {robot.status}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { label: "Trades",   value: robot.total_trades },
          { label: "Win Rate", value: `${robot.win_rate || 0}%` },
          { label: "Session",  value: `${profit >= 0 ? "+" : ""}$${profit.toFixed(2)}`, color: profit >= 0 ? "var(--color-success)" : "var(--color-danger)" },
          { label: "Strategy", value: robot.strategy?.replace("_", " ") },
        ].map((s) => (
          <div key={s.label} style={{ background: "var(--bg-base)", borderRadius: "var(--radius-sm)", padding: "8px 10px" }}>
            <div className="text-xs text-muted">{s.label}</div>
            <div className="font-bold text-mono" style={{ fontSize: 13, color: s.color || "var(--text-primary)", marginTop: 2 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-sm">
        {isRunning ? (
          <button className="btn btn--danger btn--sm" onClick={() => onStop(robot)}>
            <i className="bi bi-stop-circle-fill" /> Stop
          </button>
        ) : (
          <button className="btn btn--success btn--sm" onClick={() => onStart(robot)}>
            <i className="bi bi-play-circle-fill" /> Start
          </button>
        )}
        <button className="btn btn--outline btn--sm" onClick={() => onViewLogs(robot)}>
          <i className="bi bi-terminal" /> Logs
        </button>
        <button className="btn btn--ghost btn--sm" onClick={() => onEdit(robot)} disabled={isRunning}>
          <i className="bi bi-pencil" />
        </button>
        <button className="btn btn--ghost btn--sm" onClick={() => onDelete(robot)} disabled={isRunning}
          style={{ color: "var(--color-danger)", marginLeft: "auto" }}>
          <i className="bi bi-trash" />
        </button>
      </div>
    </div>
  );
}
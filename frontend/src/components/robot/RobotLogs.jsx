// src/components/robot/RobotLogs.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { robotsAPI } from "../../utils/api";
import Spinner from "../common/Spinner";

const LOG_COLORS = {
  info:    "var(--text-secondary)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error:   "var(--color-danger)",
  trade:   "var(--color-accent)",
  system:  "var(--color-primary-light)",
};

const LOG_ICONS = {
  info:    "bi-info-circle",
  success: "bi-check-circle",
  warning: "bi-exclamation-triangle",
  error:   "bi-x-circle",
  trade:   "bi-graph-up-arrow",
  system:  "bi-cpu",
};

const LOG_LEVEL_OPTIONS = ["all", "trade", "success", "warning", "error", "info", "system"];

/**
 * RobotLogs
 *
 * Props:
 *   robot         — robot object (needs robot.id and robot.status)
 *   embedded      — if true renders as a plain panel without its own card wrapper
 *   maxHeight     — css value for log body height (default "320px")
 *   pollInterval  — ms between polling when robot is active (default 3000)
 */
const RobotLogs = ({
  robot,
  embedded = false,
  maxHeight = "320px",
  pollInterval = 3000,
}) => {
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter,     setFilter]     = useState("all");
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(false);

  const logBodyRef = useRef(null);
  const pollRef    = useRef(null);
  const PAGE_SIZE  = 50;

  const isRunning = robot?.status === "active";

  // ── Fetch logs ─────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(
    async (reset = false) => {
      if (!robot?.id) return;
      try {
        const params = { page_size: PAGE_SIZE, page: reset ? 1 : page };
        if (filter !== "all") params.level = filter;
        const res = await robotsAPI.getLogs(robot.id, params);
        const data = res.data;
        const entries = data.results || data;
        if (reset) {
          setLogs(entries);
          setPage(1);
        } else {
          setLogs((prev) => [...prev, ...entries]);
        }
        setHasMore(!!data.next);
      } catch {
        /* silently fail on poll */
      } finally {
        setLoading(false);
      }
    },
    [robot?.id, filter, page]
  );

  // Initial load + filter change
  useEffect(() => {
    setLoading(true);
    setLogs([]);
    fetchLogs(true);
  }, [robot?.id, filter]);

  // Polling while running
  useEffect(() => {
    if (!isRunning) { clearInterval(pollRef.current); return; }
    pollRef.current = setInterval(() => fetchLogs(true), pollInterval);
    return () => clearInterval(pollRef.current);
  }, [isRunning, fetchLogs, pollInterval]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logBodyRef.current) {
      logBodyRef.current.scrollTop = logBodyRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (!logBodyRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logBodyRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchLogs(false);
  };

  const clearView = () => setLogs([]);

  // ── Filtered display ────────────────────────────────────────────────────────
  const displayed = logs.filter((log) => {
    if (!search) return true;
    return (log.message || "").toLowerCase().includes(search.toLowerCase());
  });

  // ── Render log entry ────────────────────────────────────────────────────────
  const LogEntry = ({ log }) => {
    const level  = log.level || "info";
    const color  = LOG_COLORS[level] || LOG_COLORS.info;
    const icon   = LOG_ICONS[level]  || "bi-dot";
    const ts     = log.timestamp
      ? new Date(log.timestamp).toLocaleTimeString("en-GB", { hour12: false })
      : "--:--:--";

    return (
      <div
        className="robot-log__entry"
        style={{
          padding: "3px 0",
          borderBottom: "1px solid rgba(255,255,255,0.03)",
        }}
      >
        <span className="robot-log__time" style={{ minWidth: 60, fontSize: 11 }}>
          {ts}
        </span>
        <i className={`bi ${icon}`} style={{ color, fontSize: 11, flexShrink: 0, marginTop: 1 }} />
        <span className={`robot-log__msg ${level}`} style={{ color, wordBreak: "break-word" }}>
          {log.message}
        </span>
        {log.trade_result && (
          <span
            className="badge"
            style={{
              marginLeft: "auto", flexShrink: 0,
              background: log.trade_result === "win" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              color: log.trade_result === "win" ? "var(--color-success)" : "var(--color-danger)",
              fontSize: 10,
            }}
          >
            {log.trade_result === "win" ? "+" : "−"}
            {log.trade_result === "win" ? log.profit : log.loss}
          </span>
        )}
      </div>
    );
  };

  // ── Panel body ──────────────────────────────────────────────────────────────
  const panel = (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "var(--space-sm) var(--space-md)",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-base)",
          flexWrap: "wrap",
        }}
      >
        {/* Level filter chips */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {LOG_LEVEL_OPTIONS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              style={{
                padding: "2px 10px", borderRadius: "var(--radius-full)",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
                border: `1px solid ${filter === lvl ? LOG_COLORS[lvl] || "var(--color-primary)" : "var(--border-color)"}`,
                background: filter === lvl ? `${LOG_COLORS[lvl] || "var(--color-primary)"}18` : "transparent",
                color: filter === lvl ? LOG_COLORS[lvl] || "var(--color-primary-light)" : "var(--text-muted)",
                textTransform: "capitalize",
              }}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginLeft: "auto" }}>
          <i
            className="bi bi-search"
            style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 11 }}
          />
          <input
            className="form-input"
            style={{ paddingLeft: 26, height: 28, width: 150, fontSize: 12 }}
            placeholder="Search logs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Auto-scroll toggle */}
        <button
          onClick={() => setAutoScroll((v) => !v)}
          className={`btn btn--sm ${autoScroll ? "btn--primary" : "btn--outline"}`}
          title="Toggle auto-scroll"
          style={{ padding: "2px 8px", fontSize: 11 }}
        >
          <i className="bi bi-arrow-down-circle" />
        </button>

        {/* Clear */}
        <button
          onClick={clearView}
          className="btn btn--ghost btn--sm"
          title="Clear view"
          style={{ padding: "2px 6px", fontSize: 11 }}
        >
          <i className="bi bi-trash" />
        </button>
      </div>

      {/* Log body */}
      <div
        ref={logBodyRef}
        onScroll={handleScroll}
        className="robot-log"
        style={{ height: maxHeight, maxHeight }}
      >
        {loading ? (
          <Spinner center size="md" color="primary" />
        ) : displayed.length === 0 ? (
          <div
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              color: "var(--text-muted)", gap: 8,
            }}
          >
            <i className="bi bi-terminal" style={{ fontSize: 28 }} />
            <span style={{ fontSize: 12 }}>No log entries yet</span>
            {isRunning && (
              <span style={{ fontSize: 11 }}>
                <span className="live-dot" style={{ width: 6, height: 6, display: "inline-block", marginRight: 4 }} />
                Waiting for activity…
              </span>
            )}
          </div>
        ) : (
          <>
            {hasMore && (
              <button
                onClick={loadMore}
                className="btn btn--ghost btn--sm w-full"
                style={{ fontSize: 11, marginBottom: 4 }}
              >
                <i className="bi bi-arrow-up" /> Load older
              </button>
            )}
            {displayed.map((log, i) => (
              <LogEntry key={log.id || i} log={log} />
            ))}
            {isRunning && (
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 0", color: "var(--text-muted)", fontSize: 11,
                }}
              >
                <span className="live-dot" style={{ width: 6, height: 6 }} />
                Live — polling every {pollInterval / 1000}s
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer stats */}
      <div
        style={{
          padding: "6px var(--space-md)",
          borderTop: "1px solid var(--border-color)",
          display: "flex", justifyContent: "space-between",
          fontSize: 11, color: "var(--text-muted)",
        }}
      >
        <span>{displayed.length} entries{search ? " (filtered)" : ""}</span>
        <span>{robot?.name}</span>
      </div>
    </div>
  );

  if (embedded) return panel;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        className="card__header"
        style={{ padding: "var(--space-md) var(--space-lg)", margin: 0 }}
      >
        <span className="card__title">
          <i className="bi bi-terminal" style={{ color: "var(--color-accent)", marginRight: 8 }} />
          Robot Logs
        </span>
        <span
          className="badge"
          style={{
            background: isRunning ? "rgba(34,197,94,0.12)" : "var(--bg-elevated)",
            color: isRunning ? "var(--color-success)" : "var(--text-muted)",
          }}
        >
          {isRunning
            ? <><span className="live-dot" style={{ width: 6, height: 6, marginRight: 4 }} />Live</>
            : "Stopped"}
        </span>
      </div>
      {panel}
    </div>
  );
};

export default RobotLogs;
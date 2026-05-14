// src/components/robot/RobotList.jsx
import React, { useState, useEffect, useCallback } from "react";
import { robotsAPI } from "../../utils/api";
import { RobotCard } from "./RobotCard";
import RobotControls from "./RobotControls";
import RobotLogs from "./RobotLogs";
import RobotBuilder from "./RobotBuilder";
import Modal from "../common/Modal";
import Spinner from "../common/Spinner";
import { useToast } from "../common/Toast";

const SORT_OPTIONS = [
  { value: "created_at", label: "Newest" },
  { value: "name",       label: "Name" },
  { value: "status",     label: "Status" },
  { value: "win_rate",   label: "Win Rate" },
];

const RobotList = () => {
  const [robots,       setRobots]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [sortBy,       setSortBy]       = useState("created_at");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modal states
  const [builderOpen,  setBuilderOpen]  = useState(false);
  const [editingRobot, setEditingRobot] = useState(null);   // robot being edited
  const [logsRobot,    setLogsRobot]    = useState(null);   // robot whose logs are shown
  const [deleteTarget, setDeleteTarget] = useState(null);   // robot pending delete confirm

  const toast = useToast();

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchRobots = useCallback(async () => {
    try {
      const res = await robotsAPI.getAll({ ordering: `-${sortBy}`, page_size: 100 });
      setRobots(res.data.results || res.data);
    } catch {
      toast.error("Failed to load robots.");
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => { fetchRobots(); }, [fetchRobots]);

  // ── Live status poll for running robots ──────────────────────────────────
  useEffect(() => {
    const hasRunning = robots.some((r) => r.status === "active");
    if (!hasRunning) return;
    const id = setInterval(fetchRobots, 5000);
    return () => clearInterval(id);
  }, [robots, fetchRobots]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleStatusChange = (updated) => {
    setRobots((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleSaved = (robot) => {
    setRobots((prev) => {
      const exists = prev.find((r) => r.id === robot.id);
      return exists
        ? prev.map((r) => (r.id === robot.id ? robot : r))
        : [robot, ...prev];
    });
    setBuilderOpen(false);
    setEditingRobot(null);
    toast.success(`Robot "${robot.name}" saved!`);
  };

  const handleDeleted = (robot) => {
    setRobots((prev) => prev.filter((r) => r.id !== robot.id));
    setDeleteTarget(null);
    toast.success(`Robot "${robot.name}" deleted.`);
  };

  const handleStart = async (robot) => {
    try {
      const res = await robotsAPI.start(robot.id);
      handleStatusChange(res.data);
      toast.success(`Robot "${robot.name}" started.`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to start robot.");
    }
  };

  const handleStop = async (robot) => {
    try {
      const res = await robotsAPI.stop(robot.id);
      handleStatusChange(res.data);
      toast.success(`Robot "${robot.name}" stopped.`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to stop robot.");
    }
  };

  const handleDelete = async (robot) => {
    try {
      await robotsAPI.delete(robot.id);
      handleDeleted(robot);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete robot.");
    }
  };

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const displayed = robots
    .filter((r) => {
      const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || r.status === filterStatus;
      return matchSearch && matchStatus;
    });

  const summary = {
    total:   robots.length,
    running: robots.filter((r) => r.status === "active").length,
    stopped: robots.filter((r) => r.status === "stopped").length,
    error:   robots.filter((r) => r.status === "error").length,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center" style={{ marginBottom: "var(--space-lg)", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 className="card__title" style={{ fontSize: "var(--font-size-lg)" }}>
            <i className="bi bi-robot" style={{ color: "var(--color-primary)", marginRight: 8 }} />
            My Robots
          </h2>
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>
            {summary.total} total · {summary.running} running · {summary.error} errors
          </div>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => { setEditingRobot(null); setBuilderOpen(true); }}
        >
          <i className="bi bi-plus-lg" /> New Robot
        </button>
      </div>

      {/* ── Summary stat chips ───────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: "var(--space-md)", flexWrap: "wrap" }}>
        {[
          { label: "All",     value: "all",     count: summary.total,   color: "var(--color-primary-light)" },
          { label: "Running", value: "active",  count: summary.running, color: "var(--color-success)" },
          { label: "Stopped", value: "stopped", count: summary.stopped, color: "var(--text-muted)" },
          { label: "Error",   value: "error",   count: summary.error,   color: "var(--color-danger)" },
        ].map((chip) => (
          <button
            key={chip.value}
            onClick={() => setFilterStatus(chip.value)}
            style={{
              padding: "4px 14px", borderRadius: "var(--radius-full)",
              border: `1px solid ${filterStatus === chip.value ? chip.color : "var(--border-color)"}`,
              background: filterStatus === chip.value ? `${chip.color}15` : "transparent",
              color: filterStatus === chip.value ? chip.color : "var(--text-muted)",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
          >
            {chip.label}
            {chip.count > 0 && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>{chip.count}</span>
            )}
          </button>
        ))}

        {/* Sort + Search — pushed right */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <select
            className="form-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ height: 32, fontSize: 12, padding: "0 10px" }}
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div style={{ position: "relative" }}>
            <i
              className="bi bi-search"
              style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 12 }}
            />
            <input
              className="form-input"
              style={{ paddingLeft: 28, height: 32, width: 160, fontSize: 12 }}
              placeholder="Search robots…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── List ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <Spinner center size="lg" color="primary" />
      ) : displayed.length === 0 ? (
        <div
          style={{
            textAlign: "center", padding: "var(--space-2xl)",
            color: "var(--text-muted)", borderRadius: "var(--radius-lg)",
            border: "2px dashed var(--border-color)",
          }}
        >
          <i className="bi bi-robot" style={{ fontSize: 48, display: "block", marginBottom: 12, opacity: 0.3 }} />
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            {search || filterStatus !== "all" ? "No robots match your filters" : "No robots yet"}
          </p>
          <p className="text-xs text-muted" style={{ marginBottom: 16 }}>
            {search || filterStatus !== "all"
              ? "Try clearing your search or changing the filter"
              : "Build your first trading robot to get started"}
          </p>
          {!search && filterStatus === "all" && (
            <button
              className="btn btn--primary"
              onClick={() => { setEditingRobot(null); setBuilderOpen(true); }}
            >
              <i className="bi bi-plus-lg" /> Create Robot
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "var(--space-md)",
          }}
        >
          {displayed.map((robot) => (
            <RobotCard
              key={robot.id}
              robot={robot}
              onStart={handleStart}
              onStop={handleStop}
              onEdit={(r) => { setEditingRobot(r); setBuilderOpen(true); }}
              onDelete={(r) => setDeleteTarget(r)}
              onViewLogs={(r) => setLogsRobot(r)}
            />
          ))}
        </div>
      )}

      {/* ── Builder Modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={builderOpen}
        onClose={() => { setBuilderOpen(false); setEditingRobot(null); }}
        title={editingRobot ? `Edit: ${editingRobot.name}` : "Build New Robot"}
        maxWidth="660px"
      >
        <RobotBuilder
          existing={editingRobot}
          onSave={handleSaved}
          onCancel={() => { setBuilderOpen(false); setEditingRobot(null); }}
        />
      </Modal>

      {/* ── Logs Modal ────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!logsRobot}
        onClose={() => setLogsRobot(null)}
        title={logsRobot ? `Logs — ${logsRobot.name}` : "Logs"}
        maxWidth="700px"
      >
        {logsRobot && (
          <RobotLogs robot={logsRobot} embedded maxHeight="420px" />
        )}
      </Modal>

      {/* ── Delete Confirm Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Robot"
        maxWidth="400px"
      >
        {deleteTarget && (
          <div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: "var(--space-lg)", lineHeight: 1.7 }}>
              Are you sure you want to delete{" "}
              <strong style={{ color: "var(--text-primary)" }}>"{deleteTarget.name}"</strong>?
              This will also remove all its logs and cannot be undone.
            </p>
            <div className="flex gap-sm justify-between">
              <button className="btn btn--outline" onClick={() => setDeleteTarget(null)}>
                <i className="bi bi-x" /> Cancel
              </button>
              <button
                className="btn btn--danger"
                onClick={() => handleDelete(deleteTarget)}
              >
                <i className="bi bi-trash" /> Delete Robot
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RobotList;
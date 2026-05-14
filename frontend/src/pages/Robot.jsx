// ═══════════════════════════════════════════════════════════════
// src/pages/Robot.jsx  — Robot trading management page
// ═══════════════════════════════════════════════════════════════
import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import RobotBuilder from "../components/robot/RobotBuilder";
import RobotCard from "../components/robot/RobotCard";
import { robotsAPI } from "../utils/api";
import { wsManager } from "../utils/websocket";

export default function Robot() {
  const [robots,       setRobots]       = useState([]);
  const [showBuilder,  setShowBuilder]  = useState(false);
  const [editingRobot, setEditingRobot] = useState(null);
  const [logsRobot,    setLogsRobot]    = useState(null);
  const [logs,         setLogs]         = useState([]);
  const [activeTab,    setActiveTab]    = useState("my"); // my | community
  const [community,    setCommunity]    = useState([]);
  const [loading,      setLoading]      = useState(true);

  const loadRobots = useCallback(() => {
    setLoading(true);
    robotsAPI.getAll().then((r) => setRobots(r.data.results || r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadRobots(); }, [loadRobots]);

  useEffect(() => {
    if (activeTab === "community") {
      robotsAPI.community().then((r) => setCommunity(r.data.results || r.data));
    }
  }, [activeTab]);

  // Live log streaming
  useEffect(() => {
    if (!logsRobot) return;
    const key = wsManager.connectRobot(logsRobot.id);
    const unsub = wsManager.on(key, "robot_log", (msg) => {
      setLogs((prev) => [msg.log, ...prev.slice(0, 99)]);
    });
    const unsubStatus = wsManager.on(key, "robot_status", (msg) => {
      setRobots((prev) => prev.map((r) =>
        r.id === logsRobot.id ? { ...r, status: msg.status, session_profit: msg.session_profit } : r
      ));
    });
    // Load recent logs
    robotsAPI.getLogs(logsRobot.id).then((r) => setLogs(r.data.results || r.data));
    return () => { unsub(); unsubStatus(); wsManager.disconnect(key); };
  }, [logsRobot]);

  const handleStart = async (robot) => {
    await robotsAPI.start(robot.id);
    setRobots((prev) => prev.map((r) => r.id === robot.id ? { ...r, status: "active" } : r));
  };

  const handleStop = async (robot) => {
    await robotsAPI.stop(robot.id);
    setRobots((prev) => prev.map((r) => r.id === robot.id ? { ...r, status: "stopped" } : r));
  };

  const handleDelete = async (robot) => {
    if (!confirm(`Delete robot "${robot.name}"?`)) return;
    await robotsAPI.delete(robot.id);
    setRobots((prev) => prev.filter((r) => r.id !== robot.id));
  };

  const handleSave = (saved) => {
    if (editingRobot) {
      setRobots((prev) => prev.map((r) => r.id === saved.id ? saved : r));
    } else {
      setRobots((prev) => [saved, ...prev]);
    }
    setShowBuilder(false);
    setEditingRobot(null);
  };

  const LOG_COLORS = {
    success: "var(--color-success)",
    warning: "var(--color-warning)",
    error:   "var(--color-danger)",
    trade:   "var(--color-accent)",
    info:    "var(--text-secondary)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar />
        <main className="main-content" style={{ flex: 1 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                <i className="bi bi-robot" style={{ color: "var(--color-primary)" }} /> Robot Trading
              </h1>
              <p className="text-muted">Automate your trades with rule-based bots</p>
            </div>
            <button className="btn btn--primary" onClick={() => { setShowBuilder(true); setEditingRobot(null); }}>
              <i className="bi bi-plus-circle" /> New Robot
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-sm" style={{ marginBottom: 20 }}>
            {[{ id: "my", label: "My Robots" }, { id: "community", label: "Community" }].map((t) => (
              <button key={t.id} className={`btn btn--sm ${activeTab === t.id ? "btn--primary" : "btn--outline"}`} onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Builder modal */}
          {showBuilder && (
            <div className="modal-overlay" onClick={() => setShowBuilder(false)}>
              <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 660 }}>
                <RobotBuilder
                  existing={editingRobot}
                  onSave={handleSave}
                  onCancel={() => { setShowBuilder(false); setEditingRobot(null); }}
                />
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: logsRobot ? "1fr 380px" : "1fr", gap: 20 }}>
            {/* Robot list */}
            <div className="flex flex-col gap-md">
              {loading && (
                <div className="text-center text-muted" style={{ padding: "var(--space-2xl)" }}>
                  <i className="bi bi-arrow-repeat spin" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
                  Loading robots…
                </div>
              )}

              {activeTab === "my" && !loading && robots.length === 0 && (
                <div className="card" style={{ textAlign: "center", padding: "var(--space-2xl)" }}>
                  <i className="bi bi-robot" style={{ fontSize: 48, color: "var(--text-muted)", display: "block", marginBottom: 12 }} />
                  <p className="font-bold" style={{ marginBottom: 8 }}>No robots yet</p>
                  <p className="text-muted text-sm" style={{ marginBottom: 16 }}>Build your first automated trading robot</p>
                  <button className="btn btn--primary" onClick={() => setShowBuilder(true)}>
                    <i className="bi bi-plus-circle" /> Build Robot
                  </button>
                </div>
              )}

              {activeTab === "my" && robots.map((robot) => (
                <RobotCard
                  key={robot.id}
                  robot={robot}
                  onStart={handleStart}
                  onStop={handleStop}
                  onEdit={(r) => { setEditingRobot(r); setShowBuilder(true); }}
                  onDelete={handleDelete}
                  onViewLogs={(r) => { setLogsRobot(r); setLogs([]); }}
                />
              ))}

              {activeTab === "community" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
                  {community.map((r) => (
                    <div key={r.id} className="card">
                      <div className="font-bold" style={{ marginBottom: 6 }}>{r.name}</div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Win rate</span>
                        <span className={`font-bold ${parseFloat(r.win_rate) >= 50 ? "text-success" : "text-danger"}`}>{r.win_rate}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Trades</span>
                        <span className="font-bold text-mono">{r.total_trades}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Profit</span>
                        <span className={`font-bold text-mono ${parseFloat(r.total_profit) >= 0 ? "text-success" : "text-danger"}`}>
                          ${parseFloat(r.total_profit).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live log panel */}
            {logsRobot && (
              <div className="card" style={{ height: "fit-content", position: "sticky", top: 16 }}>
                <div className="card__header">
                  <span className="card__title"><i className="bi bi-terminal" /> {logsRobot.name}</span>
                  <button className="btn btn--ghost btn--sm" onClick={() => setLogsRobot(null)}>
                    <i className="bi bi-x" />
                  </button>
                </div>
                <div className="robot-log">
                  {logs.length === 0 && <span className="text-muted text-xs">Waiting for activity…</span>}
                  {logs.map((log, i) => (
                    <div key={i} className="robot-log__entry">
                      <span className="robot-log__time">{new Date(log.created_at).toLocaleTimeString()}</span>
                      <span className="robot-log__msg" style={{ color: LOG_COLORS[log.level] || "var(--text-secondary)" }}>
                        [{log.level?.toUpperCase()}] {log.message}
                        {log.profit !== null && log.profit !== undefined && (
                          <span style={{ color: parseFloat(log.profit) >= 0 ? "var(--color-success)" : "var(--color-danger)", marginLeft: 6 }}>
                            {parseFloat(log.profit) >= 0 ? "+" : ""}${parseFloat(log.profit).toFixed(2)}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
// src/components/robot/RobotControls.jsx
import React, { useState } from "react";
import { robotsAPI } from "../../utils/api";
import { useToast } from "../common/Toast";

/**
 * RobotControls — standalone action bar for a single robot.
 * Can be embedded inside a card, modal, or detail page.
 *
 * Props:
 *   robot        — full robot object
 *   onStatusChange(updatedRobot) — called after start/stop succeeds
 *   onEdit(robot)               — called when Edit is clicked
 *   onDelete(robot)             — called when Delete is confirmed
 *   compact      — if true renders icon-only buttons (no labels)
 */
const RobotControls = ({
  robot,
  onStatusChange,
  onEdit,
  onDelete,
  compact = false,
}) => {
  const [loadingAction, setLoadingAction] = useState(null); // "start"|"stop"|"delete"
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toast = useToast();

  const isRunning = robot.status === "active";

  const handleStart = async () => {
    setLoadingAction("start");
    try {
      const res = await robotsAPI.start(robot.id);
      toast.success(`Robot "${robot.name}" started.`);
      onStatusChange?.(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to start robot.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleStop = async () => {
    setLoadingAction("stop");
    try {
      const res = await robotsAPI.stop(robot.id);
      toast.success(`Robot "${robot.name}" stopped.`);
      onStatusChange?.(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to stop robot.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async () => {
    setLoadingAction("delete");
    try {
      await robotsAPI.delete(robot.id);
      toast.success(`Robot "${robot.name}" deleted.`);
      onDelete?.(robot);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete robot.");
    } finally {
      setLoadingAction(null);
      setConfirmDelete(false);
    }
  };

  const btnClass = compact ? "btn btn--ghost btn--sm" : "btn btn--sm";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", flexWrap: "wrap" }}>
      {/* Start / Stop */}
      {isRunning ? (
        <button
          className={`${btnClass} btn--danger`}
          onClick={handleStop}
          disabled={!!loadingAction}
        >
          {loadingAction === "stop" ? (
            <i className="bi bi-arrow-repeat spin" />
          ) : (
            <i className="bi bi-stop-circle-fill" />
          )}
          {!compact && " Stop"}
        </button>
      ) : (
        <button
          className={`${btnClass} btn--success`}
          onClick={handleStart}
          disabled={!!loadingAction}
        >
          {loadingAction === "start" ? (
            <i className="bi bi-arrow-repeat spin" />
          ) : (
            <i className="bi bi-play-circle-fill" />
          )}
          {!compact && " Start"}
        </button>
      )}

      {/* Edit */}
      <button
        className={`${btnClass} btn--outline`}
        onClick={() => onEdit?.(robot)}
        disabled={isRunning || !!loadingAction}
        title={isRunning ? "Stop the robot before editing" : "Edit robot"}
      >
        <i className="bi bi-pencil-square" />
        {!compact && " Edit"}
      </button>

      {/* Delete / Confirm */}
      {confirmDelete ? (
        <>
          <span className="text-xs text-muted" style={{ marginLeft: 4 }}>Sure?</span>
          <button
            className="btn btn--danger btn--sm"
            onClick={handleDelete}
            disabled={loadingAction === "delete"}
          >
            {loadingAction === "delete"
              ? <i className="bi bi-arrow-repeat spin" />
              : <i className="bi bi-check-lg" />}
            {!compact && " Yes, delete"}
          </button>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setConfirmDelete(false)}
          >
            <i className="bi bi-x" />
          </button>
        </>
      ) : (
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => setConfirmDelete(true)}
          disabled={isRunning || !!loadingAction}
          title={isRunning ? "Stop the robot before deleting" : "Delete robot"}
          style={{ color: "var(--color-danger)" }}
        >
          <i className="bi bi-trash" />
          {!compact && " Delete"}
        </button>
      )}

      {/* Live status badge */}
      {isRunning && (
        <span
          className="badge badge--success"
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}
        >
          <span className="live-dot" style={{ width: 6, height: 6 }} />
          Running
        </span>
      )}
    </div>
  );
};

export default RobotControls;
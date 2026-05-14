
// ─────────────────────────────────────────────────────────────────────────────
// src/components/trading/DurationPicker.jsx
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";

const UNITS = [
  { value: "t", label: "Ticks",   min: 1,  max: 10,   step: 1,    presets: [1, 2, 3, 5, 10]   },
  { value: "s", label: "Seconds", min: 15, max: 3600,  step: 15,   presets: [15, 30, 60, 120]   },
  { value: "m", label: "Minutes", min: 1,  max: 1440,  step: 1,    presets: [1, 2, 5, 15, 30]   },
  { value: "h", label: "Hours",   min: 1,  max: 24,    step: 1,    presets: [1, 2, 4, 8, 24]    },
  { value: "d", label: "Days",    min: 1,  max: 365,   step: 1,    presets: [1, 7, 14, 30]      },
];

export function DurationPicker({ duration, durationUnit, onDurationChange, onUnitChange }) {
  const activeUnit = UNITS.find((u) => u.value === durationUnit) || UNITS[0];

  const handlePreset = (val) => onDurationChange(val);

  const handleInput = (e) => {
    const val = parseInt(e.target.value) || activeUnit.min;
    onDurationChange(Math.max(activeUnit.min, Math.min(activeUnit.max, val)));
  };

  return (
    <div>
      <div className="text-xs text-muted" style={{ marginBottom: 8 }}>Duration</div>

      {/* Unit tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {UNITS.map((u) => (
          <button
            key={u.value}
            onClick={() => { onUnitChange(u.value); onDurationChange(u.presets[0]); }}
            style={{
              flex:        1,
              padding:     "5px 0",
              borderRadius:"var(--radius-sm)",
              border:      `1px solid ${durationUnit === u.value ? "var(--color-primary)" : "var(--border-color)"}`,
              background:  durationUnit === u.value ? "rgba(99,102,241,0.12)" : "var(--bg-base)",
              color:       durationUnit === u.value ? "var(--color-primary-light)" : "var(--text-muted)",
              fontSize:    11,
              fontWeight:  700,
              cursor:      "pointer",
              transition:  "all var(--transition-fast)",
            }}
          >
            {u.label}
          </button>
        ))}
      </div>

      {/* Preset quick picks */}
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {activeUnit.presets.map((preset) => (
          <button
            key={preset}
            onClick={() => handlePreset(preset)}
            style={{
              flex:        1,
              padding:     "5px 0",
              borderRadius:"var(--radius-sm)",
              border:      `1px solid ${duration === preset ? "var(--color-accent)" : "var(--border-color)"}`,
              background:  duration === preset ? "rgba(34,211,238,0.12)" : "var(--bg-base)",
              color:       duration === preset ? "var(--color-accent)" : "var(--text-muted)",
              fontSize:    12,
              fontWeight:  700,
              cursor:      "pointer",
              transition:  "all var(--transition-fast)",
            }}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Manual input */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => onDurationChange(Math.max(activeUnit.min, duration - activeUnit.step))}
          className="btn btn--ghost btn--sm"
          style={{ padding: "6px 10px" }}
        >
          <i className="bi bi-dash" />
        </button>
        <input
          type="number"
          className="form-input text-mono"
          value={duration}
          min={activeUnit.min}
          max={activeUnit.max}
          step={activeUnit.step}
          onChange={handleInput}
          style={{ textAlign: "center", fontWeight: 700, padding: "8px 0" }}
        />
        <button
          onClick={() => onDurationChange(Math.min(activeUnit.max, duration + activeUnit.step))}
          className="btn btn--ghost btn--sm"
          style={{ padding: "6px 10px" }}
        >
          <i className="bi bi-plus" />
        </button>
        <span className="text-muted" style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
          {activeUnit.label}
        </span>
      </div>
    </div>
  );
}


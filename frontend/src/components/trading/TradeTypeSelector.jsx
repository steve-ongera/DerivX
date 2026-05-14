// src/components/trading/TradeTypeSelector.jsx
import React from "react";

const CATEGORIES = [
  {
    id: "updown", label: "Up/Down", icon: "bi-arrow-up-down",
    types: [
      { slug: "rise", label: "Rise", icon: "bi-arrow-up-circle-fill",   color: "var(--color-rise)" },
      { slug: "fall", label: "Fall", icon: "bi-arrow-down-circle-fill", color: "var(--color-fall)" },
    ],
  },
  {
    id: "highlow", label: "High/Low", icon: "bi-bar-chart-steps",
    types: [
      { slug: "higher", label: "Higher", icon: "bi-chevron-double-up",   color: "var(--color-rise)" },
      { slug: "lower",  label: "Lower",  icon: "bi-chevron-double-down", color: "var(--color-fall)" },
    ],
  },
  {
    id: "touchnotouch", label: "Touch", icon: "bi-hand-index",
    types: [
      { slug: "touch",    label: "Touch",    icon: "bi-hand-index",       color: "var(--color-touch)" },
      { slug: "no-touch", label: "No Touch", icon: "bi-hand-index-thumb", color: "var(--text-muted)"  },
    ],
  },
  {
    id: "digits", label: "Digits", icon: "bi-123",
    types: [
      { slug: "even",    label: "Even",    icon: "bi-calculator",   color: "var(--color-even)" },
      { slug: "odd",     label: "Odd",     icon: "bi-123",          color: "var(--color-odd)"  },
      { slug: "matches", label: "Matches", icon: "bi-check2-circle",color: "var(--color-accent)"},
      { slug: "differs", label: "Differs", icon: "bi-x-circle",     color: "var(--color-danger)"},
      { slug: "over",    label: "Over",    icon: "bi-chevron-up",   color: "var(--color-rise)" },
      { slug: "under",   label: "Under",   icon: "bi-chevron-down", color: "var(--color-fall)" },
    ],
  },
  {
    id: "asian", label: "Asian", icon: "bi-graph-up-arrow",
    types: [
      { slug: "asian-up",   label: "Asian Up",   icon: "bi-graph-up-arrow",   color: "var(--color-rise)" },
      { slug: "asian-down", label: "Asian Down", icon: "bi-graph-down-arrow",  color: "var(--color-fall)" },
    ],
  },
];

export default function TradeTypeSelector({
  selectedCategory,
  selectedTypeSlug,
  onCategoryChange,
  onTypeChange,
  availableTypes = [],   // from API — filters which are enabled on this market
}) {
  const activeCategory = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];

  // Filter to only types available on this market
  const filteredTypes = activeCategory.types.filter((t) =>
    availableTypes.length === 0 || availableTypes.some((at) => at.slug === t.slug)
  );

  return (
    <div>
      {/* Category tabs */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 12,
        overflowX: "auto", paddingBottom: 2,
      }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            style={{
              display:        "flex",
              alignItems:     "center",
              gap:            5,
              padding:        "5px 12px",
              borderRadius:   "var(--radius-full)",
              border:         `1px solid ${selectedCategory === cat.id ? "var(--color-primary)" : "var(--border-color)"}`,
              background:     selectedCategory === cat.id ? "rgba(99,102,241,0.12)" : "transparent",
              color:          selectedCategory === cat.id ? "var(--color-primary-light)" : "var(--text-muted)",
              fontSize:       11,
              fontWeight:     700,
              cursor:         "pointer",
              whiteSpace:     "nowrap",
              transition:     "all var(--transition-fast)",
            }}
          >
            <i className={cat.icon} /> {cat.label}
          </button>
        ))}
      </div>

      {/* Type buttons */}
      <div style={{
        display: "grid",
        gridTemplateColumns: filteredTypes.length <= 2 ? "1fr 1fr" : "repeat(3, 1fr)",
        gap: 6,
      }}>
        {filteredTypes.map((type) => {
          const isSelected = selectedTypeSlug === type.slug;
          return (
            <button
              key={type.slug}
              onClick={() => onTypeChange(type.slug)}
              style={{
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                gap:            5,
                padding:        "10px 6px",
                borderRadius:   "var(--radius-md)",
                border:         `2px solid ${isSelected ? type.color : "var(--border-color)"}`,
                background:     isSelected ? `${type.color}18` : "var(--bg-base)",
                color:          isSelected ? type.color : "var(--text-muted)",
                fontSize:       11,
                fontWeight:     700,
                cursor:         "pointer",
                transition:     "all var(--transition-fast)",
              }}
            >
              <i className={type.icon} style={{ fontSize: 20 }} />
              {type.label}
            </button>
          );
        })}
        {filteredTypes.length === 0 && (
          <div className="text-muted text-xs" style={{ gridColumn: "1/-1", textAlign: "center", padding: 12 }}>
            No contracts available for this market
          </div>
        )}
      </div>
    </div>
  );
}


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


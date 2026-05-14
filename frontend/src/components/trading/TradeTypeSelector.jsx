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


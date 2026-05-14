// src/components/common/Spinner.jsx
import React from "react";

const Spinner = ({ size = "md", color = "primary", center = false }) => {
  const sizeMap = { sm: "16px", md: "24px", lg: "40px", xl: "64px" };
  const colorMap = {
    primary: "var(--color-primary)",
    success: "var(--color-success)",
    danger: "var(--color-danger)",
    muted: "var(--text-muted)",
    white: "#fff",
  };

  const spinner = (
    <svg
      width={sizeMap[size] || sizeMap.md}
      height={sizeMap[size] || sizeMap.md}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: "spin 0.8s linear infinite", display: "block" }}
    >
      <circle
        cx="12" cy="12" r="10"
        stroke={colorMap[color] || colorMap.primary}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="40 60"
      />
    </svg>
  );

  if (center) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-xl)" }}>
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default Spinner;
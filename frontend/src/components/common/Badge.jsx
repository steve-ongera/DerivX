// src/components/common/Badge.jsx
import React from "react";

const Badge = ({ children, variant = "primary", icon, className = "" }) => (
  <span className={`badge badge--${variant} ${className}`}>
    {icon && <i className={`bi ${icon}`} />}
    {children}
  </span>
);

export default Badge;
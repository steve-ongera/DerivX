// src/components/common/Button.jsx
import React from "react";

const Button = ({
  children,
  variant = "primary",
  size = "",
  full = false,
  disabled = false,
  loading = false,
  onClick,
  type = "button",
  className = "",
  ...props
}) => {
  const classes = [
    "btn",
    `btn--${variant}`,
    size ? `btn--${size}` : "",
    full ? "btn--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <i className="bi bi-arrow-repeat spin" />}
      {children}
    </button>
  );
};

export default Button;
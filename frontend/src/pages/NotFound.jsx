
// ═══════════════════════════════════════════════════════════════
// src/pages/NotFound.jsx
// ═══════════════════════════════════════════════════════════════
import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-base)", flexDirection: "column", gap: 16, padding: 24,
    }}>
      <div style={{ fontSize: 80, fontWeight: 900, color: "var(--color-primary)", fontFamily: "var(--font-mono)", letterSpacing: -4 }}>404</div>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Page Not Found</h1>
      <p className="text-muted text-center" style={{ maxWidth: 400, lineHeight: 1.7 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-sm">
        <Link to="/"        className="btn btn--primary"><i className="bi bi-house" /> Home</Link>
        <Link to="/markets" className="btn btn--outline"><i className="bi bi-grid" /> Markets</Link>
      </div>
    </div>
  );
}
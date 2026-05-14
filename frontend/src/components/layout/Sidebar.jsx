// src/components/layout/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../App";

const NAV_ITEMS = [
  { to: "/",        icon: "bi-house-door",       label: "Home",    exact: true },
  { to: "/trade",   icon: "bi-lightning-charge",  label: "Trade"   },
  { to: "/markets", icon: "bi-grid-3x3-gap",      label: "Markets" },
  { to: "/robot",   icon: "bi-robot",             label: "Robots"  },
  { to: "/wallet",  icon: "bi-wallet2",           label: "Wallet"  },
  { to: "/profile", icon: "bi-person-circle",     label: "Profile" },
];

export default function Sidebar() {
  const { isAuthenticated } = useAuth();
  const items = isAuthenticated
    ? NAV_ITEMS
    : NAV_ITEMS.filter((n) => ["/", "/markets"].includes(n.to));

  return (
    <aside className="sidebar">
      <nav className="sidebar__nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) => `sidebar__link${isActive ? " active" : ""}`}
          >
            <i className={item.icon} style={{ fontSize: 19 }} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ marginTop: "auto", padding: "0 var(--space-sm) var(--space-md)" }}>
        <div className="sidebar__link" style={{ color: "var(--text-muted)", cursor: "default" }}>
          <i className="bi bi-shield-check" style={{ fontSize: 16, color: "var(--color-success)" }} />
          <span style={{ fontSize: 11 }}>Secure Platform</span>
        </div>
      </div>
    </aside>
  );
}
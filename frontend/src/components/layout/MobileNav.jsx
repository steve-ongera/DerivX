// src/components/layout/MobileNav.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../App";

const PUBLIC_NAV = [
  { to: "/",        icon: "bi-house-door",      label: "Home"    },
  { to: "/markets", icon: "bi-grid-3x3-gap",    label: "Markets" },
  { to: "/login",   icon: "bi-box-arrow-in-right", label: "Login" },
];

const AUTH_NAV = [
  { to: "/",        icon: "bi-house-door",      label: "Home"    },
  { to: "/trade",   icon: "bi-lightning-charge", label: "Trade"   },
  { to: "/robot",   icon: "bi-robot",            label: "Robots"  },
  { to: "/wallet",  icon: "bi-wallet2",          label: "Wallet"  },
  { to: "/profile", icon: "bi-person-circle",    label: "Profile" },
];

export default function MobileNav() {
  const { isAuthenticated, unreadNotifications } = useAuth();
  const items = isAuthenticated ? AUTH_NAV : PUBLIC_NAV;

  return (
    <nav style={{
      display:         "none",          // shown via CSS @media
      position:        "fixed",
      bottom:          0,
      left:            0,
      right:           0,
      height:          64,
      background:      "var(--bg-surface)",
      borderTop:       "1px solid var(--border-color)",
      zIndex:          200,
      justifyContent:  "space-around",
      alignItems:      "center",
      paddingBottom:   "env(safe-area-inset-bottom)",
    }}
    className="mobile-nav"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          style={({ isActive }) => ({
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            gap:            3,
            padding:        "6px 16px",
            borderRadius:   "var(--radius-md)",
            color:          isActive ? "var(--color-primary-light)" : "var(--text-muted)",
            textDecoration: "none",
            fontSize:       10,
            fontWeight:     600,
            transition:     "color var(--transition-fast)",
            position:       "relative",
          })}
        >
          {({ isActive }) => (
            <>
              <div style={{ position: "relative" }}>
                <i className={item.icon} style={{
                  fontSize:  22,
                  color:     isActive ? "var(--color-primary)" : "inherit",
                }} />
                {/* Notification badge on Profile */}
                {item.label === "Profile" && unreadNotifications > 0 && (
                  <span style={{
                    position:       "absolute",
                    top:            -4,
                    right:          -6,
                    background:     "var(--color-danger)",
                    color:          "#fff",
                    borderRadius:   "50%",
                    width:          16,
                    height:         16,
                    fontSize:       9,
                    fontWeight:     700,
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                  }}>
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </div>
              <span style={{ color: isActive ? "var(--color-primary-light)" : "inherit" }}>
                {item.label}
              </span>
              {isActive && (
                <span style={{
                  position:     "absolute",
                  top:          0,
                  left:         "50%",
                  transform:    "translateX(-50%)",
                  width:        24,
                  height:       3,
                  background:   "var(--color-primary)",
                  borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
                }} />
              )}
            </>
          )}
        </NavLink>
      ))}

      <style>{`
        @media (max-width: 768px) {
          .mobile-nav { display: flex !important; }
          body { padding-bottom: 64px; }
        }
      `}</style>
    </nav>
  );
}
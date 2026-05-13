// src/components/layout/Navbar.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../App";
import { notificationsAPI } from "../../utils/api";
import { wsManager } from "../../utils/websocket";

export default function Navbar() {
  const { user, wallets, isAuthenticated, logout, unreadNotifications, dispatch } = useAuth();
  const navigate = useNavigate();
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef   = useRef(null);
  const profileRef = useRef(null);

  const usdWallet  = wallets?.find((w) => w.currency === "USD");
  const demoBalance = parseFloat(usdWallet?.demo_balance || 0).toFixed(2);
  const realBalance = parseFloat(usdWallet?.balance     || 0).toFixed(2);

  // Load notifications when panel opens
  const openNotifications = async () => {
    setNotifOpen((o) => !o);
    if (!notifOpen) {
      const { data } = await notificationsAPI.getAll({ page_size: 10 });
      setNotifications(data.results || data);
    }
  };

  const markAllRead = async () => {
    await notificationsAPI.markAllRead();
    dispatch({ type: "SET_UNREAD", count: 0 });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      {/* Logo */}
      <Link to="/" className="navbar__logo" style={{ textDecoration: "none" }}>
        <svg width="32" height="32" viewBox="0 0 56 56" fill="none">
          <rect width="56" height="56" rx="10" fill="#6366f1" />
          <path d="M12 40 L20 20 L28 32 L36 18 L44 40" stroke="white" strokeWidth="3.5"
                strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="44" cy="40" r="4" fill="#22d3ee" />
        </svg>
        Deriv<span>X</span>
      </Link>

      {/* Ticker quick links */}
      <div className="flex items-center gap-sm" style={{ marginLeft: 16 }}>
        {[
          { to: "/trade",   icon: "bi-lightning-charge", label: "Trade"   },
          { to: "/markets", icon: "bi-grid",             label: "Markets" },
          { to: "/robot",   icon: "bi-robot",            label: "Robots"  },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="btn btn--ghost btn--sm"
            style={{ fontSize: 13 }}
          >
            <i className={link.icon} /> {link.label}
          </Link>
        ))}
      </div>

      <div className="navbar__spacer" />

      {isAuthenticated ? (
        <>
          {/* Balance display */}
          <div className="navbar__balance" style={{ gap: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <i className="bi bi-mortarboard" style={{ color: "var(--text-muted)" }} />
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Demo</span>
              <strong style={{ color: "var(--color-accent)" }}>${demoBalance}</strong>
            </span>
            <span style={{ color: "var(--border-color-light)" }}>|</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <i className="bi bi-wallet2" style={{ color: "var(--text-muted)" }} />
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Real</span>
              <strong style={{ color: "var(--color-success)" }}>${realBalance}</strong>
            </span>
          </div>

          {/* Deposit button */}
          <Link to="/wallet" className="btn btn--primary btn--sm">
            <i className="bi bi-plus-circle" /> Deposit
          </Link>

          {/* Notifications */}
          <div style={{ position: "relative" }} ref={notifRef}>
            <button className="btn btn--ghost btn--sm" onClick={openNotifications} style={{ position: "relative" }}>
              <i className="bi bi-bell" style={{ fontSize: 18 }} />
              {unreadNotifications > 0 && (
                <span style={{
                  position: "absolute", top: 2, right: 2,
                  background: "var(--color-danger)",
                  color: "#fff", borderRadius: "50%",
                  width: 16, height: 16,
                  fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>

            {notifOpen && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)",
                width: 340, maxHeight: 420,
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-lg)",
                zIndex: 300, overflow: "hidden",
                display: "flex", flexDirection: "column",
              }}>
                <div className="flex justify-between items-center" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)" }}>
                  <span className="font-bold">Notifications</span>
                  {unreadNotifications > 0 && (
                    <button className="btn btn--ghost btn--sm" onClick={markAllRead} style={{ fontSize: 11 }}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {notifications.length === 0 && (
                    <div className="text-muted text-center" style={{ padding: "var(--space-xl)" }}>
                      <i className="bi bi-bell-slash" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
                      No notifications
                    </div>
                  )}
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--border-color)",
                        background: n.is_read ? "transparent" : "rgba(99,102,241,0.05)",
                        display: "flex", gap: 10, alignItems: "flex-start",
                      }}
                    >
                      <i className={`${n.icon || "bi-bell"}`} style={{
                        fontSize: 18, marginTop: 2, flexShrink: 0,
                        color: n.notification_type === "trade_result"
                          ? (n.title.includes("WON") ? "var(--color-success)" : "var(--color-danger)")
                          : "var(--color-primary-light)",
                      }} />
                      <div>
                        <div className="font-bold" style={{ fontSize: 13 }}>{n.title}</div>
                        <div className="text-xs text-muted" style={{ marginTop: 2 }}>{n.message}</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)", marginTop: 4 }}>
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                      {!n.is_read && (
                        <span style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: "var(--color-primary)", flexShrink: 0, marginTop: 6,
                        }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile menu */}
          <div style={{ position: "relative" }} ref={profileRef}>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setProfileOpen((o) => !o)}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "var(--color-primary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 700, fontSize: 13,
              }}>
                {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <i className={`bi bi-chevron-${profileOpen ? "up" : "down"}`} style={{ fontSize: 11 }} />
            </button>

            {profileOpen && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)",
                width: 200,
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-lg)",
                zIndex: 300, overflow: "hidden",
              }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)" }}>
                  <div className="font-bold" style={{ fontSize: 13 }}>
                    {user?.first_name} {user?.last_name}
                  </div>
                  <div className="text-xs text-muted">{user?.email}</div>
                </div>
                {[
                  { to: "/profile", icon: "bi-person", label: "Profile" },
                  { to: "/wallet",  icon: "bi-wallet2", label: "Wallet"  },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setProfileOpen(false)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 16px",
                      color: "var(--text-secondary)",
                      fontSize: 13, textDecoration: "none",
                      transition: "background var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-elevated)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <i className={item.icon} />
                    {item.label}
                  </Link>
                ))}
                <div style={{ borderTop: "1px solid var(--border-color)" }}>
                  <button
                    onClick={handleLogout}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "10px 16px",
                      color: "var(--color-danger)", fontSize: 13,
                      background: "none", border: "none", cursor: "pointer",
                      transition: "background var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <i className="bi bi-box-arrow-right" /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-sm">
          <Link to="/login"    className="btn btn--outline btn--sm">Login</Link>
          <Link to="/register" className="btn btn--primary btn--sm">Sign Up</Link>
        </div>
      )}
    </nav>
  );
}
// src/components/layout/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{
      background: "var(--bg-surface)",
      borderTop: "1px solid var(--border-color)",
      padding: "var(--space-xl) var(--space-lg)",
      marginTop: "auto",
    }}>
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "var(--space-xl)",
      }}>
        {/* Brand */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <svg width="32" height="32" viewBox="0 0 56 56" fill="none">
              <rect width="56" height="56" rx="10" fill="#6366f1" />
              <path d="M12 40 L20 20 L28 32 L36 18 L44 40"
                stroke="white" strokeWidth="3.5"
                strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <circle cx="44" cy="40" r="4" fill="#22d3ee" />
            </svg>
            <span style={{ fontWeight: 800, fontSize: 20, color: "var(--text-primary)" }}>
              Deriv<span style={{ color: "var(--color-primary)" }}>X</span>
            </span>
          </div>
          <p className="text-muted" style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
            Trade Forex, Crypto and Synthetic Indices with automated robot trading and real-time charts.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { icon: "bi-twitter-x",  href: "#" },
              { icon: "bi-telegram",   href: "#" },
              { icon: "bi-instagram",  href: "#" },
              { icon: "bi-youtube",    href: "#" },
            ].map((s) => (
              <a key={s.icon} href={s.href} style={{
                width: 34, height: 34, borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-muted)", fontSize: 15,
                transition: "all var(--transition-fast)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.color = "var(--color-primary-light)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-color)";  e.currentTarget.style.color = "var(--text-muted)"; }}
              >
                <i className={s.icon} />
              </a>
            ))}
          </div>
        </div>

        {/* Trading */}
        <div>
          <div className="font-bold" style={{ marginBottom: 14, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
            Trading
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { to: "/markets",       label: "All Markets"      },
              { to: "/trade",         label: "Trade Now"        },
              { to: "/robot",         label: "Robot Trading"    },
              { to: "/markets?category=synthetic-indices", label: "Synthetic Indices" },
              { to: "/markets?category=forex",             label: "Forex"             },
              { to: "/markets?category=cryptocurrencies",  label: "Crypto"            },
            ].map((link) => (
              <Link key={link.to} to={link.to} style={{
                color: "var(--text-secondary)", fontSize: 13,
                textDecoration: "none", transition: "color var(--transition-fast)",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-primary-light)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Payments */}
        <div>
          <div className="font-bold" style={{ marginBottom: 14, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
            Payments
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: "bi-phone",             label: "M-Pesa Deposit"    },
              { icon: "bi-paypal",            label: "PayPal"            },
              { icon: "bi-currency-bitcoin",  label: "Binance Pay"       },
              { icon: "bi-arrow-up-circle",   label: "Withdrawals"       },
            ].map((item) => (
              <Link key={item.label} to="/wallet" style={{
                display: "flex", alignItems: "center", gap: 8,
                color: "var(--text-secondary)", fontSize: 13,
                textDecoration: "none", transition: "color var(--transition-fast)",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-primary-light)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
              >
                <i className={item.icon} style={{ fontSize: 15 }} /> {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Account */}
        <div>
          <div className="font-bold" style={{ marginBottom: 14, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
            Account
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { to: "/register", label: "Create Account" },
              { to: "/login",    label: "Sign In"        },
              { to: "/profile",  label: "Profile"        },
              { to: "/wallet",   label: "Wallet"         },
            ].map((link) => (
              <Link key={link.to} to={link.to} style={{
                color: "var(--text-secondary)", fontSize: 13,
                textDecoration: "none", transition: "color var(--transition-fast)",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-primary-light)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        borderTop: "1px solid var(--border-color)",
        marginTop: "var(--space-xl)",
        paddingTop: "var(--space-lg)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <span className="text-muted" style={{ fontSize: 12 }}>
          © {year} DerivX. All rights reserved. Trading involves risk.
        </span>
        <div style={{ display: "flex", gap: "var(--space-lg)" }}>
          {["Privacy Policy", "Terms of Service", "Risk Disclosure"].map((label) => (
            <a key={label} href="#" className="text-muted" style={{ fontSize: 12, textDecoration: "none" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
            >
              {label}
            </a>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[
            { icon: "bi-phone",            label: "M-Pesa" },
            { icon: "bi-paypal",           label: "PayPal" },
            { icon: "bi-currency-bitcoin", label: "Binance"},
          ].map((pm) => (
            <span key={pm.label} style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 11, color: "var(--text-muted)",
              background: "var(--bg-elevated)",
              padding: "3px 8px", borderRadius: "var(--radius-full)",
              border: "1px solid var(--border-color)",
            }}>
              <i className={pm.icon} /> {pm.label}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
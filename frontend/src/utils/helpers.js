// src/utils/helpers.js
// ─── Frontend utility helpers ─────────────────────────────────────────────────

// ── Number formatting ─────────────────────────────────────────────────────────

/**
 * Format a number as currency string.
 * formatCurrency(1234.5) → "$1,234.50"
 */
export function formatCurrency(value, currency = "USD", decimals = 2) {
  const num = parseFloat(value) || 0;
  return new Intl.NumberFormat("en-US", {
    style:                 "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format a price with market-specific decimals.
 * formatPrice(1234.5678, 4) → "1,234.5678"
 */
export function formatPrice(value, decimals = 2) {
  const num = parseFloat(value) || 0;
  return num.toFixed(decimals);
}

/**
 * Format percentage with sign.
 * formatPct(2.5) → "+2.50%"  |  formatPct(-1.2) → "-1.20%"
 */
export function formatPct(value, decimals = 2) {
  const num = parseFloat(value) || 0;
  const sign = num >= 0 ? "+" : "";
  return `${sign}${num.toFixed(decimals)}%`;
}

/**
 * Compact number formatting.
 * compactNumber(1500000) → "1.5M"
 */
export function compactNumber(value) {
  const num = parseFloat(value) || 0;
  if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(2);
}

// ── Date / time formatting ────────────────────────────────────────────────────

/**
 * Format an ISO date string to locale datetime.
 */
export function formatDateTime(isoString, options = {}) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString("en-KE", {
    day:    "2-digit",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
    ...options,
  });
}

/**
 * Relative time (e.g. "3 minutes ago").
 */
export function timeAgo(isoString) {
  if (!isoString) return "—";
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60)   return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)   return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)     return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Format seconds into human-readable duration.
 * formatDuration(90) → "1m 30s"
 */
export function formatDuration(seconds) {
  if (seconds < 60)   return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

// ── Trade helpers ─────────────────────────────────────────────────────────────

/**
 * Determine CSS class for a P/L value.
 */
export function plClass(value) {
  const num = parseFloat(value);
  if (num > 0) return "text-success";
  if (num < 0) return "text-danger";
  return "text-muted";
}

/**
 * Format P/L with sign and currency.
 * formatPL(25.5) → "+$25.50"  |  formatPL(-10) → "-$10.00"
 */
export function formatPL(value) {
  const num = parseFloat(value) || 0;
  const sign = num >= 0 ? "+" : "";
  return `${sign}$${Math.abs(num).toFixed(2)}`;
}

/**
 * Get status badge class for trade status.
 */
export function tradeStatusBadge(status) {
  const map = {
    won:       "badge--success",
    lost:      "badge--danger",
    open:      "badge--primary",
    cancelled: "badge--muted",
    expired:   "badge--warning",
    error:     "badge--danger",
  };
  return map[status] || "badge--muted";
}

/**
 * Convert duration unit to seconds for display.
 */
export function durationToSeconds(duration, unit) {
  const map = { t: 2, s: 1, m: 60, h: 3600, d: 86400, e: 86400 };
  return parseInt(duration) * (map[unit] || 1);
}

// ── Validation helpers ────────────────────────────────────────────────────────

export function isValidPhone(phone) {
  // Kenyan format: 254XXXXXXXXX (12 digits)
  return /^254[17]\d{8}$/.test(phone.replace(/\s/g, ""));
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidWalletAddress(address) {
  // Basic crypto address validation (simplified)
  return address.length >= 25 && address.length <= 100 && /^[a-zA-Z0-9]+$/.test(address);
}

// ── Storage helpers ───────────────────────────────────────────────────────────

export const storage = {
  get: (key, fallback = null) => {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  remove: (key) => {
    try { localStorage.removeItem(key); } catch {}
  },
};

// ── Market helpers ────────────────────────────────────────────────────────────

/**
 * Get colour for price direction.
 */
export function priceDirectionColor(current, previous) {
  if (!previous || current === previous) return "var(--text-primary)";
  return current > previous ? "var(--color-success)" : "var(--color-danger)";
}

/**
 * Get last digit of a price string.
 * getLastDigit("1234.56") → 6
 */
export function getLastDigit(price, decimals = 2) {
  const str = parseFloat(price).toFixed(decimals).replace(".", "");
  return parseInt(str[str.length - 1]);
}

// ── Misc ──────────────────────────────────────────────────────────────────────

/**
 * Debounce a function call.
 */
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(parseFloat(value), min), max);
}

/**
 * Generate a random hex colour (for robot/chart theming).
 */
export function randomColor() {
  return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;
}

/**
 * Copy text to clipboard.
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default {
  formatCurrency, formatPrice, formatPct, compactNumber,
  formatDateTime, timeAgo, formatDuration,
  plClass, formatPL, tradeStatusBadge, durationToSeconds,
  isValidPhone, isValidEmail, isValidWalletAddress,
  storage, priceDirectionColor, getLastDigit,
  debounce, clamp, randomColor, copyToClipboard,
};
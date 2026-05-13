// src/utils/websocket.js
// ─── WebSocket Manager — handles connections for prices, trades, notifications ─

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

class WebSocketManager {
  constructor() {
    this._sockets = {};    // { key: WebSocket }
    this._listeners = {};  // { key: { eventType: [callbacks] } }
    this._reconnectTimers = {};
    this._maxRetries = 5;
    this._retryCount = {};
  }

  // ── Build URL ─────────────────────────────────────────────────

  _buildUrl(key, slug = null) {
    const token = localStorage.getItem("access_token");
    const auth = token ? `?token=${token}` : "";

    const routes = {
      trades:        `${WS_BASE}/ws/trades/${auth}`,
      notifications: `${WS_BASE}/ws/notifications/${auth}`,
      prices:        `${WS_BASE}/ws/prices/${slug}/${auth}`,
      robot:         `${WS_BASE}/ws/robots/${slug}/${auth}`,
    };

    return routes[key] || routes["prices"];
  }

  // ── Connect ───────────────────────────────────────────────────

  connect(key, slug = null) {
    if (this._sockets[key]?.readyState === WebSocket.OPEN) return;

    const url = this._buildUrl(key, slug);
    const ws = new WebSocket(url);
    this._sockets[key] = ws;
    this._retryCount[key] = this._retryCount[key] || 0;

    ws.onopen = () => {
      console.info(`[WS] Connected: ${key}`);
      this._retryCount[key] = 0;
      this._emit(key, "connected", {});
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this._emit(key, msg.type, msg);
      } catch (e) {
        console.warn(`[WS] Parse error on ${key}:`, e);
      }
    };

    ws.onerror = (error) => {
      console.warn(`[WS] Error on ${key}:`, error);
    };

    ws.onclose = (event) => {
      console.info(`[WS] Closed: ${key} code=${event.code}`);
      this._emit(key, "disconnected", { code: event.code });

      // Don't reconnect on auth error (4001) or not found (4004)
      if (event.code === 4001 || event.code === 4004) return;

      const retries = this._retryCount[key] || 0;
      if (retries < this._maxRetries) {
        const delay = Math.min(1000 * 2 ** retries, 30000);
        this._retryCount[key] = retries + 1;
        this._reconnectTimers[key] = setTimeout(() => {
          this.connect(key, slug);
        }, delay);
      }
    };

    return ws;
  }

  // ── Connect price feed for a market ─────────────────────────

  connectMarket(slug) {
    const key = `prices_${slug}`;
    this.connect(key, slug);
    return key;
  }

  disconnectMarket(slug) {
    this.disconnect(`prices_${slug}`);
  }

  // ── Connect robot feed ───────────────────────────────────────

  connectRobot(robotId) {
    const key = `robot_${robotId}`;
    this.connect(key, robotId);
    return key;
  }

  // ── Subscribe to candles for a market ───────────────────────

  subscribeCandles(slug, granularity = 60) {
    const key = `prices_${slug}`;
    this.send(key, { action: "subscribe_candles", granularity });
  }

  // ── Send ─────────────────────────────────────────────────────

  send(key, data) {
    const ws = this._sockets[key];
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  ping(key) {
    this.send(key, { action: "ping" });
  }

  // ── Listeners ─────────────────────────────────────────────────

  on(key, eventType, callback) {
    if (!this._listeners[key]) this._listeners[key] = {};
    if (!this._listeners[key][eventType]) this._listeners[key][eventType] = [];
    this._listeners[key][eventType].push(callback);
    // Return unsubscribe function
    return () => this.off(key, eventType, callback);
  }

  off(key, eventType, callback) {
    if (this._listeners[key]?.[eventType]) {
      this._listeners[key][eventType] = this._listeners[key][eventType].filter(
        (cb) => cb !== callback
      );
    }
  }

  _emit(key, eventType, data) {
    const callbacks = this._listeners[key]?.[eventType] || [];
    callbacks.forEach((cb) => {
      try { cb(data); }
      catch (e) { console.error(`[WS] Listener error [${key}/${eventType}]:`, e); }
    });
  }

  // ── Disconnect ────────────────────────────────────────────────

  disconnect(key) {
    clearTimeout(this._reconnectTimers[key]);
    const ws = this._sockets[key];
    if (ws) {
      ws.onclose = null; // Prevent reconnect logic
      ws.close();
      delete this._sockets[key];
    }
  }

  disconnectAll() {
    Object.keys(this._sockets).forEach((key) => this.disconnect(key));
  }

  // ── Status ───────────────────────────────────────────────────

  isConnected(key) {
    return this._sockets[key]?.readyState === WebSocket.OPEN;
  }
}

export const wsManager = new WebSocketManager();
export default wsManager;
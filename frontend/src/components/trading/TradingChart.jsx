// src/components/trading/TradingChart.jsx
// Real-time candlestick & line chart — lightweight-charts v5

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  createChart,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
} from "lightweight-charts";
import { wsManager } from "../../utils/websocket";
import { marketsAPI } from "../../utils/api";

const TIMEFRAMES = [
  { label: "1T",  granularity: 1     },
  { label: "1M",  granularity: 60    },
  { label: "5M",  granularity: 300   },
  { label: "15M", granularity: 900   },
  { label: "1H",  granularity: 3600  },
  { label: "4H",  granularity: 14400 },
  { label: "1D",  granularity: 86400 },
];

const CHART_TYPES = [
  { id: "candle", icon: "bi-bar-chart-line-fill", label: "Candles" },
  { id: "line",   icon: "bi-graph-up",            label: "Line"    },
  { id: "area",   icon: "bi-activity",            label: "Area"    },
];

export default function TradingChart({ market, onPriceUpdate }) {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const seriesRef    = useRef(null);
  const wsKeyRef     = useRef(null);

  const [chartType,         setChartType]         = useState("candle");
  const [activeGranularity, setActiveGranularity] = useState(60);
  const [currentPrice,      setCurrentPrice]      = useState(null);
  const [priceDirection,    setPriceDirection]    = useState("flat");
  const [isLoading,         setIsLoading]         = useState(true);
  const [lastDigit,         setLastDigit]         = useState(null);

  // ── Create / destroy chart ────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: 420,
      layout: {
        background: { color: "#1e293b" },
        textColor:  "#94a3b8",
        fontSize:   12,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: "#334155", style: LineStyle.Dotted },
        horzLines: { color: "#334155", style: LineStyle.Dotted },
      },
      crosshair: {
        mode:     CrosshairMode.Normal,
        vertLine: { color: "#6366f1", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#6366f1" },
        horzLine: { color: "#6366f1", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#6366f1" },
      },
      rightPriceScale: {
        borderColor:  "#334155",
        textColor:    "#94a3b8",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor:    "#334155",
        timeVisible:    true,
        secondsVisible: false,
        rightOffset:    12,
        barSpacing:     8,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale:  { mouseWheel: true, pinch: true },
    });

    chartRef.current = chart;

    const observer = new ResizeObserver(([entry]) => {
      chart.applyOptions({ width: entry.contentRect.width });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current  = null;
      seriesRef.current = null;
    };
  }, []);

  // ── Add / replace series when chartType changes ───────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (seriesRef.current) {
      try { chart.removeSeries(seriesRef.current); } catch {}
      seriesRef.current = null;
    }

    // v5 API: chart.addSeries(SeriesTypeClass, options)
    let series;
    if (chartType === "candle") {
      series = chart.addSeries(CandlestickSeries, {
        upColor:         "#22c55e",
        downColor:       "#ef4444",
        borderUpColor:   "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor:     "#22c55e",
        wickDownColor:   "#ef4444",
      });
    } else if (chartType === "line") {
      series = chart.addSeries(LineSeries, {
        color:     "#6366f1",
        lineWidth: 2,
      });
    } else {
      series = chart.addSeries(AreaSeries, {
        topColor:    "rgba(99,102,241,0.4)",
        bottomColor: "rgba(99,102,241,0.0)",
        lineColor:   "#6366f1",
        lineWidth:   2,
      });
    }

    seriesRef.current = series;
  }, [chartType]);

  // ── Load historical candles ───────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!market?.slug || !seriesRef.current) return;
    setIsLoading(true);
    try {
      const { data } = await marketsAPI.getCandles(market.slug, {
        granularity: activeGranularity,
        count: 300,
      });
      const candles = data.candles || [];
      if (!candles.length) return;

      if (chartType === "candle") {
        seriesRef.current.setData(candles.map((c) => ({
          time:  Math.floor(new Date(c.timestamp).getTime() / 1000),
          open:  parseFloat(c.open_price),
          high:  parseFloat(c.high_price),
          low:   parseFloat(c.low_price),
          close: parseFloat(c.close_price),
        })));
      } else {
        seriesRef.current.setData(candles.map((c) => ({
          time:  Math.floor(new Date(c.timestamp).getTime() / 1000),
          value: parseFloat(c.close_price),
        })));
      }

      chartRef.current?.timeScale().fitContent();
    } catch (err) {
      console.error("Failed to load chart history:", err);
    } finally {
      setIsLoading(false);
    }
  }, [market?.slug, activeGranularity, chartType]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── WebSocket: live price ticks ───────────────────────────────
  useEffect(() => {
    if (!market?.slug) return;

    if (wsKeyRef.current) wsManager.disconnectMarket(wsKeyRef.current);
    const key = wsManager.connectMarket(market.slug);
    wsKeyRef.current = market.slug;
    wsManager.subscribeCandles(market.slug, activeGranularity);

    const unsubTick = wsManager.on(key, "tick", (msg) => {
      const price = parseFloat(msg.price);
      setCurrentPrice((prev) => {
        setPriceDirection(price > prev ? "up" : price < prev ? "down" : "flat");
        return price;
      });
      setLastDigit(msg.last_digit);
      onPriceUpdate?.({ price, digit: msg.last_digit, ask: msg.ask, bid: msg.bid });

      if (chartType !== "candle" && seriesRef.current) {
        seriesRef.current.update({ time: msg.epoch, value: price });
      }
    });

    const unsubCandle = wsManager.on(key, "candle", (msg) => {
      if (!seriesRef.current) return;
      if (chartType === "candle") {
        seriesRef.current.update({
          time:  msg.epoch,
          open:  parseFloat(msg.open),
          high:  parseFloat(msg.high),
          low:   parseFloat(msg.low),
          close: parseFloat(msg.close),
        });
      } else {
        seriesRef.current.update({ time: msg.epoch, value: parseFloat(msg.close) });
      }
    });

    return () => { unsubTick(); unsubCandle(); };
  }, [market?.slug, activeGranularity, chartType, onPriceUpdate]);

  const priceClass = useMemo(() => `live-price ${priceDirection}`, [priceDirection]);

  const changeIcon = priceDirection === "up"
    ? <i className="bi bi-caret-up-fill text-success" />
    : priceDirection === "down"
    ? <i className="bi bi-caret-down-fill text-danger" />
    : null;

  return (
    <div className="chart-container">
      <div className="chart-toolbar">
        <div className="flex items-center gap-md" style={{ minWidth: 220 }}>
          <span className="live-dot" />
          <div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {market?.symbol || "—"}
            </div>
            <div className={priceClass} style={{ fontSize: 22 }}>
              {currentPrice !== null ? currentPrice.toFixed(market?.display_decimals ?? 2) : "—"}
              {changeIcon && <span style={{ fontSize: 14, marginLeft: 4 }}>{changeIcon}</span>}
            </div>
          </div>
          {lastDigit !== null && (
            <div className="badge badge--info" style={{ fontSize: 16, padding: "4px 12px" }}>
              <i className="bi bi-hash" /> {lastDigit}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        <div className="flex items-center gap-sm">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.granularity}
              className={`chart-timeframe-btn ${activeGranularity === tf.granularity ? "active" : ""}`}
              onClick={() => setActiveGranularity(tf.granularity)}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-sm" style={{ borderLeft: "1px solid var(--border-color)", paddingLeft: "var(--space-md)" }}>
          {CHART_TYPES.map((ct) => (
            <button
              key={ct.id}
              className={`chart-timeframe-btn ${chartType === ct.id ? "active" : ""}`}
              onClick={() => setChartType(ct.id)}
              title={ct.label}
            >
              <i className={ct.icon} />
            </button>
          ))}
        </div>

        <button className="btn btn--ghost btn--sm" onClick={loadHistory} title="Refresh">
          <i className="bi bi-arrow-clockwise" />
        </button>
      </div>

      <div style={{ position: "relative" }}>
        {isLoading && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(15,23,42,0.7)", zIndex: 10,
            borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
          }}>
            <i className="bi bi-arrow-repeat spin" style={{ fontSize: 24, color: "var(--color-primary)" }} />
          </div>
        )}
        <div ref={containerRef} className="chart-canvas" />
      </div>
    </div>
  );
}
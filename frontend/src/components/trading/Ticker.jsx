// src/components/trading/Ticker.jsx
import React from "react";

export function Ticker({ markets = [], onSelect }) {
  return (
    <div className="ticker-strip">
      {markets.map((m) => {
        const pct = parseFloat(m.price_change_pct_24h);
        return (
          <div
            key={m.id}
            className="ticker-item"
            onClick={() => onSelect?.(m)}
          >
            <span className="ticker-item__symbol">{m.symbol}</span>
            <span className="ticker-item__price">
              {parseFloat(m.current_price).toFixed(m.display_decimals)}
            </span>
            <span className={`ticker-item__change ${pct >= 0 ? "up" : "down"}`}>
              {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default Ticker;
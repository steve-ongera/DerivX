"""
core/utils/price_feed.py — DerivX Price Simulation & Market Data Engine

Generates realistic synthetic price feeds for all market types:
  - Volatility Indices (V10, V25, V50, V75, V100)
  - Boom & Crash Indices (1000, 500)
  - Step Indices
  - Jump Indices (J10, J25, J50, J75, J100)
  - Range Break Indices
  - Forex pairs (simulated when live feed unavailable)
  - Crypto pairs

Each market has a distinct statistical character:
  - Volatility indices: continuous Brownian motion at fixed σ
  - Boom/Crash: rare spike events in one direction
  - Step indices: price moves only in fixed increments
  - Jump indices: occasional large jumps overlaid on normal motion
"""

import math
import random
import time
import logging
from decimal import Decimal, ROUND_DOWN
from datetime import datetime, timezone
from typing import Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# MARKET PROFILES
# Each profile defines the statistical behaviour of a synthetic market.
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class MarketProfile:
    symbol: str
    name: str
    base_price: float          # Starting / reference price
    volatility: float          # σ per tick (as fraction of price)
    display_decimals: int      # Digits after decimal point
    pip_size: float            # Smallest price move
    tick_interval_ms: int      # Milliseconds between ticks
    # Synthetic market specific
    is_boom: bool = False      # Boom index — rare upward spikes
    is_crash: bool = False     # Crash index — rare downward spikes
    spike_probability: float = 0.0   # Probability of spike per tick (0–1)
    spike_magnitude: float = 0.0     # Spike size as multiple of normal move
    is_step: bool = False      # Step index — moves only ±pip_size
    is_jump: bool = False      # Jump index — occasional large jumps
    jump_probability: float = 0.0
    jump_magnitude: float = 0.0
    drift: float = 0.0         # Slight trend bias (positive = upward drift)
    # Price bounds (0 = no bound)
    min_price: float = 0.0
    max_price: float = 0.0


MARKET_PROFILES: dict[str, MarketProfile] = {
    # ── Volatility Indices ────────────────────────────────────────────────────
    "R_10": MarketProfile(
        symbol="R_10", name="Volatility 10 Index",
        base_price=5842.00, volatility=0.0002, display_decimals=2,
        pip_size=0.01, tick_interval_ms=1000,
    ),
    "R_25": MarketProfile(
        symbol="R_25", name="Volatility 25 Index",
        base_price=3156.00, volatility=0.0005, display_decimals=3,
        pip_size=0.001, tick_interval_ms=1000,
    ),
    "R_50": MarketProfile(
        symbol="R_50", name="Volatility 50 Index",
        base_price=512.450, volatility=0.001, display_decimals=3,
        pip_size=0.001, tick_interval_ms=1000,
    ),
    "R_75": MarketProfile(
        symbol="R_75", name="Volatility 75 Index",
        base_price=298.150, volatility=0.002, display_decimals=3,
        pip_size=0.001, tick_interval_ms=1000,
    ),
    "R_100": MarketProfile(
        symbol="R_100", name="Volatility 100 Index",
        base_price=156.800, volatility=0.004, display_decimals=3,
        pip_size=0.001, tick_interval_ms=1000,
    ),
    # 1-second versions
    "1HZ10V": MarketProfile(
        symbol="1HZ10V", name="Volatility 10 (1s) Index",
        base_price=6240.00, volatility=0.0002, display_decimals=2,
        pip_size=0.01, tick_interval_ms=1000,
    ),
    "1HZ100V": MarketProfile(
        symbol="1HZ100V", name="Volatility 100 (1s) Index",
        base_price=482.320, volatility=0.004, display_decimals=2,
        pip_size=0.01, tick_interval_ms=1000,
    ),

    # ── Boom Indices ──────────────────────────────────────────────────────────
    "BOOM1000": MarketProfile(
        symbol="BOOM1000", name="Boom 1000 Index",
        base_price=8542.10, volatility=0.0003, display_decimals=2,
        pip_size=0.01, tick_interval_ms=1000,
        is_boom=True, spike_probability=1/1000, spike_magnitude=80.0,
        drift=0.00002,
    ),
    "BOOM500": MarketProfile(
        symbol="BOOM500", name="Boom 500 Index",
        base_price=6321.50, volatility=0.0003, display_decimals=2,
        pip_size=0.01, tick_interval_ms=1000,
        is_boom=True, spike_probability=1/500, spike_magnitude=60.0,
        drift=0.00003,
    ),
    "BOOM300": MarketProfile(
        symbol="BOOM300", name="Boom 300 Index",
        base_price=4100.00, volatility=0.0003, display_decimals=2,
        pip_size=0.01, tick_interval_ms=1000,
        is_boom=True, spike_probability=1/300, spike_magnitude=40.0,
        drift=0.00005,
    ),

    # ── Crash Indices ─────────────────────────────────────────────────────────
    "CRASH1000": MarketProfile(
        symbol="CRASH1000", name="Crash 1000 Index",
        base_price=9124.80, volatility=0.0003, display_decimals=2,
        pip_size=0.01, tick_interval_ms=1000,
        is_crash=True, spike_probability=1/1000, spike_magnitude=80.0,
        drift=-0.00002,
    ),
    "CRASH500": MarketProfile(
        symbol="CRASH500", name="Crash 500 Index",
        base_price=7654.30, volatility=0.0003, display_decimals=2,
        pip_size=0.01, tick_interval_ms=1000,
        is_crash=True, spike_probability=1/500, spike_magnitude=60.0,
        drift=-0.00003,
    ),
    "CRASH300": MarketProfile(
        symbol="CRASH300", name="Crash 300 Index",
        base_price=5200.00, volatility=0.0003, display_decimals=2,
        pip_size=0.01, tick_interval_ms=1000,
        is_crash=True, spike_probability=1/300, spike_magnitude=40.0,
        drift=-0.00005,
    ),

    # ── Step Index ────────────────────────────────────────────────────────────
    "STPIND": MarketProfile(
        symbol="STPIND", name="Step Index",
        base_price=8200.00, volatility=0.0, display_decimals=2,
        pip_size=0.10, tick_interval_ms=1000,
        is_step=True,
    ),

    # ── Jump Indices ──────────────────────────────────────────────────────────
    "JD10": MarketProfile(
        symbol="JD10", name="Jump 10 Index",
        base_price=1230.00, volatility=0.001, display_decimals=2,
        pip_size=0.01, tick_interval_ms=1000,
        is_jump=True, jump_probability=0.01, jump_magnitude=15.0,
    ),
    "JD25": MarketProfile(
        symbol="JD25", name="Jump 25 Index",
        base_price=1850.00, volatility=0.0015, display_decimals=2,
        pip_size=0.01, tick_interval_ms=1000,
        is_jump=True, jump_probability=0.025, jump_magnitude=20.0,
    ),
    "JD50": MarketProfile(
        symbol="JD50", name="Jump 50 Index",
        base_price=2400.00, volatility=0.002, display_decimals=2,
        pip_size=0.01, tick_interval_ms=1000,
        is_jump=True, jump_probability=0.05, jump_magnitude=30.0,
    ),
    "JD75": MarketProfile(
        symbol="JD75", name="Jump 75 Index",
        base_price=3100.00, volatility=0.003, display_decimals=2,
        pip_size=0.01, tick_interval_ms=1000,
        is_jump=True, jump_probability=0.075, jump_magnitude=40.0,
    ),
    "JD100": MarketProfile(
        symbol="JD100", name="Jump 100 Index",
        base_price=4200.00, volatility=0.004, display_decimals=2,
        pip_size=0.01, tick_interval_ms=1000,
        is_jump=True, jump_probability=0.1, jump_magnitude=55.0,
    ),

    # ── Forex (simulated) ─────────────────────────────────────────────────────
    "frxEURUSD": MarketProfile(
        symbol="frxEURUSD", name="EUR/USD",
        base_price=1.08540, volatility=0.00005, display_decimals=5,
        pip_size=0.00001, tick_interval_ms=1000,
    ),
    "frxGBPUSD": MarketProfile(
        symbol="frxGBPUSD", name="GBP/USD",
        base_price=1.27340, volatility=0.00007, display_decimals=5,
        pip_size=0.00001, tick_interval_ms=1000,
    ),
    "frxUSDJPY": MarketProfile(
        symbol="frxUSDJPY", name="USD/JPY",
        base_price=149.840, volatility=0.00006, display_decimals=3,
        pip_size=0.001, tick_interval_ms=1000,
    ),
    "frxUSDKES": MarketProfile(
        symbol="frxUSDKES", name="USD/KES",
        base_price=129.500, volatility=0.0001, display_decimals=3,
        pip_size=0.001, tick_interval_ms=2000,
    ),

    # ── Crypto (simulated) ────────────────────────────────────────────────────
    "cryBTCUSD": MarketProfile(
        symbol="cryBTCUSD", name="BTC/USD",
        base_price=68_420.00, volatility=0.002, display_decimals=2,
        pip_size=0.01, tick_interval_ms=1000,
    ),
    "cryETHUSD": MarketProfile(
        symbol="cryETHUSD", name="ETH/USD",
        base_price=3_840.00, volatility=0.0025, display_decimals=2,
        pip_size=0.01, tick_interval_ms=1000,
    ),
}


# ─────────────────────────────────────────────────────────────────────────────
# PRICE STATE  — tracks per-market running state
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class PriceState:
    symbol: str
    price: float
    prev_price: float = 0.0
    open_24h: float = 0.0
    high_24h: float = 0.0
    low_24h: float = 0.0
    tick_count: int = 0
    last_spike_tick: int = -999   # Tick index of last boom/crash spike
    _candle_open: float = 0.0
    _candle_high: float = 0.0
    _candle_low: float = float("inf")

    def __post_init__(self):
        self.prev_price = self.price
        self.open_24h = self.price
        self.high_24h = self.price
        self.low_24h = self.price
        self._candle_open = self.price
        self._candle_high = self.price
        self._candle_low = self.price


# Module-level price state registry
_price_states: dict[str, PriceState] = {}


def _get_state(profile: MarketProfile) -> PriceState:
    if profile.symbol not in _price_states:
        _price_states[profile.symbol] = PriceState(
            symbol=profile.symbol,
            price=profile.base_price,
        )
    return _price_states[profile.symbol]


# ─────────────────────────────────────────────────────────────────────────────
# BOX-MULLER GAUSSIAN  (no scipy dependency)
# ─────────────────────────────────────────────────────────────────────────────

def _gauss() -> float:
    """Standard normal sample via Box-Muller transform."""
    u1 = random.random() or 1e-10
    u2 = random.random()
    return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)


# ─────────────────────────────────────────────────────────────────────────────
# CORE TICK GENERATOR
# ─────────────────────────────────────────────────────────────────────────────

def generate_tick(symbol: str) -> dict:
    """
    Generate the next price tick for a given market symbol.

    Returns a dict suitable for JSON serialisation and WebSocket broadcast:
    {
        "symbol":    "R_100",
        "price":     "156.823",
        "ask":       "156.825",
        "bid":       "156.821",
        "epoch":     1714000000,
        "timestamp": "2026-05-14T12:00:00Z",
        "change":    "+0.003",
        "change_pct":"0.002",
        "direction": "up",   # "up" | "down" | "flat"
        "last_digit": 3,
    }
    """
    profile = MARKET_PROFILES.get(symbol)
    if not profile:
        raise ValueError(f"Unknown market symbol: {symbol}")

    state = _get_state(profile)
    state.tick_count += 1
    prev = state.price

    # ── Generate raw price move ───────────────────────────────────────────────
    new_price = _next_price(profile, state)

    # ── Apply price floor (synthetic indices never go negative) ───────────────
    if profile.min_price > 0:
        new_price = max(new_price, profile.min_price)
    else:
        new_price = max(new_price, profile.pip_size)

    if profile.max_price > 0:
        new_price = min(new_price, profile.max_price)

    # ── Round to pip ─────────────────────────────────────────────────────────
    factor = 10 ** profile.display_decimals
    new_price = round(new_price * factor) / factor

    # ── Update state ──────────────────────────────────────────────────────────
    state.prev_price = prev
    state.price = new_price
    state.high_24h = max(state.high_24h, new_price)
    state.low_24h  = min(state.low_24h,  new_price)

    # ── Build output ──────────────────────────────────────────────────────────
    spread = profile.pip_size * 2
    change = new_price - prev
    change_pct = (change / prev * 100) if prev else 0.0
    direction = "up" if change > 0 else ("down" if change < 0 else "flat")

    # Last digit (for digit trade types)
    price_str = f"{new_price:.{profile.display_decimals}f}"
    last_digit = int(price_str[-1])

    epoch = int(time.time())

    return {
        "symbol":     symbol,
        "price":      price_str,
        "ask":        f"{new_price + spread:.{profile.display_decimals}f}",
        "bid":        f"{new_price - spread:.{profile.display_decimals}f}",
        "epoch":      epoch,
        "timestamp":  datetime.now(timezone.utc).isoformat(),
        "change":     f"{change:+.{profile.display_decimals}f}",
        "change_pct": f"{change_pct:+.4f}",
        "change_24h": f"{new_price - state.open_24h:+.{profile.display_decimals}f}",
        "change_pct_24h": f"{((new_price - state.open_24h) / state.open_24h * 100) if state.open_24h else 0:.4f}",
        "high_24h":   f"{state.high_24h:.{profile.display_decimals}f}",
        "low_24h":    f"{state.low_24h:.{profile.display_decimals}f}",
        "open_24h":   f"{state.open_24h:.{profile.display_decimals}f}",
        "direction":  direction,
        "last_digit": last_digit,
        "tick_count": state.tick_count,
        "is_spike":   getattr(state, "_last_was_spike", False),
    }


def _next_price(profile: MarketProfile, state: PriceState) -> float:
    """Compute the next raw price based on market type."""
    price = state.price

    # ── Step Index: only ±pip_size ────────────────────────────────────────────
    if profile.is_step:
        direction = random.choice([-1, 1])
        return price + direction * profile.pip_size

    # ── Normal Brownian motion component ─────────────────────────────────────
    sigma = profile.volatility * price
    normal_move = sigma * _gauss() + profile.drift * price

    # ── Boom Index: rare upward spike, otherwise small downward drift ─────────
    if profile.is_boom:
        state._last_was_spike = False
        if random.random() < profile.spike_probability:
            # Minimum gap between spikes: 50 ticks
            if state.tick_count - state.last_spike_tick > 50:
                state.last_spike_tick = state.tick_count
                state._last_was_spike = True
                spike = profile.spike_magnitude * abs(_gauss() + 1)
                return price + spike
        # Gradual downward drift between booms
        return price + normal_move - abs(normal_move) * 0.3

    # ── Crash Index: rare downward spike, otherwise small upward drift ────────
    if profile.is_crash:
        state._last_was_spike = False
        if random.random() < profile.spike_probability:
            if state.tick_count - state.last_spike_tick > 50:
                state.last_spike_tick = state.tick_count
                state._last_was_spike = True
                spike = profile.spike_magnitude * abs(_gauss() + 1)
                return price - spike
        return price + normal_move + abs(normal_move) * 0.3

    # ── Jump Index: occasional large jump (either direction) ─────────────────
    if profile.is_jump:
        state._last_was_spike = False
        if random.random() < profile.jump_probability:
            state._last_was_spike = True
            direction = random.choice([-1, 1])
            jump = profile.jump_magnitude * (abs(_gauss()) + 0.5)
            return price + direction * jump

    # ── Standard market (Volatility Indices, Forex, Crypto) ──────────────────
    state._last_was_spike = False
    return price + normal_move


# ─────────────────────────────────────────────────────────────────────────────
# CANDLE BUILDER
# Aggregates ticks into OHLC candles at any granularity.
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class CandleBuilder:
    """Accumulates ticks and emits completed OHLC candles."""
    symbol: str
    granularity: int  # seconds

    _open: float = 0.0
    _high: float = 0.0
    _low: float = float("inf")
    _close: float = 0.0
    _volume: int = 0
    _candle_start: float = field(default_factory=time.time)
    _initialized: bool = False

    def feed(self, tick: dict) -> Optional[dict]:
        """
        Feed a tick into the candle builder.
        Returns a completed OHLC candle dict if the candle period has closed,
        otherwise returns None.
        """
        price = float(tick["price"])
        now = time.time()

        if not self._initialized:
            self._open = price
            self._high = price
            self._low = price
            self._close = price
            self._candle_start = now
            self._initialized = True
            return None

        self._high = max(self._high, price)
        self._low  = min(self._low,  price)
        self._close = price
        self._volume += 1

        # Candle complete?
        if now - self._candle_start >= self.granularity:
            candle = {
                "symbol":      self.symbol,
                "granularity": self.granularity,
                "open":        f"{self._open:.8f}",
                "high":        f"{self._high:.8f}",
                "low":         f"{self._low:.8f}",
                "close":       f"{self._close:.8f}",
                "volume":      self._volume,
                "epoch":       int(self._candle_start),
                "timestamp":   datetime.fromtimestamp(
                    self._candle_start, tz=timezone.utc
                ).isoformat(),
            }
            # Reset
            self._open = price
            self._high = price
            self._low = price
            self._volume = 0
            self._candle_start = now
            return candle

        return None


# ─────────────────────────────────────────────────────────────────────────────
# HISTORICAL CANDLE GENERATOR
# Generates a backfill of synthetic OHLC candles.
# ─────────────────────────────────────────────────────────────────────────────

def generate_historical_candles(
    symbol: str,
    granularity: int = 60,
    count: int = 500,
) -> list[dict]:
    """
    Generate `count` historical OHLC candles going back from now.
    Used to seed the TradingView chart on first load.

    Args:
        symbol:      Market symbol (e.g. "R_100")
        granularity: Candle duration in seconds (60 = 1-minute candles)
        count:       Number of candles to generate

    Returns:
        List of OHLC dicts ordered oldest → newest.
    """
    profile = MARKET_PROFILES.get(symbol)
    if not profile:
        raise ValueError(f"Unknown market symbol: {symbol}")

    # Start price: use current state if exists, else base price
    state = _get_state(profile)
    price = state.price

    now_epoch = int(time.time())
    start_epoch = now_epoch - (granularity * count)

    candles = []

    for i in range(count):
        candle_epoch = start_epoch + i * granularity
        # Simulate `granularity` ticks compressed into one candle
        ticks_per_candle = min(granularity, 60)
        o = price

        prices_in_candle = []
        for _ in range(ticks_per_candle):
            price = _next_price(profile, state)
            price = max(price, profile.pip_size)
            factor = 10 ** profile.display_decimals
            price = round(price * factor) / factor
            prices_in_candle.append(price)
            state.price = price

        h = max(prices_in_candle)
        l = min(prices_in_candle)
        c = prices_in_candle[-1]

        decimals = profile.display_decimals
        candles.append({
            "symbol":      symbol,
            "granularity": granularity,
            "open":        f"{o:.{decimals}f}",
            "high":        f"{h:.{decimals}f}",
            "low":         f"{l:.{decimals}f}",
            "close":       f"{c:.{decimals}f}",
            "volume":      ticks_per_candle,
            "epoch":       candle_epoch,
            "timestamp":   datetime.fromtimestamp(
                candle_epoch, tz=timezone.utc
            ).isoformat(),
        })

    return candles


# ─────────────────────────────────────────────────────────────────────────────
# PAYOUT CALCULATOR
# Determines payout percentage for a given market + trade type + duration.
# ─────────────────────────────────────────────────────────────────────────────

PAYOUT_TABLE: dict[str, dict] = {
    # contract_type → {base_pct, duration_modifier, volatility_bonus}
    "CALL":       {"base": 85.0, "dur_mod": 0.5,  "vol_bonus": 0.1},
    "PUT":        {"base": 85.0, "dur_mod": 0.5,  "vol_bonus": 0.1},
    "DIGITODD":   {"base": 95.0, "dur_mod": 0.0,  "vol_bonus": 0.0},
    "DIGITEVEN":  {"base": 95.0, "dur_mod": 0.0,  "vol_bonus": 0.0},
    "DIGITMATCH": {"base": 900.0,"dur_mod": 0.0,  "vol_bonus": 0.0},
    "DIGITDIFF":  {"base": 5.0,  "dur_mod": 0.0,  "vol_bonus": 0.0},
    "DIGITOVER":  {"base": 35.0, "dur_mod": 0.0,  "vol_bonus": 0.0},
    "DIGITUNDER": {"base": 35.0, "dur_mod": 0.0,  "vol_bonus": 0.0},
    "ONETOUCH":   {"base": 75.0, "dur_mod": 1.0,  "vol_bonus": 0.2},
    "NOTOUCH":    {"base": 75.0, "dur_mod": 1.0,  "vol_bonus": 0.2},
    "ASIANU":     {"base": 80.0, "dur_mod": 0.3,  "vol_bonus": 0.1},
    "ASIAND":     {"base": 80.0, "dur_mod": 0.3,  "vol_bonus": 0.1},
    "RESETCALL":  {"base": 78.0, "dur_mod": 0.5,  "vol_bonus": 0.1},
    "RESETPUT":   {"base": 78.0, "dur_mod": 0.5,  "vol_bonus": 0.1},
    "LBFLOATCALL":{"base": 1.0,  "dur_mod": 0.5,  "vol_bonus": 0.3},  # per pip
    "LBFLOATPUT": {"base": 1.0,  "dur_mod": 0.5,  "vol_bonus": 0.3},
    "LBHIGHLOW":  {"base": 2.0,  "dur_mod": 0.5,  "vol_bonus": 0.3},
}


def calculate_payout(
    contract_type: str,
    stake: float,
    duration_seconds: int,
    market_volatility: float = 10.0,  # platform volatility %
) -> dict:
    """
    Calculate the payout for a given contract.

    Returns:
        {
            "payout_pct": 87.5,
            "payout_amount": 1.875,   # profit (not including stake)
            "total_return": 2.875,    # stake + profit
        }
    """
    row = PAYOUT_TABLE.get(contract_type)
    if not row:
        row = {"base": 80.0, "dur_mod": 0.3, "vol_bonus": 0.1}

    base = row["base"]

    # Duration bonus: longer duration = slightly lower payout (more time = more risk for house)
    dur_bonus = min(row["dur_mod"] * math.log(max(duration_seconds, 1) + 1), 5.0)

    # Volatility bonus: higher volatility index = slightly higher payout
    vol_bonus = row["vol_bonus"] * (market_volatility / 10.0)

    # Small random spread ±2% to simulate dynamic pricing
    spread = random.uniform(-2.0, 2.0)

    pct = min(max(base + dur_bonus + vol_bonus + spread, 1.0), 950.0)
    pct = round(pct, 2)

    profit = round(stake * pct / 100, 8)
    total  = round(stake + profit, 8)

    return {
        "payout_pct":    pct,
        "payout_amount": profit,
        "total_return":  total,
    }


# ─────────────────────────────────────────────────────────────────────────────
# TRADE RESULT RESOLVER
# Determines if an open trade has won or lost based on price movement.
# ─────────────────────────────────────────────────────────────────────────────

def resolve_trade_result(
    contract_type: str,
    entry_price: float,
    exit_price: float,
    barrier: Optional[float] = None,
    barrier_2: Optional[float] = None,
    selected_digit: Optional[int] = None,
    entry_last_digit: Optional[int] = None,
    exit_last_digit: Optional[int] = None,
    ticks: Optional[list[float]] = None,  # All ticks during contract lifetime
) -> dict:
    """
    Resolve whether a trade won or lost.

    Returns:
        {
            "won": True,
            "exit_price": 156.823,
            "exit_digit": 3,
            "description": "Price rose from 156.800 to 156.823",
        }
    """
    won = False
    description = ""
    ticks = ticks or [entry_price, exit_price]

    ct = contract_type.upper()

    if ct == "CALL":   # Rise
        won = exit_price > entry_price
        description = f"Price {'rose' if won else 'fell'} from {entry_price} to {exit_price}"

    elif ct == "PUT":  # Fall
        won = exit_price < entry_price
        description = f"Price {'fell' if won else 'rose'} from {entry_price} to {exit_price}"

    elif ct == "DIGITODD":
        won = exit_last_digit is not None and exit_last_digit % 2 != 0
        description = f"Last digit was {exit_last_digit} ({'odd ✓' if won else 'even ✗'})"

    elif ct == "DIGITEVEN":
        won = exit_last_digit is not None and exit_last_digit % 2 == 0
        description = f"Last digit was {exit_last_digit} ({'even ✓' if won else 'odd ✗'})"

    elif ct == "DIGITMATCH":
        won = exit_last_digit is not None and exit_last_digit == selected_digit
        description = f"Last digit was {exit_last_digit}, selected {selected_digit} ({'match ✓' if won else 'no match ✗'})"

    elif ct == "DIGITDIFF":
        won = exit_last_digit is not None and exit_last_digit != selected_digit
        description = f"Last digit was {exit_last_digit}, selected {selected_digit} ({'differs ✓' if won else 'same ✗'})"

    elif ct == "DIGITOVER":
        won = exit_last_digit is not None and selected_digit is not None and exit_last_digit > selected_digit
        description = f"Last digit {exit_last_digit} {'> ' + str(selected_digit) + ' ✓' if won else '<= ' + str(selected_digit) + ' ✗'}"

    elif ct == "DIGITUNDER":
        won = exit_last_digit is not None and selected_digit is not None and exit_last_digit < selected_digit
        description = f"Last digit {exit_last_digit} {'< ' + str(selected_digit) + ' ✓' if won else '>= ' + str(selected_digit) + ' ✗'}"

    elif ct == "ONETOUCH":
        if barrier is not None:
            touched = any(t >= barrier for t in ticks) if entry_price < barrier else any(t <= barrier for t in ticks)
            won = touched
            description = f"Price {'touched' if won else 'did not touch'} barrier at {barrier}"
        else:
            won = False
            description = "No barrier set"

    elif ct == "NOTOUCH":
        if barrier is not None:
            touched = any(t >= barrier for t in ticks) if entry_price < barrier else any(t <= barrier for t in ticks)
            won = not touched
            description = f"Price {'did not touch' if won else 'touched'} barrier at {barrier}"
        else:
            won = True
            description = "No barrier — won by default"

    elif ct == "ASIANU":
        avg = sum(ticks) / len(ticks) if ticks else entry_price
        won = exit_price > avg
        description = f"Exit {exit_price} vs average {avg:.5f} ({'above ✓' if won else 'below ✗'})"

    elif ct == "ASIAND":
        avg = sum(ticks) / len(ticks) if ticks else entry_price
        won = exit_price < avg
        description = f"Exit {exit_price} vs average {avg:.5f} ({'below ✓' if won else 'above ✗'})"

    elif ct in ("RESETCALL", "RESETPUT"):
        # After reset, only the second half of ticks matter
        mid = len(ticks) // 2
        second_half = ticks[mid:] if len(ticks) > 1 else ticks
        reset_price = second_half[0] if second_half else entry_price
        if ct == "RESETCALL":
            won = exit_price > reset_price
            description = f"Price {'rose' if won else 'fell'} from reset price {reset_price}"
        else:
            won = exit_price < reset_price
            description = f"Price {'fell' if won else 'rose'} from reset price {reset_price}"

    elif ct in ("LBFLOATCALL", "LBFLOATPUT", "LBHIGHLOW"):
        # Lookback: always wins, payout = range × multiplier
        won = True
        hi = max(ticks)
        lo = min(ticks)
        description = f"Lookback range: {lo} – {hi}"

    else:
        # Unknown contract type — coin flip as fallback
        won = random.random() > 0.5
        description = f"Unknown contract type {ct}"

    return {
        "won":         won,
        "exit_price":  exit_price,
        "exit_digit":  exit_last_digit,
        "description": description,
    }


# ─────────────────────────────────────────────────────────────────────────────
# MARKET INFO HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def get_market_profile(symbol: str) -> Optional[MarketProfile]:
    return MARKET_PROFILES.get(symbol)


def get_current_price(symbol: str) -> Optional[str]:
    """Return current simulated price string for a symbol."""
    profile = MARKET_PROFILES.get(symbol)
    if not profile:
        return None
    state = _get_state(profile)
    return f"{state.price:.{profile.display_decimals}f}"


def list_symbols() -> list[str]:
    return list(MARKET_PROFILES.keys())


def seed_market_state(symbol: str, price: float) -> None:
    """Force a market's current price (e.g. when loading from DB)."""
    profile = MARKET_PROFILES.get(symbol)
    if not profile:
        return
    _price_states[symbol] = PriceState(symbol=symbol, price=price)


def reset_market_state(symbol: str) -> None:
    """Reset a market back to its base price."""
    profile = MARKET_PROFILES.get(symbol)
    if not profile:
        return
    _price_states[symbol] = PriceState(symbol=symbol, price=profile.base_price)


def reset_all_states() -> None:
    """Reset all markets (useful on server restart)."""
    _price_states.clear()
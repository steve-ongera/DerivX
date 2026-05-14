# core/management/commands/seed_markets.py
"""
Management command to seed initial markets, categories and trade types.
Usage: python manage.py seed_markets
"""
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils.text import slugify


class Command(BaseCommand):
    help = "Seed initial market categories, markets and trade types"

    def handle(self, *args, **options):
        from core.models import MarketCategory, Market, TradeType

        self.stdout.write(self.style.MIGRATE_HEADING("Seeding DerivX markets…"))

        # ── 1. Categories ──────────────────────────────────────────
        CATEGORIES = [
            {"name": "Synthetic Indices", "icon": "bi-cpu",          "order": 1},
            {"name": "Forex",             "icon": "bi-currency-exchange", "order": 2},
            {"name": "Cryptocurrencies",  "icon": "bi-currency-bitcoin",  "order": 3},
            {"name": "Commodities",       "icon": "bi-gem",           "order": 4},
            {"name": "Stock Indices",     "icon": "bi-graph-up",      "order": 5},
        ]
        categories = {}
        for cat_data in CATEGORIES:
            slug = slugify(cat_data["name"])
            cat, created = MarketCategory.objects.update_or_create(
                slug=slug,
                defaults={**cat_data, "slug": slug, "is_active": True},
            )
            categories[cat_data["name"]] = cat
            status = "created" if created else "updated"
            self.stdout.write(f"  Category {status}: {cat.name}")

        # ── 2. Markets ─────────────────────────────────────────────
        MARKETS = [
            # Synthetic Indices
            {"name": "Volatility 10 Index",    "symbol": "R_10",      "category": "Synthetic Indices", "volatility": Decimal("2.5"),  "minimum_stake": Decimal("0.35"), "display_decimals": 3, "current_price": Decimal("6543.210"), "is_featured": True},
            {"name": "Volatility 25 Index",    "symbol": "R_25",      "category": "Synthetic Indices", "volatility": Decimal("5.0"),  "minimum_stake": Decimal("0.35"), "display_decimals": 3, "current_price": Decimal("2345.678"), "is_featured": True},
            {"name": "Volatility 50 Index",    "symbol": "R_50",      "category": "Synthetic Indices", "volatility": Decimal("10.0"), "minimum_stake": Decimal("0.35"), "display_decimals": 2, "current_price": Decimal("1234.56"),  "is_featured": True},
            {"name": "Volatility 75 Index",    "symbol": "R_75",      "category": "Synthetic Indices", "volatility": Decimal("15.0"), "minimum_stake": Decimal("0.35"), "display_decimals": 2, "current_price": Decimal("987.65"),   "is_featured": True},
            {"name": "Volatility 100 Index",   "symbol": "R_100",     "category": "Synthetic Indices", "volatility": Decimal("20.0"), "minimum_stake": Decimal("0.35"), "display_decimals": 2, "current_price": Decimal("3456.78"),  "is_featured": True},
            {"name": "Boom 500 Index",         "symbol": "BOOM500",   "category": "Synthetic Indices", "volatility": Decimal("12.0"), "minimum_stake": Decimal("0.35"), "display_decimals": 2, "current_price": Decimal("7654.32"),  "is_featured": False},
            {"name": "Boom 1000 Index",        "symbol": "BOOM1000",  "category": "Synthetic Indices", "volatility": Decimal("8.0"),  "minimum_stake": Decimal("0.35"), "display_decimals": 2, "current_price": Decimal("5432.10"),  "is_featured": False},
            {"name": "Crash 500 Index",        "symbol": "CRASH500",  "category": "Synthetic Indices", "volatility": Decimal("12.0"), "minimum_stake": Decimal("0.35"), "display_decimals": 2, "current_price": Decimal("4321.09"),  "is_featured": False},
            {"name": "Crash 1000 Index",       "symbol": "CRASH1000", "category": "Synthetic Indices", "volatility": Decimal("8.0"),  "minimum_stake": Decimal("0.35"), "display_decimals": 2, "current_price": Decimal("3210.98"),  "is_featured": False},
            {"name": "Step Index",             "symbol": "STEP_INDEX","category": "Synthetic Indices", "volatility": Decimal("0.1"),  "minimum_stake": Decimal("0.35"), "display_decimals": 2, "current_price": Decimal("9876.54"),  "is_featured": False},
            # Forex
            {"name": "EUR/USD",  "symbol": "frxEURUSD", "category": "Forex", "volatility": Decimal("1.5"), "minimum_stake": Decimal("1.00"), "display_decimals": 5, "current_price": Decimal("1.08456"), "is_featured": True},
            {"name": "GBP/USD",  "symbol": "frxGBPUSD", "category": "Forex", "volatility": Decimal("2.0"), "minimum_stake": Decimal("1.00"), "display_decimals": 5, "current_price": Decimal("1.27834"), "is_featured": True},
            {"name": "USD/JPY",  "symbol": "frxUSDJPY", "category": "Forex", "volatility": Decimal("1.8"), "minimum_stake": Decimal("1.00"), "display_decimals": 3, "current_price": Decimal("149.432"), "is_featured": False},
            {"name": "USD/KES",  "symbol": "frxUSDKES", "category": "Forex", "volatility": Decimal("2.2"), "minimum_stake": Decimal("1.00"), "display_decimals": 2, "current_price": Decimal("129.45"),  "is_featured": True},
            # Crypto
            {"name": "BTC/USD",  "symbol": "cryBTCUSD", "category": "Cryptocurrencies", "volatility": Decimal("30.0"), "minimum_stake": Decimal("1.00"), "display_decimals": 2, "current_price": Decimal("67432.50"), "is_featured": True},
            {"name": "ETH/USD",  "symbol": "cryETHUSD", "category": "Cryptocurrencies", "volatility": Decimal("25.0"), "minimum_stake": Decimal("1.00"), "display_decimals": 2, "current_price": Decimal("3456.78"),  "is_featured": True},
            # Commodities
            {"name": "Gold/USD", "symbol": "frxXAUUSD", "category": "Commodities", "volatility": Decimal("3.0"), "minimum_stake": Decimal("1.00"), "display_decimals": 2, "current_price": Decimal("2345.67"), "is_featured": False},
            {"name": "Oil/USD",  "symbol": "frxBROUSD", "category": "Commodities", "volatility": Decimal("4.0"), "minimum_stake": Decimal("1.00"), "display_decimals": 2, "current_price": Decimal("78.45"),   "is_featured": False},
        ]

        created_markets = []
        for m in MARKETS:
            cat  = categories[m.pop("category")]
            slug = slugify(m["name"])
            market, created = Market.objects.update_or_create(
                symbol=m["symbol"],
                defaults={
                    **m,
                    "slug":             slug,
                    "category":         cat,
                    "status":           "open",
                    "is_active":        True,
                    "price_feed_source":"simulated",
                    "maximum_stake":    Decimal("50000.00"),
                    "minimum_duration_seconds": 5,
                    "maximum_duration_seconds": 86400,
                    "meta_title":       f"Trade {m['name']} | DerivX",
                    "meta_description": f"Trade binary options on {m['name']} with payouts up to 95%. Rise/Fall, Even/Odd and more.",
                },
            )
            created_markets.append(market)
            status = "created" if created else "updated"
            self.stdout.write(f"  Market {status}: {market.name}")

        # ── 3. Trade Types ─────────────────────────────────────────
        TRADE_TYPES = [
            # Up/Down
            {"name": "Rise",         "display_name": "Rise",         "contract_category": "updown",       "contract_type": "CALL",        "min_payout_pct": Decimal("75"), "max_payout_pct": Decimal("95"), "icon": "bi-arrow-up-circle-fill",   "requires_barrier": False, "requires_last_digit": False, "order": 1},
            {"name": "Fall",         "display_name": "Fall",         "contract_category": "updown",       "contract_type": "PUT",         "min_payout_pct": Decimal("75"), "max_payout_pct": Decimal("95"), "icon": "bi-arrow-down-circle-fill", "requires_barrier": False, "requires_last_digit": False, "order": 2},
            # Higher/Lower
            {"name": "Higher",       "display_name": "Higher",       "contract_category": "highlow",      "contract_type": "CALLE",       "min_payout_pct": Decimal("70"), "max_payout_pct": Decimal("90"), "icon": "bi-chevron-double-up",      "requires_barrier": True,  "requires_last_digit": False, "order": 3},
            {"name": "Lower",        "display_name": "Lower",        "contract_category": "highlow",      "contract_type": "PUTE",        "min_payout_pct": Decimal("70"), "max_payout_pct": Decimal("90"), "icon": "bi-chevron-double-down",    "requires_barrier": True,  "requires_last_digit": False, "order": 4},
            # Touch
            {"name": "Touch",        "display_name": "Touch",        "contract_category": "touchnotouch", "contract_type": "ONETOUCH",    "min_payout_pct": Decimal("100"), "max_payout_pct": Decimal("250"), "icon": "bi-hand-index",            "requires_barrier": True,  "requires_last_digit": False, "order": 5},
            {"name": "No Touch",     "display_name": "No Touch",     "contract_category": "touchnotouch", "contract_type": "NOTOUCH",     "min_payout_pct": Decimal("60"), "max_payout_pct": Decimal("85"), "icon": "bi-hand-index-thumb",      "requires_barrier": True,  "requires_last_digit": False, "order": 6},
            # Digits
            {"name": "Even",         "display_name": "Even",         "contract_category": "digits",       "contract_type": "DIGITEVEN",   "min_payout_pct": Decimal("80"), "max_payout_pct": Decimal("95"), "icon": "bi-calculator",             "requires_barrier": False, "requires_last_digit": False, "order": 7},
            {"name": "Odd",          "display_name": "Odd",          "contract_category": "digits",       "contract_type": "DIGITODD",    "min_payout_pct": Decimal("80"), "max_payout_pct": Decimal("95"), "icon": "bi-123",                    "requires_barrier": False, "requires_last_digit": False, "order": 8},
            {"name": "Matches",      "display_name": "Matches",      "contract_category": "digits",       "contract_type": "DIGITMATCH",  "min_payout_pct": Decimal("300"), "max_payout_pct": Decimal("750"), "icon": "bi-check2-circle",        "requires_barrier": False, "requires_last_digit": True,  "order": 9},
            {"name": "Differs",      "display_name": "Differs",      "contract_category": "digits",       "contract_type": "DIGITDIFF",   "min_payout_pct": Decimal("75"), "max_payout_pct": Decimal("90"), "icon": "bi-x-circle",              "requires_barrier": False, "requires_last_digit": True,  "order": 10},
            {"name": "Over",         "display_name": "Over",         "contract_category": "digits",       "contract_type": "DIGITOVER",   "min_payout_pct": Decimal("75"), "max_payout_pct": Decimal("95"), "icon": "bi-chevron-up",             "requires_barrier": False, "requires_last_digit": True,  "order": 11},
            {"name": "Under",        "display_name": "Under",        "contract_category": "digits",       "contract_type": "DIGITUNDER",  "min_payout_pct": Decimal("75"), "max_payout_pct": Decimal("95"), "icon": "bi-chevron-down",           "requires_barrier": False, "requires_last_digit": True,  "order": 12},
            # Asian
            {"name": "Asian Up",     "display_name": "Asian Up",     "contract_category": "asian",        "contract_type": "ASIANU",      "min_payout_pct": Decimal("80"), "max_payout_pct": Decimal("90"), "icon": "bi-graph-up-arrow",         "requires_barrier": False, "requires_last_digit": False, "order": 13},
            {"name": "Asian Down",   "display_name": "Asian Down",   "contract_category": "asian",        "contract_type": "ASIAND",      "min_payout_pct": Decimal("80"), "max_payout_pct": Decimal("90"), "icon": "bi-graph-down-arrow",       "requires_barrier": False, "requires_last_digit": False, "order": 14},
        ]

        for tt_data in TRADE_TYPES:
            slug = slugify(tt_data["name"])
            tt, created = TradeType.objects.update_or_create(
                slug=slug,
                defaults={
                    **tt_data,
                    "slug":      slug,
                    "is_active": True,
                    "supports_robots": True,
                },
            )
            # Attach to all created markets
            tt.available_on_markets.set(created_markets)
            status = "created" if created else "updated"
            self.stdout.write(f"  TradeType {status}: {tt.display_name}")

        # ── 4. System Settings ─────────────────────────────────────
        from core.models import SystemSetting
        SETTINGS = [
            {"key": "maintenance_mode",        "value": "false",  "value_type": "boolean", "description": "Put platform in maintenance mode",              "is_public": True},
            {"key": "default_payout_pct",      "value": "85.00",  "value_type": "decimal", "description": "Default payout percentage for binary trades",   "is_public": True},
            {"key": "max_open_trades",         "value": "50",     "value_type": "integer", "description": "Max simultaneous open trades per user",          "is_public": True},
            {"key": "demo_starting_balance",   "value": "10000",  "value_type": "decimal", "description": "Demo account starting balance in USD",           "is_public": True},
            {"key": "min_deposit_mpesa",       "value": "10",     "value_type": "decimal", "description": "Minimum M-Pesa deposit in KES",                  "is_public": True},
            {"key": "min_deposit_paypal",      "value": "5",      "value_type": "decimal", "description": "Minimum PayPal deposit in USD",                  "is_public": True},
            {"key": "min_withdrawal_mpesa",    "value": "50",     "value_type": "decimal", "description": "Minimum M-Pesa withdrawal in KES",               "is_public": True},
            {"key": "welcome_bonus_enabled",   "value": "false",  "value_type": "boolean", "description": "Enable welcome bonus for new users",             "is_public": True},
            {"key": "welcome_bonus_amount",    "value": "10.00",  "value_type": "decimal", "description": "Welcome bonus amount in USD",                    "is_public": False},
            {"key": "price_tick_interval_ms",  "value": "1000",   "value_type": "integer", "description": "Simulated price tick interval in milliseconds",  "is_public": False},
        ]
        for s in SETTINGS:
            SystemSetting.objects.update_or_create(key=s["key"], defaults=s)
            self.stdout.write(f"  Setting: {s['key']} = {s['value']}")

        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Seed complete! "
            f"{len(MARKETS)} markets, {len(TRADE_TYPES)} trade types, "
            f"{len(CATEGORIES)} categories, {len(SETTINGS)} system settings."
        ))
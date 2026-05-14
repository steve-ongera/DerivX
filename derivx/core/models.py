"""
core/models.py — DerivX Trading Platform
All models for the single 'core' application.
"""

import uuid
from decimal import Decimal
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def user_avatar_path(instance, filename):
    return f"avatars/user_{instance.user.id}/{filename}"


def kyc_document_path(instance, filename):
    return f"kyc/user_{instance.user.id}/{filename}"


# ─────────────────────────────────────────────
# 1. USER & PROFILE
# ─────────────────────────────────────────────

class User(AbstractUser):
    """
    Custom user model extending AbstractUser.
    Email is the primary login identifier.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_("email address"), unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    is_email_verified = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)
    date_of_birth = models.DateField(null=True, blank=True)
    country = models.CharField(max_length=100, blank=True)
    currency = models.CharField(
        max_length=10,
        default="USD",
        choices=[
            ("USD", "US Dollar"),
            ("EUR", "Euro"),
            ("GBP", "British Pound"),
            ("KES", "Kenyan Shilling"),
            ("BTC", "Bitcoin"),
            ("USDT", "Tether USDT"),
        ],
    )
    referral_code = models.CharField(max_length=20, unique=True, blank=True)
    referred_by = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="referrals",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.email} ({self.get_full_name()})"

    def save(self, *args, **kwargs):
        if not self.referral_code:
            self.referral_code = str(self.id).split("-")[0].upper()
        super().save(*args, **kwargs)


class UserProfile(models.Model):
    """Extended profile: KYC docs, preferences, avatar."""

    class KYCStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        SUBMITTED = "submitted", "Submitted"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"

    class RiskLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    avatar = models.ImageField(upload_to=user_avatar_path, null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    kyc_status = models.CharField(
        max_length=20,
        choices=KYCStatus.choices,
        default=KYCStatus.PENDING,
    )
    kyc_document_front = models.FileField(
        upload_to=kyc_document_path, null=True, blank=True
    )
    kyc_document_back = models.FileField(
        upload_to=kyc_document_path, null=True, blank=True
    )
    kyc_selfie = models.FileField(upload_to=kyc_document_path, null=True, blank=True)
    risk_level = models.CharField(
        max_length=10, choices=RiskLevel.choices, default=RiskLevel.LOW
    )
    two_factor_enabled = models.BooleanField(default=False)
    notifications_email = models.BooleanField(default=True)
    notifications_sms = models.BooleanField(default=False)
    notifications_push = models.BooleanField(default=True)
    timezone = models.CharField(max_length=50, default="UTC")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_profiles"
        verbose_name = "User Profile"

    def __str__(self):
        return f"Profile: {self.user.email}"


# ─────────────────────────────────────────────
# 2. WALLET & TRANSACTIONS
# ─────────────────────────────────────────────

class Wallet(models.Model):
    """
    Each user can have multiple wallets per currency.
    Main trading balance lives here.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="wallets")
    currency = models.CharField(
        max_length=10,
        choices=[
            ("USD", "US Dollar"),
            ("EUR", "Euro"),
            ("GBP", "British Pound"),
            ("KES", "Kenyan Shilling"),
            ("BTC", "Bitcoin"),
            ("USDT", "Tether USDT"),
            ("ETH", "Ethereum"),
        ],
    )
    balance = models.DecimalField(
        max_digits=20, decimal_places=8, default=Decimal("0.00000000")
    )
    demo_balance = models.DecimalField(
        max_digits=20, decimal_places=8, default=Decimal("10000.00000000")
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "wallets"
        unique_together = ("user", "currency")
        verbose_name = "Wallet"

    def __str__(self):
        return f"{self.user.email} — {self.currency}: {self.balance}"

    def credit(self, amount):
        self.balance += Decimal(str(amount))
        self.save(update_fields=["balance", "updated_at"])

    def debit(self, amount):
        amount = Decimal(str(amount))
        if self.balance < amount:
            raise ValueError("Insufficient balance")
        self.balance -= amount
        self.save(update_fields=["balance", "updated_at"])


class Transaction(models.Model):
    """Master ledger for all money movements."""

    class TransactionType(models.TextChoices):
        DEPOSIT = "deposit", "Deposit"
        WITHDRAWAL = "withdrawal", "Withdrawal"
        TRADE_OPEN = "trade_open", "Trade Open"
        TRADE_WIN = "trade_win", "Trade Win"
        TRADE_LOSS = "trade_loss", "Trade Loss"
        TRADE_REFUND = "trade_refund", "Trade Refund"
        BONUS = "bonus", "Bonus"
        REFERRAL = "referral", "Referral Reward"
        FEE = "fee", "Fee"

    class TransactionStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"
        REVERSED = "reversed", "Reversed"

    class PaymentMethod(models.TextChoices):
        MPESA = "mpesa", "M-Pesa"
        PAYPAL = "paypal", "PayPal"
        BINANCE = "binance", "Binance Pay"
        CRYPTO = "crypto", "Crypto Wallet"
        INTERNAL = "internal", "Internal"
        BANK = "bank", "Bank Transfer"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="transactions"
    )
    wallet = models.ForeignKey(
        Wallet, on_delete=models.CASCADE, related_name="transactions"
    )
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.INTERNAL,
    )
    amount = models.DecimalField(max_digits=20, decimal_places=8)
    currency = models.CharField(max_length=10, default="USD")
    fee = models.DecimalField(max_digits=20, decimal_places=8, default=Decimal("0.00"))
    net_amount = models.DecimalField(max_digits=20, decimal_places=8)
    balance_before = models.DecimalField(max_digits=20, decimal_places=8)
    balance_after = models.DecimalField(max_digits=20, decimal_places=8)
    status = models.CharField(
        max_length=20,
        choices=TransactionStatus.choices,
        default=TransactionStatus.PENDING,
    )
    reference = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "transactions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "transaction_type"]),
            models.Index(fields=["status"]),
            models.Index(fields=["reference"]),
        ]

    def __str__(self):
        return f"{self.user.email} | {self.transaction_type} | {self.amount} {self.currency}"

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f"TXN-{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)


# ─────────────────────────────────────────────
# 3. PAYMENT GATEWAYS
# ─────────────────────────────────────────────

class MpesaTransaction(models.Model):
    """Logs every M-Pesa STK push or B2C call."""

    class MpesaType(models.TextChoices):
        STK_PUSH = "stk_push", "STK Push (Deposit)"
        B2C = "b2c", "B2C (Withdrawal)"

    class MpesaStatus(models.TextChoices):
        INITIATED = "initiated", "Initiated"
        PENDING = "pending", "Pending"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled (by user)"
        TIMEOUT = "timeout", "Timeout"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.OneToOneField(
        Transaction,
        on_delete=models.CASCADE,
        related_name="mpesa",
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="mpesa_transactions"
    )
    mpesa_type = models.CharField(max_length=20, choices=MpesaType.choices)
    phone_number = models.CharField(max_length=15)  # e.g. 254712345678
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    # Safaricom references
    merchant_request_id = models.CharField(max_length=100, blank=True)
    checkout_request_id = models.CharField(max_length=100, blank=True, db_index=True)
    mpesa_receipt_number = models.CharField(max_length=50, blank=True)
    conversation_id = models.CharField(max_length=100, blank=True)
    originator_conversation_id = models.CharField(max_length=100, blank=True)
    # Status
    status = models.CharField(
        max_length=20, choices=MpesaStatus.choices, default=MpesaStatus.INITIATED
    )
    result_code = models.CharField(max_length=10, blank=True)
    result_desc = models.TextField(blank=True)
    raw_response = models.JSONField(default=dict, blank=True)
    raw_callback = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "mpesa_transactions"
        ordering = ["-created_at"]
        verbose_name = "M-Pesa Transaction"

    def __str__(self):
        return f"M-Pesa {self.mpesa_type} | {self.phone_number} | KES {self.amount} | {self.status}"


class PaypalTransaction(models.Model):
    """Logs PayPal orders and payouts."""

    class PaypalType(models.TextChoices):
        DEPOSIT = "deposit", "Deposit (Order)"
        WITHDRAWAL = "withdrawal", "Withdrawal (Payout)"

    class PaypalStatus(models.TextChoices):
        CREATED = "created", "Created"
        APPROVED = "approved", "Approved"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"
        PENDING = "pending", "Pending"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.OneToOneField(
        Transaction,
        on_delete=models.CASCADE,
        related_name="paypal",
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="paypal_transactions"
    )
    paypal_type = models.CharField(max_length=20, choices=PaypalType.choices)
    paypal_order_id = models.CharField(max_length=100, blank=True, db_index=True)
    paypal_payout_id = models.CharField(max_length=100, blank=True)
    payer_email = models.EmailField(blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default="USD")
    status = models.CharField(
        max_length=20, choices=PaypalStatus.choices, default=PaypalStatus.CREATED
    )
    raw_response = models.JSONField(default=dict, blank=True)
    raw_webhook = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "paypal_transactions"
        ordering = ["-created_at"]
        verbose_name = "PayPal Transaction"

    def __str__(self):
        return f"PayPal {self.paypal_type} | {self.user.email} | {self.currency} {self.amount} | {self.status}"


class BinanceTransaction(models.Model):
    """Logs Binance Pay orders and crypto withdrawals."""

    class BinanceType(models.TextChoices):
        DEPOSIT = "deposit", "Deposit (Binance Pay)"
        WITHDRAWAL = "withdrawal", "Withdrawal (Crypto)"

    class BinanceStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        CANCELLED = "cancelled", "Cancelled"
        ERROR = "error", "Error"
        COMPLETED = "completed", "Completed"
        PROCESSING = "processing", "Processing"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.OneToOneField(
        Transaction,
        on_delete=models.CASCADE,
        related_name="binance",
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="binance_transactions"
    )
    binance_type = models.CharField(max_length=20, choices=BinanceType.choices)
    binance_order_id = models.CharField(max_length=100, blank=True, db_index=True)
    prepay_id = models.CharField(max_length=100, blank=True)
    # Crypto details
    coin = models.CharField(max_length=20, default="USDT")  # USDT, BTC, ETH, BNB
    network = models.CharField(max_length=20, blank=True)   # BSC, TRC20, ERC20
    wallet_address = models.CharField(max_length=200, blank=True)
    amount = models.DecimalField(max_digits=20, decimal_places=8)
    usd_equivalent = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20, choices=BinanceStatus.choices, default=BinanceStatus.PENDING
    )
    tx_hash = models.CharField(max_length=200, blank=True)  # blockchain tx hash
    raw_response = models.JSONField(default=dict, blank=True)
    raw_webhook = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "binance_transactions"
        ordering = ["-created_at"]
        verbose_name = "Binance Transaction"

    def __str__(self):
        return f"Binance {self.binance_type} | {self.coin} {self.amount} | {self.status}"


# ─────────────────────────────────────────────
# 4. MARKETS
# ─────────────────────────────────────────────

class MarketCategory(models.Model):
    """Groups markets: Forex, Crypto, Indices, Synthetics, Commodities."""
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)   # Bootstrap Icon class
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "market_categories"
        ordering = ["order", "name"]
        verbose_name = "Market Category"
        verbose_name_plural = "Market Categories"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Market(models.Model):
    """
    A tradable asset/market. Each market has a slug used in URLs for SEO.
    Example: /markets/volatility-100-index/ or /trade/boom-1000-index/
    """

    class MarketStatus(models.TextChoices):
        OPEN = "open", "Open"
        CLOSED = "closed", "Closed"
        MAINTENANCE = "maintenance", "Maintenance"
        SUSPENDED = "suspended", "Suspended"

    class PriceFeedSource(models.TextChoices):
        SIMULATED = "simulated", "Simulated (Synthetic)"
        LIVE_API = "live_api", "Live Market API"
        BINANCE_WS = "binance_ws", "Binance WebSocket"
        DERIV_API = "deriv_api", "Deriv API"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(
        MarketCategory, on_delete=models.CASCADE, related_name="markets"
    )
    name = models.CharField(max_length=150)                     # e.g. "Volatility 100 Index"
    slug = models.SlugField(max_length=180, unique=True)        # volatility-100-index
    symbol = models.CharField(max_length=30, unique=True)       # e.g. R_100
    description = models.TextField(blank=True)
    # SEO fields
    meta_title = models.CharField(max_length=70, blank=True)
    meta_description = models.CharField(max_length=160, blank=True)
    # Display
    icon = models.CharField(max_length=50, blank=True)
    display_decimals = models.PositiveIntegerField(default=2)
    pip_size = models.DecimalField(max_digits=10, decimal_places=8, default=Decimal("0.01"))
    # Trading config
    minimum_stake = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.35"))
    maximum_stake = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("50000.00"))
    minimum_duration_seconds = models.PositiveIntegerField(default=5)
    maximum_duration_seconds = models.PositiveIntegerField(default=31536000)  # 1 year
    # Price feed
    current_price = models.DecimalField(max_digits=20, decimal_places=8, default=Decimal("0.00"))
    price_change_24h = models.DecimalField(max_digits=10, decimal_places=4, default=Decimal("0.0000"))
    price_change_pct_24h = models.DecimalField(max_digits=10, decimal_places=4, default=Decimal("0.0000"))
    volatility = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("10.00"))  # %
    price_feed_source = models.CharField(
        max_length=20, choices=PriceFeedSource.choices, default=PriceFeedSource.SIMULATED
    )
    # Status
    status = models.CharField(
        max_length=20, choices=MarketStatus.choices, default=MarketStatus.OPEN
    )
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "markets"
        ordering = ["-is_featured", "category", "name"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["symbol"]),
            models.Index(fields=["status", "is_active"]),
        ]
        verbose_name = "Market"

    def __str__(self):
        return f"{self.name} ({self.symbol})"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        from django.urls import reverse
        return reverse("market-detail", kwargs={"slug": self.slug})


class PriceCandle(models.Model):
    """
    OHLC candlestick data for charts.
    Stored per market per timeframe granularity.
    """

    class Granularity(models.IntegerChoices):
        TICK = 1, "1 Tick"
        ONE_MIN = 60, "1 Minute"
        TWO_MIN = 120, "2 Minutes"
        FIVE_MIN = 300, "5 Minutes"
        TEN_MIN = 600, "10 Minutes"
        FIFTEEN_MIN = 900, "15 Minutes"
        THIRTY_MIN = 1800, "30 Minutes"
        ONE_HOUR = 3600, "1 Hour"
        FOUR_HOUR = 14400, "4 Hours"
        ONE_DAY = 86400, "1 Day"

    market = models.ForeignKey(
        Market, on_delete=models.CASCADE, related_name="candles"
    )
    granularity = models.IntegerField(choices=Granularity.choices, default=Granularity.ONE_MIN)
    open_price = models.DecimalField(max_digits=20, decimal_places=8)
    high_price = models.DecimalField(max_digits=20, decimal_places=8)
    low_price = models.DecimalField(max_digits=20, decimal_places=8)
    close_price = models.DecimalField(max_digits=20, decimal_places=8)
    volume = models.DecimalField(max_digits=30, decimal_places=8, default=Decimal("0.00"))
    timestamp = models.DateTimeField(db_index=True)

    class Meta:
        db_table = "price_candles"
        unique_together = ("market", "granularity", "timestamp")
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["market", "granularity", "timestamp"]),
        ]

    def __str__(self):
        return f"{self.market.symbol} | {self.granularity}s | {self.timestamp} | C:{self.close_price}"


class PriceTick(models.Model):
    """
    Raw real-time price ticks (every second or sub-second).
    Used for last-digit trades and real-time chart rendering.
    Rotated/archived frequently to manage table size.
    """
    market = models.ForeignKey(
        Market, on_delete=models.CASCADE, related_name="ticks"
    )
    price = models.DecimalField(max_digits=20, decimal_places=8)
    ask = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    bid = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    epoch = models.BigIntegerField(db_index=True)  # Unix timestamp
    timestamp = models.DateTimeField(db_index=True)

    class Meta:
        db_table = "price_ticks"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["market", "epoch"]),
        ]

    def __str__(self):
        return f"{self.market.symbol} | {self.price} @ {self.timestamp}"

    @property
    def last_digit(self):
        """Returns the last digit of the price as integer (0-9)."""
        price_str = f"{self.price:.{self.market.display_decimals}f}"
        return int(price_str[-1])


# ─────────────────────────────────────────────
# 5. TRADE TYPES & CONFIGURATION
# ─────────────────────────────────────────────

class TradeType(models.Model):
    """
    Defines each contract type:
    Rise/Fall, Higher/Lower, Touch/No Touch, Even/Odd, Matches/Differs,
    Over/Under, Asian Up/Down, Lookback High/Low, etc.
    """

    class ContractCategory(models.TextChoices):
        UPDOWN = "updown", "Up/Down"
        HIGHLOW = "highlow", "Higher/Lower"
        TOUCHNOTOUCH = "touchnotouch", "Touch/No Touch"
        DIGITS = "digits", "Digits"
        ASIAN = "asian", "Asian"
        LOOKBACK = "lookback", "Lookback"
        RESET = "reset", "Reset Call/Put"
        RUNS = "runs", "Only Ups/Downs"

    name = models.CharField(max_length=100)          # "Rise"
    slug = models.SlugField(max_length=120, unique=True)
    display_name = models.CharField(max_length=100)  # "Rise" shown in UI
    description = models.TextField(blank=True)
    contract_category = models.CharField(
        max_length=30, choices=ContractCategory.choices
    )
    contract_type = models.CharField(max_length=30)  # Internal: CALL, PUT, DIGITODD, etc.
    icon = models.CharField(max_length=50, blank=True)
    # Payout range
    min_payout_pct = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("75.00"))
    max_payout_pct = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("95.00"))
    # Availability
    available_on_markets = models.ManyToManyField(
        Market, related_name="trade_types", blank=True
    )
    requires_barrier = models.BooleanField(default=False)
    requires_last_digit = models.BooleanField(default=False)
    supports_robots = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "trade_types"
        ordering = ["order", "name"]
        verbose_name = "Trade Type"

    def __str__(self):
        return f"{self.display_name} ({self.contract_type})"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


# ─────────────────────────────────────────────
# 6. TRADES
# ─────────────────────────────────────────────

class Trade(models.Model):
    """
    A single binary options / CFD contract placed by a user.
    Covers all trade types: Rise/Fall, Even/Odd, Touch, Digits, etc.
    """

    class TradeStatus(models.TextChoices):
        OPEN = "open", "Open"
        WON = "won", "Won"
        LOST = "lost", "Lost"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"
        ERROR = "error", "Error"

    class AccountType(models.TextChoices):
        REAL = "real", "Real Account"
        DEMO = "demo", "Demo Account"

    class DurationUnit(models.TextChoices):
        TICKS = "t", "Ticks"
        SECONDS = "s", "Seconds"
        MINUTES = "m", "Minutes"
        HOURS = "h", "Hours"
        DAYS = "d", "Days"
        END_OF_DAY = "e", "End of Day"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="trades")
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="trades")
    market = models.ForeignKey(Market, on_delete=models.CASCADE, related_name="trades")
    trade_type = models.ForeignKey(
        TradeType, on_delete=models.CASCADE, related_name="trades"
    )
    account_type = models.CharField(
        max_length=10, choices=AccountType.choices, default=AccountType.REAL
    )
    # Contract parameters
    stake = models.DecimalField(max_digits=20, decimal_places=8)
    payout = models.DecimalField(max_digits=20, decimal_places=8, default=Decimal("0.00"))
    payout_pct = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    # Duration
    duration = models.PositiveIntegerField()              # e.g. 5
    duration_unit = models.CharField(max_length=2, choices=DurationUnit.choices, default=DurationUnit.TICKS)
    # Price references
    entry_price = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    exit_price = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    barrier = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    barrier_2 = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    # Digits (for Even/Odd, Matches/Differs, Over/Under)
    selected_digit = models.PositiveSmallIntegerField(null=True, blank=True)  # 0-9
    last_digit = models.PositiveSmallIntegerField(null=True, blank=True)       # actual exit digit
    # Timing
    open_time = models.DateTimeField(auto_now_add=True)
    close_time = models.DateTimeField(null=True, blank=True)
    expiry_time = models.DateTimeField(null=True, blank=True)
    # Result
    status = models.CharField(
        max_length=20, choices=TradeStatus.choices, default=TradeStatus.OPEN
    )
    profit_loss = models.DecimalField(max_digits=20, decimal_places=8, default=Decimal("0.00"))
    # Robot reference (if placed by robot)
    robot = models.ForeignKey(
        "Robot",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="trades",
    )
    is_robot_trade = models.BooleanField(default=False)
    # Related transaction
    open_transaction = models.OneToOneField(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="trade_open",
    )
    close_transaction = models.OneToOneField(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="trade_close",
    )
    # Audit
    contract_id = models.CharField(max_length=100, unique=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "trades"
        ordering = ["-open_time"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["market", "open_time"]),
            models.Index(fields=["status", "expiry_time"]),
        ]
        verbose_name = "Trade"

    def __str__(self):
        return f"{self.user.email} | {self.trade_type.display_name} on {self.market.symbol} | {self.status}"

    def save(self, *args, **kwargs):
        if not self.contract_id:
            self.contract_id = f"CON-{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)

    @property
    def is_open(self):
        return self.status == self.TradeStatus.OPEN

    @property
    def net_profit(self):
        if self.status == self.TradeStatus.WON:
            return self.payout - self.stake
        elif self.status == self.TradeStatus.LOST:
            return -self.stake
        return Decimal("0.00")


# ─────────────────────────────────────────────
# 7. TRADING ROBOTS
# ─────────────────────────────────────────────

class Robot(models.Model):
    """
    A user-configured automated trading bot.
    Supports multiple strategies and risk management settings.
    """

    class RobotStatus(models.TextChoices):
        ACTIVE = "active", "Active (Running)"
        PAUSED = "paused", "Paused"
        STOPPED = "stopped", "Stopped"
        ERROR = "error", "Error"

    class Strategy(models.TextChoices):
        MARTINGALE = "martingale", "Martingale"
        ANTI_MARTINGALE = "anti_martingale", "Anti-Martingale"
        DALEMBERT = "dalembert", "D'Alembert"
        FIBONACCI = "fibonacci", "Fibonacci"
        FLAT_BET = "flat_bet", "Flat Betting"
        CUSTOM = "custom", "Custom (XML Logic)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="robots")
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    # Strategy
    strategy = models.CharField(max_length=30, choices=Strategy.choices, default=Strategy.FLAT_BET)
    # Market & Trade config
    market = models.ForeignKey(
        Market, on_delete=models.CASCADE, related_name="robots"
    )
    trade_type = models.ForeignKey(
        TradeType, on_delete=models.CASCADE, related_name="robots"
    )
    account_type = models.CharField(
        max_length=10,
        choices=[("real", "Real"), ("demo", "Demo")],
        default="demo",
    )
    # Stake settings
    initial_stake = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("1.00"))
    max_stake = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("100.00"))
    stake_multiplier = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("2.00"))  # Martingale multiplier
    stake_step = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))       # D'Alembert step
    duration = models.PositiveIntegerField(default=5)
    duration_unit = models.CharField(max_length=2, default="t")
    # Risk management
    take_profit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)   # Stop when profit >= X
    stop_loss = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)     # Stop when loss >= X
    max_trades = models.PositiveIntegerField(null=True, blank=True)         # Max trades per session
    max_consecutive_losses = models.PositiveIntegerField(null=True, blank=True)
    # Custom XML/Blockly logic (for advanced users)
    custom_xml = models.TextField(blank=True)    # Blockly XML export
    custom_logic = models.JSONField(default=dict, blank=True)  # Parsed logic tree
    # Status & stats
    status = models.CharField(
        max_length=20, choices=RobotStatus.choices, default=RobotStatus.STOPPED
    )
    is_public = models.BooleanField(default=False)   # Share robot in marketplace
    total_trades = models.PositiveIntegerField(default=0)
    total_wins = models.PositiveIntegerField(default=0)
    total_losses = models.PositiveIntegerField(default=0)
    total_profit = models.DecimalField(max_digits=20, decimal_places=8, default=Decimal("0.00"))
    current_stake = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    consecutive_losses = models.PositiveIntegerField(default=0)
    # Session tracking
    session_start = models.DateTimeField(null=True, blank=True)
    session_profit = models.DecimalField(max_digits=20, decimal_places=8, default=Decimal("0.00"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "robots"
        ordering = ["-created_at"]
        verbose_name = "Robot"

    def __str__(self):
        return f"Robot: {self.name} ({self.user.email}) — {self.status}"

    @property
    def win_rate(self):
        if self.total_trades == 0:
            return Decimal("0.00")
        return (Decimal(self.total_wins) / Decimal(self.total_trades) * 100).quantize(Decimal("0.01"))

    def start(self):
        self.status = self.RobotStatus.ACTIVE
        self.session_start = timezone.now()
        self.session_profit = Decimal("0.00")
        self.save(update_fields=["status", "session_start", "session_profit", "updated_at"])

    def stop(self):
        self.status = self.RobotStatus.STOPPED
        self.save(update_fields=["status", "updated_at"])


class RobotLog(models.Model):
    """Detailed log of every action taken by a robot."""

    class LogLevel(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        ERROR = "error", "Error"
        SUCCESS = "success", "Success"
        TRADE = "trade", "Trade"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    robot = models.ForeignKey(Robot, on_delete=models.CASCADE, related_name="logs")
    trade = models.ForeignKey(
        Trade, on_delete=models.SET_NULL, null=True, blank=True, related_name="robot_logs"
    )
    level = models.CharField(max_length=10, choices=LogLevel.choices, default=LogLevel.INFO)
    message = models.TextField()
    stake = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    result = models.CharField(max_length=10, blank=True)    # won/lost
    profit = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    session_profit = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "robot_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["robot", "created_at"]),
        ]

    def __str__(self):
        return f"[{self.level.upper()}] Robot:{self.robot.name} — {self.message[:60]}"


# ─────────────────────────────────────────────
# 8. NOTIFICATIONS
# ─────────────────────────────────────────────

class Notification(models.Model):
    """In-app notification pushed via WebSocket and stored here."""

    class NotificationType(models.TextChoices):
        TRADE_RESULT = "trade_result", "Trade Result"
        DEPOSIT = "deposit", "Deposit"
        WITHDRAWAL = "withdrawal", "Withdrawal"
        ROBOT = "robot", "Robot Alert"
        SYSTEM = "system", "System"
        PROMO = "promo", "Promotion"
        KYC = "kyc", "KYC Update"
        SECURITY = "security", "Security Alert"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()
    icon = models.CharField(max_length=50, blank=True)
    is_read = models.BooleanField(default=False)
    action_url = models.CharField(max_length=300, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read"]),
        ]

    def __str__(self):
        return f"{self.user.email} | {self.title} | {'Read' if self.is_read else 'Unread'}"


# ─────────────────────────────────────────────
# 9. SYSTEM SETTINGS
# ─────────────────────────────────────────────

class SystemSetting(models.Model):
    """
    Key-value store for admin-controlled platform configuration.
    e.g. maintenance_mode, max_payout, welcome_bonus_amount
    """

    class ValueType(models.TextChoices):
        STRING = "string", "String"
        INTEGER = "integer", "Integer"
        DECIMAL = "decimal", "Decimal"
        BOOLEAN = "boolean", "Boolean"
        JSON = "json", "JSON"

    key = models.CharField(max_length=100, unique=True, db_index=True)
    value = models.TextField()
    value_type = models.CharField(
        max_length=10, choices=ValueType.choices, default=ValueType.STRING
    )
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=False)  # Expose to frontend API?
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "system_settings"
        ordering = ["key"]
        verbose_name = "System Setting"

    def __str__(self):
        return f"{self.key} = {self.value}"

    def get_typed_value(self):
        """Returns value cast to the correct Python type."""
        import json
        if self.value_type == self.ValueType.INTEGER:
            return int(self.value)
        elif self.value_type == self.ValueType.DECIMAL:
            return Decimal(self.value)
        elif self.value_type == self.ValueType.BOOLEAN:
            return self.value.lower() in ("true", "1", "yes")
        elif self.value_type == self.ValueType.JSON:
            return json.loads(self.value)
        return self.value
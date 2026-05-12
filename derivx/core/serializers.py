"""
core/serializers.py — DerivX Trading Platform
DRF serializers for all models.
"""

from decimal import Decimal
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    User, UserProfile, Wallet, Transaction,
    MpesaTransaction, PaypalTransaction, BinanceTransaction,
    MarketCategory, Market, PriceCandle, PriceTick,
    TradeType, Trade, Robot, RobotLog, Notification, SystemSetting,
)


# ─────────────────────────────────────────────
# AUTH SERIALIZERS
# ─────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)
    referral_code = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "email", "username", "first_name", "last_name",
            "phone_number", "country", "currency",
            "password", "password_confirm", "referral_code",
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def validate_referral_code(self, value):
        if value:
            try:
                referrer = User.objects.get(referral_code=value)
                self.context["referrer"] = referrer
            except User.DoesNotExist:
                raise serializers.ValidationError("Invalid referral code.")
        return value

    def create(self, validated_data):
        referral_code = validated_data.pop("referral_code", None)
        referrer = self.context.get("referrer")
        user = User.objects.create_user(**validated_data)
        if referrer:
            user.referred_by = referrer
            user.save(update_fields=["referred_by"])
        # Auto-create profile and default USD wallet
        UserProfile.objects.create(user=user)
        Wallet.objects.create(user=user, currency="USD")
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            username=attrs["email"],
            password=attrs["password"],
        )
        if not user:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("Account is disabled.")
        refresh = RefreshToken.for_user(user)
        return {
            "user": user,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match."})
        return attrs

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value


# ─────────────────────────────────────────────
# USER & PROFILE SERIALIZERS
# ─────────────────────────────────────────────

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "avatar", "bio", "kyc_status", "risk_level",
            "two_factor_enabled", "notifications_email",
            "notifications_sms", "notifications_push", "timezone",
            "created_at", "updated_at",
        ]
        read_only_fields = ["kyc_status", "created_at", "updated_at"]


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "email", "username", "first_name", "last_name",
            "full_name", "phone_number", "country", "currency",
            "is_email_verified", "is_phone_verified",
            "referral_code", "profile", "created_at",
        ]
        read_only_fields = [
            "id", "email", "is_email_verified", "is_phone_verified",
            "referral_code", "created_at",
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()


class UserMiniSerializer(serializers.ModelSerializer):
    """Lightweight user representation for nested use."""
    class Meta:
        model = User
        fields = ["id", "email", "username", "first_name", "last_name"]


class KYCUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ["kyc_document_front", "kyc_document_back", "kyc_selfie"]


# ─────────────────────────────────────────────
# WALLET SERIALIZERS
# ─────────────────────────────────────────────

class WalletSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)

    class Meta:
        model = Wallet
        fields = [
            "id", "user", "currency", "balance",
            "demo_balance", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "balance", "demo_balance", "created_at", "updated_at"]


class WalletBalanceSerializer(serializers.ModelSerializer):
    """Minimal wallet info for dashboard balance display."""
    class Meta:
        model = Wallet
        fields = ["id", "currency", "balance", "demo_balance"]


# ─────────────────────────────────────────────
# TRANSACTION SERIALIZERS
# ─────────────────────────────────────────────

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            "id", "transaction_type", "payment_method",
            "amount", "currency", "fee", "net_amount",
            "balance_before", "balance_after",
            "status", "reference", "description",
            "metadata", "created_at", "updated_at",
        ]
        read_only_fields = fields


# ─────────────────────────────────────────────
# PAYMENT SERIALIZERS
# ─────────────────────────────────────────────

class MpesaDepositSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("10.00"))

    def validate_phone_number(self, value):
        value = value.strip().replace("+", "").replace(" ", "")
        if not value.startswith("254") or len(value) != 12:
            raise serializers.ValidationError(
                "Phone number must be in format 254XXXXXXXXX (12 digits, Kenyan number)."
            )
        return value


class MpesaWithdrawSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("50.00"))

    def validate_phone_number(self, value):
        value = value.strip().replace("+", "").replace(" ", "")
        if not value.startswith("254") or len(value) != 12:
            raise serializers.ValidationError("Phone number must be in format 254XXXXXXXXX.")
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        wallet = Wallet.objects.filter(user=user, currency="KES", is_active=True).first()
        if not wallet or wallet.balance < attrs["amount"]:
            raise serializers.ValidationError({"amount": "Insufficient KES balance."})
        return attrs


class MpesaTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MpesaTransaction
        fields = [
            "id", "mpesa_type", "phone_number", "amount",
            "checkout_request_id", "mpesa_receipt_number",
            "status", "result_desc", "created_at", "updated_at",
        ]
        read_only_fields = fields


class PaypalDepositSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("5.00"))
    currency = serializers.ChoiceField(choices=["USD", "EUR", "GBP"], default="USD")
    return_url = serializers.URLField(required=False)
    cancel_url = serializers.URLField(required=False)


class PaypalWithdrawSerializer(serializers.Serializer):
    paypal_email = serializers.EmailField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("5.00"))
    currency = serializers.ChoiceField(choices=["USD", "EUR", "GBP"], default="USD")

    def validate(self, attrs):
        user = self.context["request"].user
        wallet = Wallet.objects.filter(user=user, currency=attrs["currency"], is_active=True).first()
        if not wallet or wallet.balance < attrs["amount"]:
            raise serializers.ValidationError({"amount": "Insufficient balance."})
        return attrs


class PaypalTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaypalTransaction
        fields = [
            "id", "paypal_type", "paypal_order_id", "payer_email",
            "amount", "currency", "status", "created_at", "updated_at",
        ]
        read_only_fields = fields


class BinanceDepositSerializer(serializers.Serializer):
    coin = serializers.ChoiceField(choices=["USDT", "BTC", "ETH", "BNB"], default="USDT")
    network = serializers.ChoiceField(
        choices=["BSC", "TRC20", "ERC20", "BTC", "ETH"], required=False
    )
    amount = serializers.DecimalField(max_digits=20, decimal_places=8, min_value=Decimal("1.00"))


class BinanceWithdrawSerializer(serializers.Serializer):
    coin = serializers.ChoiceField(choices=["USDT", "BTC", "ETH", "BNB"])
    network = serializers.ChoiceField(choices=["BSC", "TRC20", "ERC20", "BTC", "ETH"])
    wallet_address = serializers.CharField(max_length=200)
    amount = serializers.DecimalField(max_digits=20, decimal_places=8, min_value=Decimal("5.00"))

    def validate(self, attrs):
        user = self.context["request"].user
        currency_map = {"USDT": "USDT", "BTC": "BTC", "ETH": "ETH", "BNB": "USDT"}
        currency = currency_map.get(attrs["coin"], "USDT")
        wallet = Wallet.objects.filter(user=user, currency=currency, is_active=True).first()
        if not wallet or wallet.balance < attrs["amount"]:
            raise serializers.ValidationError({"amount": "Insufficient balance."})
        return attrs


class BinanceTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BinanceTransaction
        fields = [
            "id", "binance_type", "coin", "network",
            "wallet_address", "amount", "usd_equivalent",
            "status", "tx_hash", "created_at", "updated_at",
        ]
        read_only_fields = fields


# ─────────────────────────────────────────────
# MARKET SERIALIZERS
# ─────────────────────────────────────────────

class MarketCategorySerializer(serializers.ModelSerializer):
    market_count = serializers.SerializerMethodField()

    class Meta:
        model = MarketCategory
        fields = ["id", "name", "slug", "description", "icon", "order", "market_count"]

    def get_market_count(self, obj):
        return obj.markets.filter(is_active=True).count()


class MarketListSerializer(serializers.ModelSerializer):
    """Compact market info for lists and dropdowns."""
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)

    class Meta:
        model = Market
        fields = [
            "id", "name", "slug", "symbol",
            "category_name", "category_slug",
            "current_price", "price_change_24h", "price_change_pct_24h",
            "volatility", "status", "is_featured",
            "minimum_stake", "maximum_stake",
            "display_decimals", "icon",
        ]


class MarketDetailSerializer(serializers.ModelSerializer):
    """Full market info for detail/SEO pages."""
    category = MarketCategorySerializer(read_only=True)
    trade_types = serializers.SerializerMethodField()
    absolute_url = serializers.SerializerMethodField()

    class Meta:
        model = Market
        fields = [
            "id", "category", "name", "slug", "symbol",
            "description", "meta_title", "meta_description",
            "icon", "display_decimals", "pip_size",
            "current_price", "price_change_24h", "price_change_pct_24h",
            "volatility", "price_feed_source",
            "minimum_stake", "maximum_stake",
            "minimum_duration_seconds", "maximum_duration_seconds",
            "status", "is_featured", "is_active",
            "trade_types", "absolute_url",
            "created_at", "updated_at",
        ]

    def get_trade_types(self, obj):
        trade_types = obj.trade_types.filter(is_active=True)
        return TradeTypeSerializer(trade_types, many=True).data

    def get_absolute_url(self, obj):
        return f"/markets/{obj.slug}/"


class PriceCandleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceCandle
        fields = [
            "id", "granularity",
            "open_price", "high_price", "low_price", "close_price",
            "volume", "timestamp",
        ]


class PriceTickSerializer(serializers.ModelSerializer):
    last_digit = serializers.ReadOnlyField()

    class Meta:
        model = PriceTick
        fields = ["id", "price", "ask", "bid", "epoch", "timestamp", "last_digit"]


# ─────────────────────────────────────────────
# TRADE TYPE SERIALIZERS
# ─────────────────────────────────────────────

class TradeTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradeType
        fields = [
            "id", "name", "slug", "display_name", "description",
            "contract_category", "contract_type", "icon",
            "min_payout_pct", "max_payout_pct",
            "requires_barrier", "requires_last_digit",
            "supports_robots", "is_active", "order",
        ]


# ─────────────────────────────────────────────
# TRADE SERIALIZERS
# ─────────────────────────────────────────────

class TradePlaceSerializer(serializers.Serializer):
    """Validates incoming trade placement requests."""
    market_slug = serializers.SlugField()
    trade_type_slug = serializers.SlugField()
    stake = serializers.DecimalField(max_digits=20, decimal_places=8)
    duration = serializers.IntegerField(min_value=1)
    duration_unit = serializers.ChoiceField(
        choices=["t", "s", "m", "h", "d", "e"], default="t"
    )
    account_type = serializers.ChoiceField(choices=["real", "demo"], default="real")
    barrier = serializers.DecimalField(
        max_digits=20, decimal_places=8, required=False, allow_null=True
    )
    barrier_2 = serializers.DecimalField(
        max_digits=20, decimal_places=8, required=False, allow_null=True
    )
    selected_digit = serializers.IntegerField(
        min_value=0, max_value=9, required=False, allow_null=True
    )

    def validate_market_slug(self, value):
        try:
            market = Market.objects.get(slug=value, is_active=True, status="open")
            self.context["market"] = market
        except Market.DoesNotExist:
            raise serializers.ValidationError("Market not found or is closed.")
        return value

    def validate_trade_type_slug(self, value):
        try:
            trade_type = TradeType.objects.get(slug=value, is_active=True)
            self.context["trade_type"] = trade_type
        except TradeType.DoesNotExist:
            raise serializers.ValidationError("Trade type not found.")
        return value

    def validate(self, attrs):
        market = self.context.get("market")
        trade_type = self.context.get("trade_type")
        user = self.context["request"].user

        if market and trade_type:
            if not trade_type.available_on_markets.filter(id=market.id).exists():
                raise serializers.ValidationError(
                    f"Trade type '{trade_type.display_name}' is not available on {market.name}."
                )
            if market and attrs["stake"] < market.minimum_stake:
                raise serializers.ValidationError(
                    {"stake": f"Minimum stake is {market.minimum_stake} USD."}
                )
            if market and attrs["stake"] > market.maximum_stake:
                raise serializers.ValidationError(
                    {"stake": f"Maximum stake is {market.maximum_stake} USD."}
                )
            if trade_type.requires_barrier and not attrs.get("barrier"):
                raise serializers.ValidationError(
                    {"barrier": "This trade type requires a barrier value."}
                )
            if trade_type.requires_last_digit and attrs.get("selected_digit") is None:
                raise serializers.ValidationError(
                    {"selected_digit": "This trade type requires a digit selection (0–9)."}
                )

        # Check wallet balance
        if attrs["account_type"] == "real":
            wallet = Wallet.objects.filter(user=user, currency="USD", is_active=True).first()
            if not wallet or wallet.balance < attrs["stake"]:
                raise serializers.ValidationError({"stake": "Insufficient real account balance."})
        else:
            wallet = Wallet.objects.filter(user=user, currency="USD", is_active=True).first()
            if not wallet or wallet.demo_balance < attrs["stake"]:
                raise serializers.ValidationError({"stake": "Insufficient demo account balance."})

        return attrs


class TradeSerializer(serializers.ModelSerializer):
    """Full trade representation."""
    market = MarketListSerializer(read_only=True)
    trade_type = TradeTypeSerializer(read_only=True)
    user = UserMiniSerializer(read_only=True)
    net_profit = serializers.ReadOnlyField()
    is_open = serializers.ReadOnlyField()

    class Meta:
        model = Trade
        fields = [
            "id", "contract_id", "user", "market", "trade_type",
            "account_type", "stake", "payout", "payout_pct",
            "duration", "duration_unit",
            "entry_price", "exit_price", "barrier", "barrier_2",
            "selected_digit", "last_digit",
            "open_time", "close_time", "expiry_time",
            "status", "profit_loss", "net_profit", "is_open",
            "is_robot_trade", "created_at",
        ]
        read_only_fields = fields


class TradeMiniSerializer(serializers.ModelSerializer):
    """Compact trade for lists and history tables."""
    market_name = serializers.CharField(source="market.name", read_only=True)
    market_slug = serializers.CharField(source="market.slug", read_only=True)
    trade_type_name = serializers.CharField(source="trade_type.display_name", read_only=True)
    net_profit = serializers.ReadOnlyField()

    class Meta:
        model = Trade
        fields = [
            "id", "contract_id", "market_name", "market_slug",
            "trade_type_name", "account_type",
            "stake", "payout", "payout_pct",
            "duration", "duration_unit",
            "status", "profit_loss", "net_profit",
            "open_time", "close_time", "is_robot_trade",
        ]


# ─────────────────────────────────────────────
# ROBOT SERIALIZERS
# ─────────────────────────────────────────────

class RobotSerializer(serializers.ModelSerializer):
    market = MarketListSerializer(read_only=True)
    market_slug = serializers.SlugRelatedField(
        slug_field="slug",
        queryset=Market.objects.filter(is_active=True),
        source="market",
        write_only=True,
    )
    trade_type = TradeTypeSerializer(read_only=True)
    trade_type_slug = serializers.SlugRelatedField(
        slug_field="slug",
        queryset=TradeType.objects.filter(is_active=True),
        source="trade_type",
        write_only=True,
    )
    win_rate = serializers.ReadOnlyField()
    user = UserMiniSerializer(read_only=True)

    class Meta:
        model = Robot
        fields = [
            "id", "user", "name", "description",
            "strategy", "market", "market_slug",
            "trade_type", "trade_type_slug",
            "account_type", "initial_stake", "max_stake",
            "stake_multiplier", "stake_step",
            "duration", "duration_unit",
            "take_profit", "stop_loss",
            "max_trades", "max_consecutive_losses",
            "custom_xml", "custom_logic",
            "status", "is_public",
            "total_trades", "total_wins", "total_losses",
            "total_profit", "win_rate",
            "current_stake", "consecutive_losses",
            "session_start", "session_profit",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "user", "status",
            "total_trades", "total_wins", "total_losses",
            "total_profit", "win_rate",
            "current_stake", "consecutive_losses",
            "session_start", "session_profit",
            "created_at", "updated_at",
        ]

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class RobotMiniSerializer(serializers.ModelSerializer):
    win_rate = serializers.ReadOnlyField()

    class Meta:
        model = Robot
        fields = [
            "id", "name", "strategy", "status",
            "total_trades", "total_wins", "win_rate",
            "total_profit", "session_profit",
        ]


class RobotLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = RobotLog
        fields = [
            "id", "level", "message",
            "stake", "result", "profit", "session_profit",
            "metadata", "created_at",
        ]
        read_only_fields = fields


# ─────────────────────────────────────────────
# NOTIFICATION SERIALIZERS
# ─────────────────────────────────────────────

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "notification_type", "title", "message",
            "icon", "is_read", "action_url", "metadata", "created_at",
        ]
        read_only_fields = [
            "id", "notification_type", "title", "message",
            "icon", "action_url", "metadata", "created_at",
        ]


# ─────────────────────────────────────────────
# SYSTEM SETTINGS SERIALIZER
# ─────────────────────────────────────────────

class SystemSettingSerializer(serializers.ModelSerializer):
    typed_value = serializers.SerializerMethodField()

    class Meta:
        model = SystemSetting
        fields = ["key", "value", "value_type", "description", "typed_value"]

    def get_typed_value(self, obj):
        return obj.get_typed_value()


# ─────────────────────────────────────────────
# DASHBOARD SERIALIZER
# ─────────────────────────────────────────────

class DashboardSerializer(serializers.Serializer):
    """Aggregated data for the user dashboard."""
    user = UserSerializer()
    wallets = WalletBalanceSerializer(many=True)
    active_trades_count = serializers.IntegerField()
    total_trades_count = serializers.IntegerField()
    total_wins = serializers.IntegerField()
    total_losses = serializers.IntegerField()
    win_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    total_profit = serializers.DecimalField(max_digits=20, decimal_places=8)
    active_robots_count = serializers.IntegerField()
    recent_trades = TradeMiniSerializer(many=True)
    unread_notifications = serializers.IntegerField()
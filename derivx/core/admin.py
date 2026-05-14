# core/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import (
    User, UserProfile, Wallet, Transaction,
    MpesaTransaction, PaypalTransaction, BinanceTransaction,
    MarketCategory, Market, PriceCandle, PriceTick,
    TradeType, Trade, Robot, RobotLog,
    Notification, SystemSetting,
)


# ─── USER ────────────────────────────────────────────────────────────────────

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display    = ("email", "username", "full_name", "country", "currency", "is_email_verified", "date_joined")
    list_filter     = ("is_email_verified", "is_active", "country", "currency")
    search_fields   = ("email", "username", "first_name", "last_name", "phone_number")
    ordering        = ("-date_joined",)
    readonly_fields = ("id", "referral_code", "date_joined", "last_login")

    fieldsets = (
        (None,          {"fields": ("id", "email", "username", "password")}),
        ("Personal",    {"fields": ("first_name", "last_name", "phone_number", "date_of_birth", "country", "currency")}),
        ("Status",      {"fields": ("is_email_verified", "is_phone_verified", "is_active", "is_staff", "is_superuser")}),
        ("Referral",    {"fields": ("referral_code", "referred_by")}),
        ("Timestamps",  {"fields": ("date_joined", "last_login")}),
    )

    def full_name(self, obj):
        return obj.get_full_name()
    full_name.short_description = "Name"


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display  = ("user", "kyc_status", "risk_level", "two_factor_enabled")
    list_filter   = ("kyc_status", "risk_level", "two_factor_enabled")
    search_fields = ("user__email", "user__username")
    readonly_fields = ("created_at", "updated_at")


# ─── WALLET ──────────────────────────────────────────────────────────────────

@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display  = ("user", "currency", "balance_display", "demo_balance_display", "is_active")
    list_filter   = ("currency", "is_active")
    search_fields = ("user__email",)
    readonly_fields = ("id", "created_at", "updated_at")

    def balance_display(self, obj):
        color = "#22c55e" if obj.balance > 0 else "#ef4444"
        return format_html('<span style="color:{};font-weight:700">{}</span>', color, obj.balance)
    balance_display.short_description = "Balance"

    def demo_balance_display(self, obj):
        return format_html('<span style="color:#22d3ee">{}</span>', obj.demo_balance)
    demo_balance_display.short_description = "Demo"


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display  = ("reference", "user", "transaction_type", "payment_method", "amount", "currency", "status", "created_at")
    list_filter   = ("transaction_type", "payment_method", "status", "currency")
    search_fields = ("user__email", "reference", "description")
    readonly_fields = ("id", "reference", "created_at", "updated_at")
    ordering      = ("-created_at",)
    date_hierarchy = "created_at"


# ─── PAYMENTS ────────────────────────────────────────────────────────────────

@admin.register(MpesaTransaction)
class MpesaTransactionAdmin(admin.ModelAdmin):
    list_display  = ("user", "mpesa_type", "phone_number", "amount", "status", "mpesa_receipt_number", "created_at")
    list_filter   = ("mpesa_type", "status")
    search_fields = ("user__email", "phone_number", "mpesa_receipt_number", "checkout_request_id")
    readonly_fields = ("id", "created_at", "updated_at", "raw_response", "raw_callback")
    ordering      = ("-created_at",)


@admin.register(PaypalTransaction)
class PaypalTransactionAdmin(admin.ModelAdmin):
    list_display  = ("user", "paypal_type", "amount", "currency", "status", "paypal_order_id", "created_at")
    list_filter   = ("paypal_type", "status", "currency")
    search_fields = ("user__email", "paypal_order_id", "payer_email")
    readonly_fields = ("id", "created_at", "updated_at", "raw_response", "raw_webhook")
    ordering      = ("-created_at",)


@admin.register(BinanceTransaction)
class BinanceTransactionAdmin(admin.ModelAdmin):
    list_display  = ("user", "binance_type", "coin", "network", "amount", "status", "tx_hash", "created_at")
    list_filter   = ("binance_type", "status", "coin")
    search_fields = ("user__email", "wallet_address", "tx_hash", "binance_order_id")
    readonly_fields = ("id", "created_at", "updated_at", "raw_response", "raw_webhook")
    ordering      = ("-created_at",)


# ─── MARKETS ─────────────────────────────────────────────────────────────────

@admin.register(MarketCategory)
class MarketCategoryAdmin(admin.ModelAdmin):
    list_display  = ("name", "slug", "order", "is_active")
    list_editable = ("order", "is_active")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Market)
class MarketAdmin(admin.ModelAdmin):
    list_display  = ("name", "symbol", "category", "current_price_display", "status", "price_feed_source", "is_featured", "is_active")
    list_filter   = ("category", "status", "price_feed_source", "is_featured", "is_active")
    list_editable = ("status", "is_featured", "is_active")
    search_fields = ("name", "symbol", "slug")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("id", "created_at", "updated_at")
    filter_horizontal = ()

    fieldsets = (
        ("Identity",    {"fields": ("id", "category", "name", "slug", "symbol", "description")}),
        ("SEO",         {"fields": ("meta_title", "meta_description")}),
        ("Display",     {"fields": ("icon", "display_decimals", "pip_size")}),
        ("Trading",     {"fields": ("minimum_stake", "maximum_stake", "minimum_duration_seconds", "maximum_duration_seconds", "volatility")}),
        ("Price",       {"fields": ("current_price", "price_change_24h", "price_change_pct_24h", "price_feed_source")}),
        ("Status",      {"fields": ("status", "is_featured", "is_active")}),
        ("Timestamps",  {"fields": ("created_at", "updated_at")}),
    )

    def current_price_display(self, obj):
        return format_html("<code>{}</code>", obj.current_price)
    current_price_display.short_description = "Price"


@admin.register(TradeType)
class TradeTypeAdmin(admin.ModelAdmin):
    list_display  = ("display_name", "contract_type", "contract_category", "min_payout_pct", "max_payout_pct", "supports_robots", "is_active", "order")
    list_filter   = ("contract_category", "is_active", "supports_robots")
    list_editable = ("is_active", "order", "max_payout_pct")
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ("available_on_markets",)


# ─── TRADES ──────────────────────────────────────────────────────────────────

@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
    list_display  = ("contract_id", "user", "market", "trade_type", "stake", "payout", "status_badge", "account_type", "is_robot_trade", "open_time")
    list_filter   = ("status", "account_type", "is_robot_trade", "trade_type__contract_category")
    search_fields = ("contract_id", "user__email", "market__symbol")
    readonly_fields = ("id", "contract_id", "open_time", "created_at", "updated_at")
    ordering      = ("-open_time",)
    date_hierarchy = "open_time"

    def status_badge(self, obj):
        colors = {"won": "#22c55e", "lost": "#ef4444", "open": "#6366f1", "cancelled": "#94a3b8"}
        color  = colors.get(obj.status, "#94a3b8")
        return format_html('<span style="color:{};font-weight:700;text-transform:uppercase">{}</span>', color, obj.status)
    status_badge.short_description = "Status"


# ─── ROBOTS ──────────────────────────────────────────────────────────────────

@admin.register(Robot)
class RobotAdmin(admin.ModelAdmin):
    list_display  = ("name", "user", "strategy", "market", "trade_type", "status", "total_trades", "win_rate_display", "total_profit", "is_public")
    list_filter   = ("status", "strategy", "account_type", "is_public")
    search_fields = ("name", "user__email")
    readonly_fields = ("id", "total_trades", "total_wins", "total_losses", "total_profit", "win_rate", "created_at", "updated_at")

    def win_rate_display(self, obj):
        rate = float(obj.win_rate)
        color = "#22c55e" if rate >= 50 else "#ef4444"
        return format_html('<span style="color:{};font-weight:700">{:.1f}%</span>', color, rate)
    win_rate_display.short_description = "Win Rate"


@admin.register(RobotLog)
class RobotLogAdmin(admin.ModelAdmin):
    list_display  = ("robot", "level", "message_short", "stake", "result", "profit", "created_at")
    list_filter   = ("level", "result")
    search_fields = ("robot__name", "message")
    readonly_fields = ("id", "created_at")
    ordering      = ("-created_at",)

    def message_short(self, obj):
        return obj.message[:80]
    message_short.short_description = "Message"


# ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ("user", "notification_type", "title", "is_read", "created_at")
    list_filter   = ("notification_type", "is_read")
    search_fields = ("user__email", "title", "message")
    readonly_fields = ("id", "created_at")
    ordering      = ("-created_at",)
    actions       = ["mark_all_read"]

    def mark_all_read(self, request, queryset):
        queryset.update(is_read=True)
        self.message_user(request, f"Marked {queryset.count()} notifications as read.")
    mark_all_read.short_description = "Mark selected as read"


# ─── SYSTEM SETTINGS ─────────────────────────────────────────────────────────

@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display  = ("key", "value_short", "value_type", "is_public", "updated_at")
    list_filter   = ("value_type", "is_public")
    search_fields = ("key", "description")
    readonly_fields = ("updated_at",)

    def value_short(self, obj):
        return obj.value[:60] + ("…" if len(obj.value) > 60 else "")
    value_short.short_description = "Value"


# ─── PRICE DATA (read-only) ───────────────────────────────────────────────────

@admin.register(PriceCandle)
class PriceCandleAdmin(admin.ModelAdmin):
    list_display  = ("market", "granularity", "open_price", "high_price", "low_price", "close_price", "timestamp")
    list_filter   = ("market", "granularity")
    readonly_fields = ("market", "granularity", "open_price", "high_price", "low_price", "close_price", "volume", "timestamp")
    ordering      = ("-timestamp",)

    def has_add_permission(self, request):    return False
    def has_change_permission(self, request, obj=None): return False


# ─── ADMIN SITE CONFIG ────────────────────────────────────────────────────────

admin.site.site_header  = "DerivX Administration"
admin.site.site_title   = "DerivX Admin"
admin.site.index_title  = "Platform Management"
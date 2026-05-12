"""
core/urls.py — DerivX App URL Configuration
All slug-based SEO-friendly URL patterns for the core app.
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

app_name = "core"

urlpatterns = [

    # ── AUTH ──────────────────────────────────────────────────────
    path("auth/register/",          views.RegisterView.as_view(),        name="auth-register"),
    path("auth/login/",             views.LoginView.as_view(),           name="auth-login"),
    path("auth/logout/",            views.LogoutView.as_view(),          name="auth-logout"),
    path("auth/token/refresh/",     TokenRefreshView.as_view(),          name="token-refresh"),
    path("auth/change-password/",   views.ChangePasswordView.as_view(),  name="change-password"),

    # ── USER / PROFILE ────────────────────────────────────────────
    path("profile/",                views.ProfileView.as_view(),         name="profile"),
    path("profile/kyc/",            views.KYCUploadView.as_view(),       name="kyc-upload"),
    path("dashboard/",              views.DashboardView.as_view(),       name="dashboard"),

    # ── WALLET ────────────────────────────────────────────────────
    path("wallet/",                 views.WalletListView.as_view(),         name="wallet-list"),
    path("wallet/transactions/",    views.TransactionListView.as_view(),    name="transaction-list"),

    # ── MPESA ─────────────────────────────────────────────────────
    path("payments/mpesa/deposit/",     views.MpesaDepositView.as_view(),       name="mpesa-deposit"),
    path("payments/mpesa/withdraw/",    views.MpesaWithdrawView.as_view(),      name="mpesa-withdraw"),
    path("payments/mpesa/callback/",    views.MpesaCallbackView.as_view(),      name="mpesa-callback"),
    path("payments/mpesa/history/",     views.MpesaTransactionListView.as_view(), name="mpesa-history"),

    # ── PAYPAL ────────────────────────────────────────────────────
    path("payments/paypal/deposit/",    views.PaypalDepositView.as_view(),      name="paypal-deposit"),
    path("payments/paypal/capture/",    views.PaypalCaptureView.as_view(),      name="paypal-capture"),
    path("payments/paypal/withdraw/",   views.PaypalWithdrawView.as_view(),     name="paypal-withdraw"),
    path("payments/paypal/webhook/",    views.PaypalWebhookView.as_view(),      name="paypal-webhook"),

    # ── BINANCE ───────────────────────────────────────────────────
    path("payments/binance/deposit/",   views.BinanceDepositView.as_view(),     name="binance-deposit"),
    path("payments/binance/withdraw/",  views.BinanceWithdrawView.as_view(),    name="binance-withdraw"),
    path("payments/binance/webhook/",   views.BinanceWebhookView.as_view(),     name="binance-webhook"),

    # ── MARKETS (SEO slug-based) ──────────────────────────────────
    path("markets/categories/",             views.MarketCategoryListView.as_view(),  name="market-categories"),
    path("markets/",                        views.MarketListView.as_view(),          name="market-list"),
    path("markets/<slug:slug>/",            views.MarketDetailView.as_view(),        name="market-detail"),
    path("markets/<slug:slug>/candles/",    views.MarketCandlesView.as_view(),       name="market-candles"),
    path("markets/<slug:slug>/ticks/",      views.MarketTicksView.as_view(),         name="market-ticks"),

    # ── TRADE TYPES ───────────────────────────────────────────────
    path("trade-types/",            views.TradeTypeListView.as_view(),      name="trade-type-list"),

    # ── TRADES ────────────────────────────────────────────────────
    path("trades/",                 views.TradeListView.as_view(),          name="trade-list"),
    path("trades/place/",           views.TradePlaceView.as_view(),         name="trade-place"),
    path("trades/active/",          views.TradeActiveView.as_view(),        name="trade-active"),
    path("trades/<uuid:pk>/",       views.TradeDetailView.as_view(),        name="trade-detail"),

    # ── ROBOTS ────────────────────────────────────────────────────
    path("robots/",                         views.RobotListCreateView.as_view(),  name="robot-list"),
    path("robots/community/",               views.PublicRobotListView.as_view(),  name="robot-community"),
    path("robots/<uuid:pk>/",               views.RobotDetailView.as_view(),      name="robot-detail"),
    path("robots/<uuid:pk>/start/",         views.RobotStartView.as_view(),       name="robot-start"),
    path("robots/<uuid:pk>/stop/",          views.RobotStopView.as_view(),        name="robot-stop"),
    path("robots/<uuid:pk>/logs/",          views.RobotLogListView.as_view(),     name="robot-logs"),

    # ── NOTIFICATIONS ─────────────────────────────────────────────
    path("notifications/",                  views.NotificationListView.as_view(),       name="notification-list"),
    path("notifications/mark-read/",        views.NotificationMarkReadView.as_view(),   name="notification-mark-all-read"),
    path("notifications/<uuid:pk>/read/",   views.NotificationMarkReadView.as_view(),   name="notification-mark-read"),

    # ── SYSTEM ────────────────────────────────────────────────────
    path("settings/",               views.PublicSystemSettingsView.as_view(),   name="system-settings"),
]
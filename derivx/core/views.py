"""
core/views.py — DerivX Trading Platform
All API views using Django REST Framework.
"""

import uuid
import logging
from decimal import Decimal
from django.db import transaction as db_transaction
from django.utils import timezone
from django.db.models import Sum, Count, Q
from django.shortcuts import get_object_or_404

from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    User, UserProfile, Wallet, Transaction,
    MpesaTransaction, PaypalTransaction, BinanceTransaction,
    MarketCategory, Market, PriceCandle, PriceTick,
    TradeType, Trade, Robot, RobotLog, Notification, SystemSetting,
)
from .serializers import (
    RegisterSerializer, LoginSerializer, ChangePasswordSerializer,
    UserSerializer, KYCUploadSerializer,
    WalletSerializer, WalletBalanceSerializer, TransactionSerializer,
    MpesaDepositSerializer, MpesaWithdrawSerializer, MpesaTransactionSerializer,
    PaypalDepositSerializer, PaypalWithdrawSerializer, PaypalTransactionSerializer,
    BinanceDepositSerializer, BinanceWithdrawSerializer, BinanceTransactionSerializer,
    MarketCategorySerializer, MarketListSerializer, MarketDetailSerializer,
    PriceCandleSerializer, PriceTickSerializer,
    TradeTypeSerializer, TradePlaceSerializer, TradeSerializer, TradeMiniSerializer,
    RobotSerializer, RobotMiniSerializer, RobotLogSerializer,
    NotificationSerializer, SystemSettingSerializer, DashboardSerializer,
)
from .utils.mpesa import MpesaService
from .utils.paypal import PaypalService
from .utils.binance import BinanceService

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# PAGINATION
# ─────────────────────────────────────────────

class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class SmallPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


# ─────────────────────────────────────────────
# AUTH VIEWS
# ─────────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    "message": "Account created successfully.",
                    "user": UserSerializer(user).data,
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            data = serializer.validated_data
            return Response(
                {
                    "user": UserSerializer(data["user"]).data,
                    "access": data["access"],
                    "refresh": data["refresh"],
                }
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Successfully logged out."})
        except Exception:
            return Response({"error": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data["new_password"])
            request.user.save()
            return Response({"message": "Password updated successfully."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────
# USER & PROFILE VIEWS
# ─────────────────────────────────────────────

class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(
            request.user, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class KYCUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = KYCUploadSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            profile.kyc_status = UserProfile.KYCStatus.SUBMITTED
            profile.save(update_fields=["kyc_status"])
            return Response(
                {"message": "KYC documents uploaded. Verification in progress."},
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        wallets = Wallet.objects.filter(user=user, is_active=True)
        trades_qs = Trade.objects.filter(user=user)
        wins = trades_qs.filter(status=Trade.TradeStatus.WON).count()
        losses = trades_qs.filter(status=Trade.TradeStatus.LOST).count()
        total = trades_qs.count()
        win_rate = (Decimal(wins) / Decimal(total) * 100).quantize(Decimal("0.01")) if total else Decimal("0.00")
        total_profit = trades_qs.aggregate(s=Sum("profit_loss"))["s"] or Decimal("0.00")
        active_robots = Robot.objects.filter(user=user, status=Robot.RobotStatus.ACTIVE).count()
        recent_trades = trades_qs.order_by("-open_time")[:5]
        unread = Notification.objects.filter(user=user, is_read=False).count()

        data = {
            "user": UserSerializer(user).data,
            "wallets": WalletBalanceSerializer(wallets, many=True).data,
            "active_trades_count": trades_qs.filter(status=Trade.TradeStatus.OPEN).count(),
            "total_trades_count": total,
            "total_wins": wins,
            "total_losses": losses,
            "win_rate": win_rate,
            "total_profit": total_profit,
            "active_robots_count": active_robots,
            "recent_trades": TradeMiniSerializer(recent_trades, many=True).data,
            "unread_notifications": unread,
        }
        return Response(data)


# ─────────────────────────────────────────────
# WALLET VIEWS
# ─────────────────────────────────────────────

class WalletListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WalletSerializer

    def get_queryset(self):
        return Wallet.objects.filter(user=self.request.user, is_active=True)


class TransactionListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TransactionSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        qs = Transaction.objects.filter(user=self.request.user)
        tx_type = self.request.query_params.get("type")
        if tx_type:
            qs = qs.filter(transaction_type=tx_type)
        return qs.order_by("-created_at")


# ─────────────────────────────────────────────
# MPESA PAYMENT VIEWS
# ─────────────────────────────────────────────

class MpesaDepositView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = MpesaDepositSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        phone = serializer.validated_data["phone_number"]
        amount = serializer.validated_data["amount"]

        try:
            mpesa_service = MpesaService()
            result = mpesa_service.stk_push(phone_number=phone, amount=int(amount))

            if result.get("ResponseCode") == "0":
                mpesa_tx = MpesaTransaction.objects.create(
                    user=request.user,
                    mpesa_type=MpesaTransaction.MpesaType.STK_PUSH,
                    phone_number=phone,
                    amount=amount,
                    merchant_request_id=result.get("MerchantRequestID", ""),
                    checkout_request_id=result.get("CheckoutRequestID", ""),
                    status=MpesaTransaction.MpesaStatus.PENDING,
                    raw_response=result,
                )
                return Response(
                    {
                        "message": "STK Push sent. Please check your phone and enter M-Pesa PIN.",
                        "checkout_request_id": mpesa_tx.checkout_request_id,
                    },
                    status=status.HTTP_200_OK,
                )
            else:
                return Response(
                    {"error": result.get("errorMessage", "M-Pesa request failed.")},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as e:
            logger.error(f"MpesaDepositView error: {e}")
            return Response({"error": "M-Pesa service error. Try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MpesaWithdrawView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = MpesaWithdrawSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        phone = serializer.validated_data["phone_number"]
        amount = serializer.validated_data["amount"]

        try:
            with db_transaction.atomic():
                wallet = Wallet.objects.select_for_update().get(
                    user=request.user, currency="KES", is_active=True
                )
                wallet.debit(amount)

                mpesa_service = MpesaService()
                result = mpesa_service.b2c_payment(phone_number=phone, amount=int(amount))

                mpesa_tx = MpesaTransaction.objects.create(
                    user=request.user,
                    mpesa_type=MpesaTransaction.MpesaType.B2C,
                    phone_number=phone,
                    amount=amount,
                    conversation_id=result.get("ConversationID", ""),
                    originator_conversation_id=result.get("OriginatorConversationID", ""),
                    status=MpesaTransaction.MpesaStatus.PENDING,
                    raw_response=result,
                )
                return Response(
                    {"message": "Withdrawal initiated. Funds will be sent to your M-Pesa shortly."},
                    status=status.HTTP_200_OK,
                )
        except Exception as e:
            logger.error(f"MpesaWithdrawView error: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MpesaCallbackView(APIView):
    """Receives M-Pesa STK Push result from Safaricom servers."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            data = request.data
            callback_data = data.get("Body", {}).get("stkCallback", {})
            checkout_request_id = callback_data.get("CheckoutRequestID")
            result_code = str(callback_data.get("ResultCode", ""))
            result_desc = callback_data.get("ResultDesc", "")

            mpesa_tx = MpesaTransaction.objects.filter(
                checkout_request_id=checkout_request_id
            ).first()

            if not mpesa_tx:
                return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

            mpesa_tx.result_code = result_code
            mpesa_tx.result_desc = result_desc
            mpesa_tx.raw_callback = data

            if result_code == "0":
                # Payment successful — extract metadata
                items = callback_data.get("CallbackMetadata", {}).get("Item", [])
                meta = {item["Name"]: item.get("Value") for item in items}
                mpesa_tx.mpesa_receipt_number = meta.get("MpesaReceiptNumber", "")
                mpesa_tx.status = MpesaTransaction.MpesaStatus.SUCCESS
                mpesa_tx.save()

                # Credit user KES wallet
                with db_transaction.atomic():
                    wallet, _ = Wallet.objects.get_or_create(
                        user=mpesa_tx.user, currency="KES",
                        defaults={"balance": Decimal("0.00")}
                    )
                    wallet.credit(mpesa_tx.amount)
                    tx = Transaction.objects.create(
                        user=mpesa_tx.user,
                        wallet=wallet,
                        transaction_type=Transaction.TransactionType.DEPOSIT,
                        payment_method=Transaction.PaymentMethod.MPESA,
                        amount=mpesa_tx.amount,
                        currency="KES",
                        net_amount=mpesa_tx.amount,
                        balance_before=wallet.balance - mpesa_tx.amount,
                        balance_after=wallet.balance,
                        status=Transaction.TransactionStatus.COMPLETED,
                        description=f"M-Pesa deposit — {mpesa_tx.mpesa_receipt_number}",
                    )
                    mpesa_tx.transaction = tx
                    mpesa_tx.save(update_fields=["transaction"])

                    # Push WebSocket notification
                    _push_notification(
                        mpesa_tx.user,
                        "deposit",
                        "Deposit Successful",
                        f"KES {mpesa_tx.amount} deposited successfully via M-Pesa.",
                    )
            else:
                mpesa_tx.status = MpesaTransaction.MpesaStatus.FAILED
                mpesa_tx.save()

        except Exception as e:
            logger.error(f"MpesaCallbackView error: {e}")

        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})


class MpesaTransactionListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MpesaTransactionSerializer
    pagination_class = SmallPagination

    def get_queryset(self):
        return MpesaTransaction.objects.filter(user=self.request.user).order_by("-created_at")


# ─────────────────────────────────────────────
# PAYPAL PAYMENT VIEWS
# ─────────────────────────────────────────────

class PaypalDepositView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PaypalDepositSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        amount = serializer.validated_data["amount"]
        currency = serializer.validated_data["currency"]

        try:
            paypal_service = PaypalService()
            order = paypal_service.create_order(amount=str(amount), currency=currency)
            order_id = order.get("id")
            approve_url = next(
                (link["href"] for link in order.get("links", []) if link["rel"] == "approve"),
                None,
            )

            PaypalTransaction.objects.create(
                user=request.user,
                paypal_type=PaypalTransaction.PaypalType.DEPOSIT,
                paypal_order_id=order_id,
                amount=amount,
                currency=currency,
                status=PaypalTransaction.PaypalStatus.CREATED,
                raw_response=order,
            )

            return Response(
                {"order_id": order_id, "approve_url": approve_url},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            logger.error(f"PaypalDepositView error: {e}")
            return Response({"error": "PayPal service error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PaypalCaptureView(APIView):
    """Called after user approves PayPal payment."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")
        if not order_id:
            return Response({"error": "order_id required."}, status=status.HTTP_400_BAD_REQUEST)

        paypal_tx = get_object_or_404(
            PaypalTransaction, paypal_order_id=order_id, user=request.user
        )

        try:
            paypal_service = PaypalService()
            result = paypal_service.capture_order(order_id)

            if result.get("status") == "COMPLETED":
                paypal_tx.status = PaypalTransaction.PaypalStatus.COMPLETED
                paypal_tx.raw_response = result
                paypal_tx.save()

                with db_transaction.atomic():
                    wallet, _ = Wallet.objects.get_or_create(
                        user=request.user, currency=paypal_tx.currency,
                        defaults={"balance": Decimal("0.00")}
                    )
                    wallet.credit(paypal_tx.amount)
                    tx = Transaction.objects.create(
                        user=request.user,
                        wallet=wallet,
                        transaction_type=Transaction.TransactionType.DEPOSIT,
                        payment_method=Transaction.PaymentMethod.PAYPAL,
                        amount=paypal_tx.amount,
                        currency=paypal_tx.currency,
                        net_amount=paypal_tx.amount,
                        balance_before=wallet.balance - paypal_tx.amount,
                        balance_after=wallet.balance,
                        status=Transaction.TransactionStatus.COMPLETED,
                        description=f"PayPal deposit — {order_id}",
                    )
                    paypal_tx.transaction = tx
                    paypal_tx.save(update_fields=["transaction"])

                    _push_notification(
                        request.user, "deposit", "Deposit Successful",
                        f"{paypal_tx.currency} {paypal_tx.amount} deposited via PayPal."
                    )

                return Response({"message": "Payment captured successfully."})
            else:
                paypal_tx.status = PaypalTransaction.PaypalStatus.FAILED
                paypal_tx.save()
                return Response({"error": "Payment capture failed."}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"PaypalCaptureView error: {e}")
            return Response({"error": "PayPal service error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PaypalWithdrawView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PaypalWithdrawSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["paypal_email"]
        amount = serializer.validated_data["amount"]
        currency = serializer.validated_data["currency"]

        try:
            with db_transaction.atomic():
                wallet = Wallet.objects.select_for_update().get(
                    user=request.user, currency=currency, is_active=True
                )
                wallet.debit(amount)

                paypal_service = PaypalService()
                result = paypal_service.create_payout(
                    receiver_email=email, amount=str(amount), currency=currency
                )

                PaypalTransaction.objects.create(
                    user=request.user,
                    paypal_type=PaypalTransaction.PaypalType.WITHDRAWAL,
                    paypal_payout_id=result.get("batch_header", {}).get("payout_batch_id", ""),
                    payer_email=email,
                    amount=amount,
                    currency=currency,
                    status=PaypalTransaction.PaypalStatus.PENDING,
                    raw_response=result,
                )

            return Response({"message": "Withdrawal initiated. Funds will arrive in your PayPal account."})
        except Exception as e:
            logger.error(f"PaypalWithdrawView error: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PaypalWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Verify PayPal webhook signature here in production
        event_type = request.data.get("event_type")
        logger.info(f"PayPal webhook received: {event_type}")
        return Response({"status": "ok"})


# ─────────────────────────────────────────────
# BINANCE PAYMENT VIEWS
# ─────────────────────────────────────────────

class BinanceDepositView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = BinanceDepositSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        coin = serializer.validated_data["coin"]
        amount = serializer.validated_data["amount"]

        try:
            binance_service = BinanceService()
            order = binance_service.create_order(coin=coin, amount=str(amount))

            BinanceTransaction.objects.create(
                user=request.user,
                binance_type=BinanceTransaction.BinanceType.DEPOSIT,
                binance_order_id=order.get("data", {}).get("prepayId", ""),
                prepay_id=order.get("data", {}).get("prepayId", ""),
                coin=coin,
                amount=amount,
                status=BinanceTransaction.BinanceStatus.PENDING,
                raw_response=order,
            )

            return Response(
                {
                    "message": "Binance Pay order created.",
                    "checkout_url": order.get("data", {}).get("checkoutUrl", ""),
                    "prepay_id": order.get("data", {}).get("prepayId", ""),
                }
            )
        except Exception as e:
            logger.error(f"BinanceDepositView error: {e}")
            return Response({"error": "Binance service error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BinanceWithdrawView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = BinanceWithdrawSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        try:
            with db_transaction.atomic():
                currency_map = {"USDT": "USDT", "BTC": "BTC", "ETH": "ETH", "BNB": "USDT"}
                currency = currency_map.get(data["coin"], "USDT")
                wallet = Wallet.objects.select_for_update().get(
                    user=request.user, currency=currency, is_active=True
                )
                wallet.debit(data["amount"])

                binance_service = BinanceService()
                result = binance_service.withdraw(
                    coin=data["coin"],
                    network=data["network"],
                    address=data["wallet_address"],
                    amount=str(data["amount"]),
                )

                BinanceTransaction.objects.create(
                    user=request.user,
                    binance_type=BinanceTransaction.BinanceType.WITHDRAWAL,
                    coin=data["coin"],
                    network=data["network"],
                    wallet_address=data["wallet_address"],
                    amount=data["amount"],
                    status=BinanceTransaction.BinanceStatus.PROCESSING,
                    raw_response=result,
                )

            return Response({"message": "Crypto withdrawal initiated."})
        except Exception as e:
            logger.error(f"BinanceWithdrawView error: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BinanceWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Verify Binance webhook signature here in production
        logger.info("Binance webhook received")
        return Response({"returnCode": "SUCCESS", "returnMessage": None})


# ─────────────────────────────────────────────
# MARKET VIEWS
# ─────────────────────────────────────────────

class MarketCategoryListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = MarketCategorySerializer
    queryset = MarketCategory.objects.filter(is_active=True).order_by("order")


class MarketListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = MarketListSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        qs = Market.objects.filter(is_active=True).select_related("category")
        category = self.request.query_params.get("category")
        search = self.request.query_params.get("search")
        featured = self.request.query_params.get("featured")
        status_filter = self.request.query_params.get("status")

        if category:
            qs = qs.filter(category__slug=category)
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(symbol__icontains=search))
        if featured == "true":
            qs = qs.filter(is_featured=True)
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs.order_by("-is_featured", "category__order", "name")


class MarketDetailView(generics.RetrieveAPIView):
    """SEO detail page: /api/markets/<slug>/"""
    permission_classes = [permissions.AllowAny]
    serializer_class = MarketDetailSerializer
    lookup_field = "slug"
    queryset = Market.objects.filter(is_active=True).select_related("category")


class MarketCandlesView(APIView):
    """OHLC candle data for a market: /api/markets/<slug>/candles/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        market = get_object_or_404(Market, slug=slug, is_active=True)
        granularity = int(request.query_params.get("granularity", 60))
        count = min(int(request.query_params.get("count", 100)), 500)

        candles = PriceCandle.objects.filter(
            market=market, granularity=granularity
        ).order_by("-timestamp")[:count]

        serializer = PriceCandleSerializer(reversed(list(candles)), many=True)
        return Response({"market": market.symbol, "granularity": granularity, "candles": serializer.data})


class MarketTicksView(APIView):
    """Recent ticks for a market: /api/markets/<slug>/ticks/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        market = get_object_or_404(Market, slug=slug, is_active=True)
        count = min(int(request.query_params.get("count", 50)), 200)
        ticks = PriceTick.objects.filter(market=market).order_by("-timestamp")[:count]
        serializer = PriceTickSerializer(reversed(list(ticks)), many=True)
        return Response({"market": market.symbol, "ticks": serializer.data})


# ─────────────────────────────────────────────
# TRADE TYPE VIEWS
# ─────────────────────────────────────────────

class TradeTypeListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = TradeTypeSerializer

    def get_queryset(self):
        qs = TradeType.objects.filter(is_active=True)
        market_slug = self.request.query_params.get("market")
        if market_slug:
            qs = qs.filter(available_on_markets__slug=market_slug)
        return qs.order_by("order")


# ─────────────────────────────────────────────
# TRADE VIEWS
# ─────────────────────────────────────────────

class TradePlaceView(APIView):
    """POST /api/trades/place/ — Place a new trade."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TradePlaceSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        market = serializer.context["market"]
        trade_type = serializer.context["trade_type"]
        stake = data["stake"]
        account_type = data["account_type"]

        try:
            with db_transaction.atomic():
                wallet = Wallet.objects.select_for_update().get(
                    user=request.user, currency="USD", is_active=True
                )

                # Debit stake
                if account_type == "real":
                    wallet.debit(stake)
                else:
                    wallet.demo_balance -= stake
                    wallet.save(update_fields=["demo_balance"])

                # Calculate payout
                payout_pct = trade_type.max_payout_pct
                payout = (stake * payout_pct / 100) + stake

                # Calculate expiry
                duration = data["duration"]
                duration_unit = data["duration_unit"]
                seconds_map = {"t": 2, "s": 1, "m": 60, "h": 3600, "d": 86400}
                expiry_seconds = duration * seconds_map.get(duration_unit, 2)
                expiry_time = timezone.now() + timezone.timedelta(seconds=expiry_seconds)

                trade = Trade.objects.create(
                    user=request.user,
                    wallet=wallet,
                    market=market,
                    trade_type=trade_type,
                    account_type=account_type,
                    stake=stake,
                    payout=payout,
                    payout_pct=payout_pct,
                    duration=duration,
                    duration_unit=duration_unit,
                    entry_price=market.current_price,
                    barrier=data.get("barrier"),
                    barrier_2=data.get("barrier_2"),
                    selected_digit=data.get("selected_digit"),
                    expiry_time=expiry_time,
                    status=Trade.TradeStatus.OPEN,
                )

                # Record transaction
                if account_type == "real":
                    Transaction.objects.create(
                        user=request.user,
                        wallet=wallet,
                        transaction_type=Transaction.TransactionType.TRADE_OPEN,
                        payment_method=Transaction.PaymentMethod.INTERNAL,
                        amount=stake,
                        currency="USD",
                        net_amount=stake,
                        balance_before=wallet.balance + stake,
                        balance_after=wallet.balance,
                        status=Transaction.TransactionStatus.COMPLETED,
                        description=f"Trade opened: {trade.contract_id}",
                    )

                # Schedule trade settlement via Celery
                from .tasks import settle_trade
                settle_trade.apply_async(args=[str(trade.id)], countdown=expiry_seconds)

                return Response(
                    TradeSerializer(trade).data,
                    status=status.HTTP_201_CREATED,
                )

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"TradePlaceView error: {e}")
            return Response({"error": "Trade placement failed."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TradeListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TradeMiniSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        qs = Trade.objects.filter(user=self.request.user).select_related("market", "trade_type")
        status_filter = self.request.query_params.get("status")
        account_type = self.request.query_params.get("account_type")
        market_slug = self.request.query_params.get("market")

        if status_filter:
            qs = qs.filter(status=status_filter)
        if account_type:
            qs = qs.filter(account_type=account_type)
        if market_slug:
            qs = qs.filter(market__slug=market_slug)

        return qs.order_by("-open_time")


class TradeActiveView(generics.ListAPIView):
    """GET /api/trades/active/ — All open trades for user."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TradeSerializer

    def get_queryset(self):
        return Trade.objects.filter(
            user=self.request.user, status=Trade.TradeStatus.OPEN
        ).select_related("market", "trade_type").order_by("-open_time")


class TradeDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TradeSerializer

    def get_queryset(self):
        return Trade.objects.filter(user=self.request.user)


# ─────────────────────────────────────────────
# ROBOT VIEWS
# ─────────────────────────────────────────────

class RobotListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RobotSerializer

    def get_queryset(self):
        return Robot.objects.filter(user=self.request.user).select_related("market", "trade_type")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class RobotDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RobotSerializer

    def get_queryset(self):
        return Robot.objects.filter(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        robot = self.get_object()
        if robot.status == Robot.RobotStatus.ACTIVE:
            return Response(
                {"error": "Stop the robot before deleting it."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class RobotStartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        robot = get_object_or_404(Robot, pk=pk, user=request.user)
        if robot.status == Robot.RobotStatus.ACTIVE:
            return Response({"error": "Robot is already running."}, status=status.HTTP_400_BAD_REQUEST)

        robot.start()
        robot.current_stake = robot.initial_stake
        robot.save(update_fields=["current_stake"])

        # Start robot worker task
        from .tasks import run_robot
        run_robot.delay(str(robot.id))

        return Response({"message": f"Robot '{robot.name}' started.", "status": robot.status})


class RobotStopView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        robot = get_object_or_404(Robot, pk=pk, user=request.user)
        robot.stop()
        RobotLog.objects.create(
            robot=robot,
            level=RobotLog.LogLevel.INFO,
            message="Robot stopped by user.",
        )
        return Response({"message": f"Robot '{robot.name}' stopped.", "status": robot.status})


class RobotLogListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RobotLogSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        robot = get_object_or_404(Robot, pk=self.kwargs["pk"], user=self.request.user)
        return RobotLog.objects.filter(robot=robot).order_by("-created_at")


class PublicRobotListView(generics.ListAPIView):
    """Browse community-shared robots."""
    permission_classes = [permissions.AllowAny]
    serializer_class = RobotMiniSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        return Robot.objects.filter(is_public=True).order_by("-total_profit")


# ─────────────────────────────────────────────
# NOTIFICATION VIEWS
# ─────────────────────────────────────────────

class NotificationListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer
    pagination_class = SmallPagination

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by("-created_at")


class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk=None):
        if pk:
            Notification.objects.filter(pk=pk, user=request.user).update(is_read=True)
        else:
            # Mark all as read
            Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"message": "Notifications marked as read."})


# ─────────────────────────────────────────────
# SYSTEM SETTINGS VIEW
# ─────────────────────────────────────────────

class PublicSystemSettingsView(generics.ListAPIView):
    """Returns only is_public=True settings for frontend config."""
    permission_classes = [permissions.AllowAny]
    serializer_class = SystemSettingSerializer
    queryset = SystemSetting.objects.filter(is_public=True)


# ─────────────────────────────────────────────
# HELPERS (internal)
# ─────────────────────────────────────────────

def _push_notification(user, notification_type, title, message):
    """Creates a DB notification and pushes it over WebSocket."""
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    import json

    notif = Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
    )

    channel_layer = get_channel_layer()
    if channel_layer:
        try:
            async_to_sync(channel_layer.group_send)(
                f"notifications_{user.id}",
                {
                    "type": "notification.message",
                    "notification": NotificationSerializer(notif).data,
                },
            )
        except Exception as e:
            logger.warning(f"WebSocket push failed: {e}")
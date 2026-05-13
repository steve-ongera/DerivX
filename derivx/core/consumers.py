"""
core/consumers.py — DerivX WebSocket Consumers
Real-time price feeds, trade updates, and notifications via Django Channels.

WebSocket Routes:
  ws://<host>/ws/prices/<market-slug>/   — live price ticks for a market
  ws://<host>/ws/trades/                 — user's live trade updates
  ws://<host>/ws/notifications/          — user's live notifications
"""

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

async def get_user_from_scope(scope):
    """
    Extract authenticated user from WebSocket scope using JWT token.
    Expects: ws://host/ws/.../?token=<access_token>
    """
    from rest_framework_simplejwt.tokens import AccessToken
    from rest_framework_simplejwt.exceptions import TokenError
    from core.models import User

    query_string = scope.get("query_string", b"").decode()
    params = dict(p.split("=") for p in query_string.split("&") if "=" in p)
    token_str = params.get("token", "")

    if not token_str:
        return AnonymousUser()

    try:
        token = AccessToken(token_str)
        user_id = token["user_id"]
        user = await database_sync_to_async(User.objects.get)(id=user_id)
        return user
    except (TokenError, User.DoesNotExist, Exception) as e:
        logger.warning(f"WebSocket auth failed: {e}")
        return AnonymousUser()


# ─────────────────────────────────────────────
# 1. PRICE FEED CONSUMER
# ws://<host>/ws/prices/<market-slug>/
# ─────────────────────────────────────────────

class PriceFeedConsumer(AsyncWebsocketConsumer):
    """
    Streams real-time price ticks for a specific market.
    Anyone (authenticated or anonymous) can subscribe.

    Messages sent to client:
      { "type": "tick", "symbol": "R_100", "price": "1234.5678",
        "ask": "1234.5700", "bid": "1234.5656",
        "epoch": 1716000000, "timestamp": "2026-05-13T12:00:00Z",
        "last_digit": 8 }

      { "type": "candle", "granularity": 60,
        "open": "1233.00", "high": "1235.00",
        "low": "1232.50", "close": "1234.57",
        "volume": "0.00", "timestamp": "2026-05-13T12:00:00Z" }

      { "type": "market_status", "status": "open" | "closed" }
    """

    async def connect(self):
        self.market_slug = self.scope["url_route"]["kwargs"]["slug"]
        self.group_name = f"prices_{self.market_slug}"

        # Validate market exists
        market = await self._get_market(self.market_slug)
        if not market:
            await self.close(code=4004)
            return

        self.market_symbol = market["symbol"]

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send last 50 ticks on connect so client can render initial chart
        ticks = await self._get_recent_ticks(self.market_slug, count=50)
        await self.send(text_data=json.dumps({
            "type": "history",
            "symbol": self.market_symbol,
            "ticks": ticks,
        }))

        logger.info(f"PriceFeedConsumer connected: {self.market_slug}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info(f"PriceFeedConsumer disconnected: {self.market_slug} code={close_code}")

    async def receive(self, text_data):
        """
        Clients can send subscription config:
          { "action": "subscribe_candles", "granularity": 60 }
          { "action": "unsubscribe_candles" }
        """
        try:
            data = json.loads(text_data)
            action = data.get("action")
            if action == "subscribe_candles":
                granularity = data.get("granularity", 60)
                candles = await self._get_recent_candles(self.market_slug, granularity, count=200)
                await self.send(text_data=json.dumps({
                    "type": "candle_history",
                    "symbol": self.market_symbol,
                    "granularity": granularity,
                    "candles": candles,
                }))
            elif action == "ping":
                await self.send(text_data=json.dumps({"type": "pong"}))
        except json.JSONDecodeError:
            pass

    # ── Group message handlers (called by Celery tasks / price engine) ──

    async def price_tick(self, event):
        """Receives a tick from the channel layer and forwards to client."""
        await self.send(text_data=json.dumps({
            "type": "tick",
            **event["tick"],
        }))

    async def price_candle(self, event):
        """Receives a completed candle from the channel layer."""
        await self.send(text_data=json.dumps({
            "type": "candle",
            **event["candle"],
        }))

    async def market_status(self, event):
        await self.send(text_data=json.dumps({
            "type": "market_status",
            "status": event["status"],
        }))

    # ── DB helpers ──

    @database_sync_to_async
    def _get_market(self, slug):
        from core.models import Market
        try:
            m = Market.objects.get(slug=slug, is_active=True)
            return {"id": str(m.id), "symbol": m.symbol, "status": m.status}
        except Market.DoesNotExist:
            return None

    @database_sync_to_async
    def _get_recent_ticks(self, slug, count=50):
        from core.models import PriceTick
        ticks = PriceTick.objects.filter(
            market__slug=slug
        ).order_by("-timestamp")[:count]
        return [
            {
                "price": str(t.price),
                "ask": str(t.ask) if t.ask else None,
                "bid": str(t.bid) if t.bid else None,
                "epoch": t.epoch,
                "timestamp": t.timestamp.isoformat(),
                "last_digit": t.last_digit,
            }
            for t in reversed(list(ticks))
        ]

    @database_sync_to_async
    def _get_recent_candles(self, slug, granularity, count=200):
        from core.models import PriceCandle
        candles = PriceCandle.objects.filter(
            market__slug=slug, granularity=granularity
        ).order_by("-timestamp")[:count]
        return [
            {
                "open": str(c.open_price),
                "high": str(c.high_price),
                "low": str(c.low_price),
                "close": str(c.close_price),
                "volume": str(c.volume),
                "timestamp": c.timestamp.isoformat(),
                "epoch": int(c.timestamp.timestamp()),
            }
            for c in reversed(list(candles))
        ]


# ─────────────────────────────────────────────
# 2. TRADE CONSUMER
# ws://<host>/ws/trades/
# ─────────────────────────────────────────────

class TradeConsumer(AsyncWebsocketConsumer):
    """
    Authenticated consumer for live trade updates.

    Messages sent to client:
      { "type": "trade_opened",  "trade": { ...TradeSerializer data... } }
      { "type": "trade_settled", "trade": { ...TradeSerializer data... }, "result": "won"|"lost" }
      { "type": "trade_update",  "trade": { ... } }
      { "type": "balance_update","currency": "USD", "balance": "9875.40", "demo_balance": "10000.00" }
    """

    async def connect(self):
        self.user = await get_user_from_scope(self.scope)

        if self.user.is_anonymous:
            await self.close(code=4001)
            return

        self.group_name = f"trades_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send current open trades and balance on connect
        open_trades = await self._get_open_trades()
        balance = await self._get_balance()
        await self.send(text_data=json.dumps({
            "type": "init",
            "open_trades": open_trades,
            "balance": balance,
        }))

        logger.info(f"TradeConsumer connected: user={self.user.email}")

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get("action")
            if action == "ping":
                await self.send(text_data=json.dumps({"type": "pong"}))
            elif action == "get_balance":
                balance = await self._get_balance()
                await self.send(text_data=json.dumps({"type": "balance_update", **balance}))
        except json.JSONDecodeError:
            pass

    # ── Group handlers ──

    async def trade_opened(self, event):
        await self.send(text_data=json.dumps({
            "type": "trade_opened",
            "trade": event["trade"],
        }))

    async def trade_settled(self, event):
        await self.send(text_data=json.dumps({
            "type": "trade_settled",
            "trade": event["trade"],
            "result": event["result"],
            "profit_loss": event["profit_loss"],
        }))

    async def balance_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "balance_update",
            "currency": event["currency"],
            "balance": event["balance"],
            "demo_balance": event["demo_balance"],
        }))

    async def trade_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "trade_update",
            "trade": event["trade"],
        }))

    # ── DB helpers ──

    @database_sync_to_async
    def _get_open_trades(self):
        from core.models import Trade
        from core.serializers import TradeMiniSerializer
        trades = Trade.objects.filter(
            user=self.user, status=Trade.TradeStatus.OPEN
        ).select_related("market", "trade_type").order_by("-open_time")[:20]
        return TradeMiniSerializer(trades, many=True).data

    @database_sync_to_async
    def _get_balance(self):
        from core.models import Wallet
        wallets = Wallet.objects.filter(user=self.user, is_active=True)
        return {
            w.currency: {
                "balance": str(w.balance),
                "demo_balance": str(w.demo_balance),
            }
            for w in wallets
        }


# ─────────────────────────────────────────────
# 3. NOTIFICATION CONSUMER
# ws://<host>/ws/notifications/
# ─────────────────────────────────────────────

class NotificationConsumer(AsyncWebsocketConsumer):
    """
    Authenticated consumer for real-time in-app notifications.

    Messages sent to client:
      { "type": "notification", "notification": { ...NotificationSerializer data... } }
      { "type": "unread_count", "count": 5 }
    """

    async def connect(self):
        self.user = await get_user_from_scope(self.scope)

        if self.user.is_anonymous:
            await self.close(code=4001)
            return

        self.group_name = f"notifications_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send unread count on connect
        count = await self._get_unread_count()
        await self.send(text_data=json.dumps({
            "type": "unread_count",
            "count": count,
        }))

        logger.info(f"NotificationConsumer connected: user={self.user.email}")

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get("action")
            if action == "mark_read":
                notif_id = data.get("notification_id")
                await self._mark_read(notif_id)
                count = await self._get_unread_count()
                await self.send(text_data=json.dumps({"type": "unread_count", "count": count}))
            elif action == "mark_all_read":
                await self._mark_all_read()
                await self.send(text_data=json.dumps({"type": "unread_count", "count": 0}))
            elif action == "ping":
                await self.send(text_data=json.dumps({"type": "pong"}))
        except json.JSONDecodeError:
            pass

    # ── Group handlers ──

    async def notification_message(self, event):
        """Receives notification from channel layer and forwards to client."""
        await self.send(text_data=json.dumps({
            "type": "notification",
            "notification": event["notification"],
        }))
        count = await self._get_unread_count()
        await self.send(text_data=json.dumps({"type": "unread_count", "count": count}))

    # ── DB helpers ──

    @database_sync_to_async
    def _get_unread_count(self):
        from core.models import Notification
        return Notification.objects.filter(user=self.user, is_read=False).count()

    @database_sync_to_async
    def _mark_read(self, notif_id):
        from core.models import Notification
        if notif_id:
            Notification.objects.filter(id=notif_id, user=self.user).update(is_read=True)

    @database_sync_to_async
    def _mark_all_read(self):
        from core.models import Notification
        Notification.objects.filter(user=self.user, is_read=False).update(is_read=True)


# ─────────────────────────────────────────────
# 4. ROBOT CONSUMER
# ws://<host>/ws/robots/<robot-id>/
# ─────────────────────────────────────────────

class RobotConsumer(AsyncWebsocketConsumer):
    """
    Streams live robot logs and status updates.

    Messages sent to client:
      { "type": "robot_log",    "log": { ...RobotLogSerializer data... } }
      { "type": "robot_status", "status": "active"|"stopped"|"error",
        "session_profit": "25.50", "total_trades": 42 }
      { "type": "trade_placed", "trade": { ... } }
    """

    async def connect(self):
        self.user = await get_user_from_scope(self.scope)
        if self.user.is_anonymous:
            await self.close(code=4001)
            return

        self.robot_id = self.scope["url_route"]["kwargs"]["robot_id"]

        # Verify robot belongs to user
        robot = await self._get_robot(self.robot_id)
        if not robot:
            await self.close(code=4004)
            return

        self.group_name = f"robot_{self.robot_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send current robot status and last 20 logs
        logs = await self._get_recent_logs(self.robot_id)
        await self.send(text_data=json.dumps({
            "type": "init",
            "robot": robot,
            "recent_logs": logs,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get("action") == "ping":
                await self.send(text_data=json.dumps({"type": "pong"}))
        except json.JSONDecodeError:
            pass

    # ── Group handlers ──

    async def robot_log(self, event):
        await self.send(text_data=json.dumps({
            "type": "robot_log",
            "log": event["log"],
        }))

    async def robot_status(self, event):
        await self.send(text_data=json.dumps({
            "type": "robot_status",
            "status": event["status"],
            "session_profit": event.get("session_profit", "0.00"),
            "total_trades": event.get("total_trades", 0),
            "win_rate": event.get("win_rate", "0.00"),
        }))

    async def trade_placed(self, event):
        await self.send(text_data=json.dumps({
            "type": "trade_placed",
            "trade": event["trade"],
        }))

    # ── DB helpers ──

    @database_sync_to_async
    def _get_robot(self, robot_id):
        from core.models import Robot
        from core.serializers import RobotMiniSerializer
        try:
            r = Robot.objects.get(id=robot_id, user=self.user)
            return RobotMiniSerializer(r).data
        except Robot.DoesNotExist:
            return None

    @database_sync_to_async
    def _get_recent_logs(self, robot_id, count=20):
        from core.models import RobotLog
        from core.serializers import RobotLogSerializer
        logs = RobotLog.objects.filter(
            robot_id=robot_id
        ).order_by("-created_at")[:count]
        return RobotLogSerializer(reversed(list(logs)), many=True).data
# core/signals.py
"""
Django signals for automated side effects:
- Auto-create UserProfile and Wallet on User creation
- Notify via WebSocket when trade status changes
- Log robot events
"""
import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, sender="core.User")
def create_user_profile_and_wallet(sender, instance, created, **kwargs):
    """Auto-create UserProfile and default USD Wallet when a new User is created."""
    if not created:
        return
    from core.models import UserProfile, Wallet
    from decimal import Decimal
    from django.conf import settings

    UserProfile.objects.get_or_create(user=instance)
    Wallet.objects.get_or_create(
        user=instance,
        currency="USD",
        defaults={
            "balance":      Decimal("0.00"),
            "demo_balance": Decimal(str(getattr(settings, "DERIVX_DEMO_BALANCE", 10000.0))),
        },
    )
    logger.info(f"Auto-created profile and USD wallet for {instance.email}")


@receiver(post_save, sender="core.Trade")
def on_trade_saved(sender, instance, created, **kwargs):
    """Push WebSocket event whenever a trade is opened or settled."""
    if not created:
        return
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        from core.serializers import TradeMiniSerializer
        import json

        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        trade_data = json.loads(
            json.dumps(TradeMiniSerializer(instance).data, default=str)
        )
        async_to_sync(channel_layer.group_send)(
            f"trades_{instance.user_id}",
            {"type": "trade.opened", "trade": trade_data},
        )
    except Exception as e:
        logger.warning(f"Trade WS signal failed: {e}")


@receiver(post_save, sender="core.MpesaTransaction")
def on_mpesa_status_change(sender, instance, created, **kwargs):
    """Log M-Pesa status changes."""
    if not created:
        logger.info(f"M-Pesa TX updated: {instance.checkout_request_id} → {instance.status}")


@receiver(post_save, sender="core.Robot")
def on_robot_status_change(sender, instance, created, **kwargs):
    """Push robot status update over WebSocket."""
    if created:
        return
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        async_to_sync(channel_layer.group_send)(
            f"robot_{instance.id}",
            {
                "type":          "robot.status",
                "status":        instance.status,
                "session_profit": str(instance.session_profit),
                "total_trades":   instance.total_trades,
                "win_rate":       str(instance.win_rate),
            },
        )
    except Exception as e:
        logger.warning(f"Robot WS signal failed: {e}")
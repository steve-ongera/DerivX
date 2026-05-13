"""
core/tasks.py — DerivX Celery Tasks
Price simulation, trade settlement, robot trading engine, candle building.
"""

import json
import random
import logging
from decimal import Decimal, ROUND_DOWN
from datetime import timedelta

from celery import shared_task
from django.utils import timezone
from django.db import transaction as db_transaction
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)
channel_layer = get_channel_layer()


# ─────────────────────────────────────────────
# PRICE SIMULATION
# ─────────────────────────────────────────────

@shared_task(name="core.tasks.generate_price_ticks")
def generate_price_ticks():
    """
    Called every second by Celery Beat.
    Generates simulated price ticks for all active simulated markets
    and broadcasts them over WebSocket via Django Channels.
    """
    from core.models import Market, PriceTick

    markets = Market.objects.filter(
        is_active=True,
        status="open",
        price_feed_source="simulated",
    ).only("id", "symbol", "slug", "current_price", "volatility", "display_decimals", "pip_size")

    now = timezone.now()
    epoch = int(now.timestamp())

    ticks_to_create = []

    for market in markets:
        try:
            current = float(market.current_price)
            volatility = float(market.volatility)
            decimals = market.display_decimals

            # Brownian motion price simulation
            pct_change = random.gauss(0, volatility / 10000)
            new_price = current * (1 + pct_change)
            new_price = max(new_price, float(market.pip_size))  # floor at pip size

            spread = new_price * 0.00002  # 0.002% spread
            ask = new_price + spread / 2
            bid = new_price - spread / 2

            price_dec = Decimal(str(round(new_price, decimals)))
            ask_dec = Decimal(str(round(ask, decimals)))
            bid_dec = Decimal(str(round(bid, decimals)))

            # Update market current price
            Market.objects.filter(id=market.id).update(
                current_price=price_dec,
                price_change_24h=price_dec - market.current_price,
            )

            tick = PriceTick(
                market_id=market.id,
                price=price_dec,
                ask=ask_dec,
                bid=bid_dec,
                epoch=epoch,
                timestamp=now,
            )
            ticks_to_create.append(tick)

            # Broadcast tick to WebSocket subscribers
            tick_data = {
                "symbol": market.symbol,
                "price": str(price_dec),
                "ask": str(ask_dec),
                "bid": str(bid_dec),
                "epoch": epoch,
                "timestamp": now.isoformat(),
                "last_digit": int(str(price_dec).replace(".", "")[-1]),
            }

            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"prices_{market.slug}",
                    {"type": "price.tick", "tick": tick_data},
                )

        except Exception as e:
            logger.error(f"Price tick error for {market.symbol}: {e}")

    # Bulk insert ticks
    if ticks_to_create:
        PriceTick.objects.bulk_create(ticks_to_create, ignore_conflicts=True)


@shared_task(name="core.tasks.build_candles")
def build_candles(granularity: int = 60):
    """
    Aggregates recent ticks into OHLC candles for a given granularity (seconds).
    Called by Celery Beat at each granularity interval.
    """
    from core.models import Market, PriceTick, PriceCandle
    from django.db.models import Max, Min, Avg

    now = timezone.now()
    # Round down to nearest candle boundary
    boundary_epoch = int(now.timestamp()) // granularity * granularity
    candle_start = timezone.datetime.fromtimestamp(boundary_epoch - granularity, tz=timezone.utc)
    candle_end = timezone.datetime.fromtimestamp(boundary_epoch, tz=timezone.utc)

    markets = Market.objects.filter(is_active=True, status="open")

    for market in markets:
        ticks = PriceTick.objects.filter(
            market=market,
            timestamp__gte=candle_start,
            timestamp__lt=candle_end,
        ).order_by("timestamp")

        if not ticks.exists():
            continue

        prices = list(ticks.values_list("price", flat=True))
        open_p = prices[0]
        close_p = prices[-1]
        high_p = max(prices)
        low_p = min(prices)

        candle, created = PriceCandle.objects.update_or_create(
            market=market,
            granularity=granularity,
            timestamp=candle_start,
            defaults={
                "open_price": open_p,
                "high_price": high_p,
                "low_price": low_p,
                "close_price": close_p,
            },
        )

        # Broadcast candle to WebSocket subscribers
        if channel_layer:
            candle_data = {
                "granularity": granularity,
                "open": str(open_p),
                "high": str(high_p),
                "low": str(low_p),
                "close": str(close_p),
                "volume": "0.00",
                "timestamp": candle_start.isoformat(),
                "epoch": boundary_epoch - granularity,
            }
            async_to_sync(channel_layer.group_send)(
                f"prices_{market.slug}",
                {"type": "price.candle", "candle": candle_data},
            )


@shared_task(name="core.tasks.cleanup_old_ticks")
def cleanup_old_ticks():
    """Delete ticks older than 24 hours to prevent table bloat."""
    from core.models import PriceTick
    cutoff = timezone.now() - timedelta(hours=24)
    deleted, _ = PriceTick.objects.filter(timestamp__lt=cutoff).delete()
    logger.info(f"Cleaned up {deleted} old price ticks.")


# ─────────────────────────────────────────────
# TRADE SETTLEMENT
# ─────────────────────────────────────────────

@shared_task(name="core.tasks.settle_trade", bind=True, max_retries=3)
def settle_trade(self, trade_id: str):
    """
    Settle a single trade by contract ID at expiry.
    Called via apply_async with countdown from TradePlaceView.
    """
    from core.models import Trade, Wallet, Transaction, PriceTick

    try:
        with db_transaction.atomic():
            trade = Trade.objects.select_for_update().select_related(
                "market", "trade_type", "user", "wallet"
            ).get(id=trade_id, status=Trade.TradeStatus.OPEN)
    except Trade.DoesNotExist:
        logger.warning(f"settle_trade: Trade {trade_id} not found or already settled.")
        return

    try:
        # Get latest price tick for this market
        latest_tick = PriceTick.objects.filter(
            market=trade.market
        ).order_by("-timestamp").first()

        if not latest_tick:
            logger.error(f"settle_trade: No price ticks for {trade.market.symbol}")
            return

        exit_price = latest_tick.price
        result = _evaluate_trade(trade, latest_tick)

        with db_transaction.atomic():
            trade.exit_price = exit_price
            trade.last_digit = latest_tick.last_digit
            trade.close_time = timezone.now()

            if result == "won":
                trade.status = Trade.TradeStatus.WON
                trade.profit_loss = trade.payout - trade.stake

                # Credit wallet
                wallet = Wallet.objects.select_for_update().get(id=trade.wallet_id)
                if trade.account_type == "real":
                    wallet.credit(trade.payout)
                    Transaction.objects.create(
                        user=trade.user,
                        wallet=wallet,
                        transaction_type=Transaction.TransactionType.TRADE_WIN,
                        payment_method=Transaction.PaymentMethod.INTERNAL,
                        amount=trade.payout,
                        currency="USD",
                        net_amount=trade.payout,
                        balance_before=wallet.balance - trade.payout,
                        balance_after=wallet.balance,
                        status=Transaction.TransactionStatus.COMPLETED,
                        description=f"Trade WON: {trade.contract_id}",
                    )
                else:
                    wallet.demo_balance += trade.payout
                    wallet.save(update_fields=["demo_balance"])

            else:
                trade.status = Trade.TradeStatus.LOST
                trade.profit_loss = -trade.stake

            trade.save()

        # Push WebSocket updates
        _broadcast_trade_settled(trade)

        # Update robot stats if robot trade
        if trade.is_robot_trade and trade.robot_id:
            update_robot_stats.delay(str(trade.robot_id), str(trade.id), result)

        logger.info(
            f"Trade settled: {trade.contract_id} | {result.upper()} | "
            f"P/L: {trade.profit_loss} | Market: {trade.market.symbol}"
        )

    except Exception as e:
        logger.error(f"settle_trade error for {trade_id}: {e}")
        self.retry(exc=e, countdown=2)


@shared_task(name="core.tasks.settle_expired_trades")
def settle_expired_trades():
    """
    Safety net: catches any trades that missed their scheduled settlement.
    Runs every 2 seconds via Celery Beat.
    """
    from core.models import Trade

    now = timezone.now()
    expired = Trade.objects.filter(
        status=Trade.TradeStatus.OPEN,
        expiry_time__lte=now,
    ).values_list("id", flat=True)[:20]

    for trade_id in expired:
        settle_trade.delay(str(trade_id))


def _evaluate_trade(trade, latest_tick) -> str:
    """
    Core trade evaluation logic.
    Returns 'won' or 'lost' based on trade type and market data.
    """
    contract_type = trade.trade_type.contract_type
    entry = trade.entry_price
    exit_p = latest_tick.price
    last_digit = latest_tick.last_digit

    evaluators = {
        "CALL":       lambda: exit_p > entry,                                    # Rise
        "PUT":        lambda: exit_p < entry,                                    # Fall
        "CALLE":      lambda: exit_p >= (trade.barrier or entry),                # Higher
        "PUTE":       lambda: exit_p <= (trade.barrier or entry),                # Lower
        "ONETOUCH":   lambda: _check_touch(trade),                               # Touch
        "NOTOUCH":    lambda: not _check_touch(trade),                           # No Touch
        "DIGITODD":   lambda: last_digit % 2 != 0,                              # Odd
        "DIGITEVEN":  lambda: last_digit % 2 == 0,                              # Even
        "DIGITMATCH": lambda: last_digit == (trade.selected_digit or 0),        # Matches
        "DIGITDIFF":  lambda: last_digit != (trade.selected_digit or 0),        # Differs
        "DIGITOVER":  lambda: last_digit > (trade.selected_digit or 0),         # Over
        "DIGITUNDER": lambda: last_digit < (trade.selected_digit or 0),         # Under
        "ASIANU":     lambda: exit_p > entry,                                    # Asian Up (simplified)
        "ASIAND":     lambda: exit_p < entry,                                    # Asian Down (simplified)
    }

    evaluator = evaluators.get(contract_type)
    if evaluator is None:
        logger.warning(f"Unknown contract type: {contract_type} — defaulting to LOST")
        return "lost"

    try:
        won = evaluator()
        return "won" if won else "lost"
    except Exception as e:
        logger.error(f"Trade evaluation error [{contract_type}]: {e}")
        return "lost"


def _check_touch(trade) -> bool:
    """Check if market touched barrier during trade duration."""
    from core.models import PriceTick
    if not trade.barrier:
        return False
    ticks = PriceTick.objects.filter(
        market=trade.market,
        timestamp__gte=trade.open_time,
        timestamp__lte=trade.close_time or timezone.now(),
    )
    for tick in ticks:
        if tick.price >= trade.barrier:
            return True
    return False


def _broadcast_trade_settled(trade):
    """Push trade settlement over WebSocket to the user."""
    from core.serializers import TradeMiniSerializer
    if not channel_layer:
        return
    try:
        trade_data = TradeMiniSerializer(trade).data
        # Convert Decimal to str for JSON serialization
        trade_data = json.loads(json.dumps(trade_data, default=str))

        async_to_sync(channel_layer.group_send)(
            f"trades_{trade.user_id}",
            {
                "type": "trade.settled",
                "trade": trade_data,
                "result": trade.status,
                "profit_loss": str(trade.profit_loss),
            },
        )

        # Balance update
        from core.models import Wallet
        wallet = Wallet.objects.filter(user=trade.user, currency="USD").first()
        if wallet:
            async_to_sync(channel_layer.group_send)(
                f"trades_{trade.user_id}",
                {
                    "type": "balance.update",
                    "currency": "USD",
                    "balance": str(wallet.balance),
                    "demo_balance": str(wallet.demo_balance),
                },
            )

        # Notification
        from core.models import Notification
        from core.serializers import NotificationSerializer
        icon = "bi-check-circle-fill" if trade.status == "won" else "bi-x-circle-fill"
        result_text = "WON" if trade.status == "won" else "LOST"
        profit_text = f"+{trade.profit_loss}" if trade.profit_loss >= 0 else str(trade.profit_loss)
        notif = Notification.objects.create(
            user=trade.user,
            notification_type="trade_result",
            title=f"Trade {result_text}",
            message=f"{trade.trade_type.display_name} on {trade.market.name} — {profit_text} USD",
            icon=icon,
            action_url=f"/trades/{trade.id}/",
        )
        notif_data = json.loads(json.dumps(NotificationSerializer(notif).data, default=str))
        async_to_sync(channel_layer.group_send)(
            f"notifications_{trade.user_id}",
            {"type": "notification.message", "notification": notif_data},
        )

    except Exception as e:
        logger.error(f"_broadcast_trade_settled error: {e}")


# ─────────────────────────────────────────────
# ROBOT ENGINE
# ─────────────────────────────────────────────

@shared_task(name="core.tasks.run_robot", bind=True)
def run_robot(self, robot_id: str):
    """
    Main robot loop. Runs continuously while robot is ACTIVE.
    Places trades and reschedules itself after each trade duration.
    """
    from core.models import Robot, RobotLog, Market, PriceTick

    try:
        robot = Robot.objects.select_related("market", "trade_type", "user").get(
            id=robot_id, status=Robot.RobotStatus.ACTIVE
        )
    except Robot.DoesNotExist:
        logger.info(f"run_robot: Robot {robot_id} not found or not active.")
        return

    # ── Risk checks ──
    if robot.take_profit and robot.session_profit >= robot.take_profit:
        robot.stop()
        _robot_log(robot, "info", f"Take profit reached: {robot.session_profit}. Robot stopped.")
        return

    if robot.stop_loss and robot.session_profit <= -robot.stop_loss:
        robot.stop()
        _robot_log(robot, "warning", f"Stop loss reached: {robot.session_profit}. Robot stopped.")
        return

    if robot.max_trades and robot.total_trades >= robot.max_trades:
        robot.stop()
        _robot_log(robot, "info", f"Max trades reached: {robot.total_trades}. Robot stopped.")
        return

    if robot.max_consecutive_losses and robot.consecutive_losses >= robot.max_consecutive_losses:
        robot.stop()
        _robot_log(robot, "warning",
                   f"Max consecutive losses ({robot.consecutive_losses}) reached. Robot stopped.")
        return

    # ── Calculate stake for this round ──
    stake = _calculate_robot_stake(robot)
    if stake > robot.max_stake:
        stake = robot.max_stake

    # ── Place trade ──
    try:
        from core.models import Wallet, Trade, Transaction
        from django.db import transaction as dbt

        with dbt.atomic():
            wallet = Wallet.objects.select_for_update().get(
                user=robot.user, currency="USD", is_active=True
            )

            if robot.account_type == "real" and wallet.balance < stake:
                robot.stop()
                _robot_log(robot, "error", "Insufficient balance. Robot stopped.")
                return
            if robot.account_type == "demo" and wallet.demo_balance < stake:
                robot.stop()
                _robot_log(robot, "error", "Insufficient demo balance. Robot stopped.")
                return

            payout_pct = robot.trade_type.max_payout_pct
            payout = (stake * payout_pct / 100) + stake

            # Debit wallet
            if robot.account_type == "real":
                wallet.debit(stake)
            else:
                wallet.demo_balance -= stake
                wallet.save(update_fields=["demo_balance"])

            # Calculate expiry
            seconds_map = {"t": 2, "s": 1, "m": 60, "h": 3600, "d": 86400}
            expiry_seconds = robot.duration * seconds_map.get(robot.duration_unit, 2)
            expiry_time = timezone.now() + timedelta(seconds=expiry_seconds)

            trade = Trade.objects.create(
                user=robot.user,
                wallet=wallet,
                market=robot.market,
                trade_type=robot.trade_type,
                account_type=robot.account_type,
                stake=stake,
                payout=payout,
                payout_pct=payout_pct,
                duration=robot.duration,
                duration_unit=robot.duration_unit,
                entry_price=robot.market.current_price,
                expiry_time=expiry_time,
                status=Trade.TradeStatus.OPEN,
                robot=robot,
                is_robot_trade=True,
            )

            robot.current_stake = stake
            robot.save(update_fields=["current_stake", "updated_at"])

        _robot_log(robot, "trade", f"Trade placed: {trade.contract_id} | Stake: {stake} | Payout: {payout}")

        # Broadcast trade placed to robot WebSocket
        if channel_layer:
            from core.serializers import TradeMiniSerializer
            trade_data = json.loads(json.dumps(TradeMiniSerializer(trade).data, default=str))
            async_to_sync(channel_layer.group_send)(
                f"robot_{robot_id}",
                {"type": "trade.placed", "trade": trade_data},
            )

        # Settle trade after expiry
        settle_trade.apply_async(args=[str(trade.id)], countdown=expiry_seconds)

        # Reschedule robot loop after trade finishes
        run_robot.apply_async(args=[robot_id], countdown=expiry_seconds + 1)

    except Exception as e:
        logger.error(f"run_robot trade error: {e}")
        _robot_log(robot, "error", f"Trade error: {str(e)}")
        robot.status = Robot.RobotStatus.ERROR
        robot.save(update_fields=["status"])


@shared_task(name="core.tasks.update_robot_stats")
def update_robot_stats(robot_id: str, trade_id: str, result: str):
    """Update robot win/loss stats after a trade settles."""
    from core.models import Robot, Trade, RobotLog

    try:
        robot = Robot.objects.select_for_update().get(id=robot_id)
        trade = Trade.objects.get(id=trade_id)

        robot.total_trades += 1
        robot.session_profit += trade.profit_loss

        if result == "won":
            robot.total_wins += 1
            robot.total_profit += trade.profit_loss
            robot.consecutive_losses = 0
        else:
            robot.total_losses += 1
            robot.total_profit += trade.profit_loss  # will be negative
            robot.consecutive_losses += 1

        robot.save(update_fields=[
            "total_trades", "total_wins", "total_losses",
            "total_profit", "consecutive_losses", "session_profit", "updated_at",
        ])

        _robot_log(
            robot, "success" if result == "won" else "warning",
            f"Trade {result.upper()}: P/L {trade.profit_loss} | Session: {robot.session_profit}",
            trade=trade,
            stake=trade.stake,
            result=result,
            profit=trade.profit_loss,
            session_profit=robot.session_profit,
        )

        # Broadcast robot status update
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"robot_{robot_id}",
                {
                    "type": "robot.status",
                    "status": robot.status,
                    "session_profit": str(robot.session_profit),
                    "total_trades": robot.total_trades,
                    "win_rate": str(robot.win_rate),
                },
            )

    except Exception as e:
        logger.error(f"update_robot_stats error: {e}")


def _calculate_robot_stake(robot) -> Decimal:
    """Calculate next trade stake based on robot strategy."""
    strategy = robot.strategy
    initial = robot.initial_stake
    current = robot.current_stake or initial

    if strategy == "flat_bet":
        return Decimal(str(initial))

    elif strategy == "martingale":
        if robot.consecutive_losses == 0:
            return Decimal(str(initial))
        return (Decimal(str(current)) * Decimal(str(robot.stake_multiplier))).quantize(
            Decimal("0.01"), rounding=ROUND_DOWN
        )

    elif strategy == "anti_martingale":
        if robot.consecutive_losses > 0:
            return Decimal(str(initial))
        return (Decimal(str(current)) * Decimal(str(robot.stake_multiplier))).quantize(
            Decimal("0.01"), rounding=ROUND_DOWN
        )

    elif strategy == "dalembert":
        if robot.consecutive_losses > 0:
            return Decimal(str(current)) + Decimal(str(robot.stake_step))
        return max(Decimal(str(initial)), Decimal(str(current)) - Decimal(str(robot.stake_step)))

    elif strategy == "fibonacci":
        fib = _fibonacci_sequence(robot.consecutive_losses + 2)
        multiplier = fib[-1]
        return (Decimal(str(initial)) * Decimal(str(multiplier))).quantize(
            Decimal("0.01"), rounding=ROUND_DOWN
        )

    return Decimal(str(initial))


def _fibonacci_sequence(n: int) -> list:
    seq = [1, 1]
    for _ in range(n - 2):
        seq.append(seq[-1] + seq[-2])
    return seq


def _robot_log(robot, level, message, trade=None, **kwargs):
    """Create a robot log entry and push it to WebSocket."""
    from core.models import RobotLog
    from core.serializers import RobotLogSerializer

    log = RobotLog.objects.create(
        robot=robot,
        trade=trade,
        level=level,
        message=message,
        **{k: v for k, v in kwargs.items() if k in [
            "stake", "result", "profit", "session_profit", "metadata"
        ]},
    )

    if channel_layer:
        try:
            log_data = json.loads(json.dumps(RobotLogSerializer(log).data, default=str))
            async_to_sync(channel_layer.group_send)(
                f"robot_{robot.id}",
                {"type": "robot.log", "log": log_data},
            )
        except Exception as e:
            logger.warning(f"Robot log WS push failed: {e}")
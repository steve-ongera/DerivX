"""
core/routing.py — Django Channels WebSocket URL routing
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Real-time price feed for a specific market (public)
    re_path(r"^ws/prices/(?P<slug>[\w-]+)/$", consumers.PriceFeedConsumer.as_asgi()),

    # Authenticated user trade stream
    re_path(r"^ws/trades/$", consumers.TradeConsumer.as_asgi()),

    # Authenticated user notifications
    re_path(r"^ws/notifications/$", consumers.NotificationConsumer.as_asgi()),

    # Robot live logs
    re_path(r"^ws/robots/(?P<robot_id>[0-9a-f-]+)/$", consumers.RobotConsumer.as_asgi()),
]
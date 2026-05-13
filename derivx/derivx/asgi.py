"""
derivx/asgi.py — ASGI configuration for DerivX
Handles both HTTP (Django) and WebSocket (Channels) connections.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "derivx.settings")

# Initialize Django ASGI app early to populate app registry
django_asgi_app = get_asgi_application()

from core.routing import websocket_urlpatterns  # noqa: E402 — must import after Django setup

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            URLRouter(websocket_urlpatterns)
        ),
    }
)
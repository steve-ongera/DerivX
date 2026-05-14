"""
core/utils/paypal.py — PayPal REST API Integration
Handles order creation (deposit), capture, and payouts (withdrawal).
"""

import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class PaypalService:
    def __init__(self):
        self.client_id = settings.PAYPAL_CLIENT_ID
        self.client_secret = settings.PAYPAL_CLIENT_SECRET
        self.base_url = settings.PAYPAL_BASE_URL
        self._access_token = None

    # ── Auth ──────────────────────────────────────────────────────

    def get_access_token(self) -> str:
        url = f"{self.base_url}/v1/oauth2/token"
        response = requests.post(
            url,
            data={"grant_type": "client_credentials"},
            auth=(self.client_id, self.client_secret),
            timeout=30,
        )
        response.raise_for_status()
        self._access_token = response.json()["access_token"]
        return self._access_token

    @property
    def headers(self):
        token = self.get_access_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    # ── Orders (Deposit) ──────────────────────────────────────────

    def create_order(self, amount: str, currency: str = "USD",
                     return_url: str = None, cancel_url: str = None) -> dict:
        """Create a PayPal order for deposit."""
        url = f"{self.base_url}/v2/checkout/orders"
        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "amount": {"currency_code": currency, "value": amount},
                    "description": "DerivX Account Deposit",
                }
            ],
            "application_context": {
                "brand_name": "DerivX",
                "landing_page": "LOGIN",
                "shipping_preference": "NO_SHIPPING",
                "user_action": "PAY_NOW",
                "return_url": return_url or f"{settings.FRONTEND_URL}/wallet?payment=success",
                "cancel_url": cancel_url or f"{settings.FRONTEND_URL}/wallet?payment=cancelled",
            },
        }
        response = requests.post(url, json=payload, headers=self.headers, timeout=30)
        response.raise_for_status()
        logger.info(f"PayPal order created: {response.json().get('id')}")
        return response.json()

    def capture_order(self, order_id: str) -> dict:
        """Capture a PayPal order after user approves."""
        url = f"{self.base_url}/v2/checkout/orders/{order_id}/capture"
        response = requests.post(url, headers=self.headers, timeout=30)
        response.raise_for_status()
        return response.json()

    def get_order(self, order_id: str) -> dict:
        """Get PayPal order details."""
        url = f"{self.base_url}/v2/checkout/orders/{order_id}"
        response = requests.get(url, headers=self.headers, timeout=30)
        response.raise_for_status()
        return response.json()

    # ── Payouts (Withdrawal) ──────────────────────────────────────

    def create_payout(self, receiver_email: str, amount: str, currency: str = "USD",
                      note: str = "DerivX Withdrawal") -> dict:
        """Create a PayPal payout batch to send money to a user."""
        import uuid
        url = f"{self.base_url}/v1/payments/payouts"
        payload = {
            "sender_batch_header": {
                "sender_batch_id": f"DRX-{uuid.uuid4().hex[:12]}",
                "email_subject": "You have a payment from DerivX",
                "email_message": "Your withdrawal has been processed.",
            },
            "items": [
                {
                    "recipient_type": "EMAIL",
                    "amount": {"value": amount, "currency": currency},
                    "note": note,
                    "sender_item_id": f"DRX-ITEM-{uuid.uuid4().hex[:8]}",
                    "receiver": receiver_email,
                }
            ],
        }
        response = requests.post(url, json=payload, headers=self.headers, timeout=30)
        response.raise_for_status()
        logger.info(f"PayPal payout created for {receiver_email}")
        return response.json()

    def get_payout(self, payout_batch_id: str) -> dict:
        """Get payout status."""
        url = f"{self.base_url}/v1/payments/payouts/{payout_batch_id}"
        response = requests.get(url, headers=self.headers, timeout=30)
        response.raise_for_status()
        return response.json()


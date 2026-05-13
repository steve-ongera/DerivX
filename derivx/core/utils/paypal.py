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


"""
core/utils/binance.py — Binance Pay & Binance API Integration
Handles Binance Pay order creation (deposit) and crypto withdrawals.
"""

import hashlib
import hmac
import json
import logging
import time
import uuid
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class BinanceService:
    def __init__(self):
        self.api_key = settings.BINANCE_API_KEY
        self.secret_key = settings.BINANCE_SECRET_KEY
        self.merchant_id = settings.BINANCE_PAY_MERCHANT_ID
        self.pay_base_url = settings.BINANCE_PAY_BASE_URL
        self.api_base_url = settings.BINANCE_API_BASE_URL

    # ── Binance Pay (Deposit) ──────────────────────────────────────

    def _pay_signature(self, nonce: str, timestamp: str, payload: str) -> str:
        """Generate HMAC-SHA512 signature for Binance Pay."""
        message = f"{timestamp}\n{nonce}\n{payload}\n"
        signature = hmac.new(
            self.secret_key.encode(), message.encode(), hashlib.sha512
        ).hexdigest().upper()
        return signature

    def create_order(self, coin: str, amount: str, description: str = "DerivX Deposit") -> dict:
        """Create a Binance Pay order for crypto deposit."""
        timestamp = str(int(time.time() * 1000))
        nonce = uuid.uuid4().hex[:32]
        merchant_trade_no = f"DRX{int(time.time())}{uuid.uuid4().hex[:6].upper()}"

        payload = {
            "env": {"terminalType": "WEB"},
            "merchantTradeNo": merchant_trade_no,
            "orderAmount": float(amount),
            "currency": coin,
            "goods": {
                "goodsType": "01",
                "goodsCategory": "Z000",
                "referenceGoodsId": "DERIVX_DEPOSIT",
                "goodsName": description,
            },
        }
        payload_str = json.dumps(payload, separators=(",", ":"))
        signature = self._pay_signature(nonce, timestamp, payload_str)

        headers = {
            "Content-Type": "application/json",
            "BinancePay-Timestamp": timestamp,
            "BinancePay-Nonce": nonce,
            "BinancePay-Certificate-SN": self.api_key,
            "BinancePay-Signature": signature,
        }

        url = f"{self.pay_base_url}/binancepay/openapi/v2/order"
        response = requests.post(url, data=payload_str, headers=headers, timeout=30)
        response.raise_for_status()
        result = response.json()
        logger.info(f"Binance Pay order created: {result.get('data', {}).get('prepayId')}")
        return result

    def query_order(self, prepay_id: str) -> dict:
        """Query Binance Pay order status."""
        timestamp = str(int(time.time() * 1000))
        nonce = uuid.uuid4().hex[:32]
        payload = json.dumps({"prepayId": prepay_id}, separators=(",", ":"))
        signature = self._pay_signature(nonce, timestamp, payload)

        headers = {
            "Content-Type": "application/json",
            "BinancePay-Timestamp": timestamp,
            "BinancePay-Nonce": nonce,
            "BinancePay-Certificate-SN": self.api_key,
            "BinancePay-Signature": signature,
        }
        url = f"{self.pay_base_url}/binancepay/openapi/v2/order/query"
        response = requests.post(url, data=payload, headers=headers, timeout=30)
        return response.json()

    # ── Binance Spot API (Withdrawal) ──────────────────────────────

    def _spot_signature(self, params: dict) -> str:
        """Generate HMAC-SHA256 signature for Binance Spot API."""
        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        return hmac.new(
            self.secret_key.encode(), query_string.encode(), hashlib.sha256
        ).hexdigest()

    @property
    def spot_headers(self):
        return {"X-MBX-APIKEY": self.api_key}

    def withdraw(self, coin: str, network: str, address: str, amount: str,
                 address_tag: str = "") -> dict:
        """Submit a crypto withdrawal via Binance Spot API."""
        params = {
            "coin": coin,
            "network": network,
            "address": address,
            "amount": amount,
            "timestamp": int(time.time() * 1000),
        }
        if address_tag:
            params["addressTag"] = address_tag

        params["signature"] = self._spot_signature(params)
        url = f"{self.api_base_url}/sapi/v1/capital/withdraw/apply"
        response = requests.post(
            url, params=params, headers=self.spot_headers, timeout=30
        )
        response.raise_for_status()
        logger.info(f"Binance withdrawal submitted: {coin} {amount} to {address[:10]}...")
        return response.json()

    def get_withdrawal_status(self, withdraw_id: str) -> dict:
        """Query withdrawal status."""
        params = {
            "withdrawOrderId": withdraw_id,
            "timestamp": int(time.time() * 1000),
        }
        params["signature"] = self._spot_signature(params)
        url = f"{self.api_base_url}/sapi/v1/capital/withdraw/history"
        response = requests.get(url, params=params, headers=self.spot_headers, timeout=30)
        return response.json()

    def get_exchange_rate(self, coin: str, fiat: str = "USDT") -> float:
        """Get current exchange rate for a coin pair."""
        symbol = f"{coin}{fiat}"
        url = f"{self.api_base_url}/api/v3/ticker/price"
        response = requests.get(url, params={"symbol": symbol}, timeout=10)
        if response.ok:
            return float(response.json().get("price", 0))
        return 0.0

    def verify_webhook(self, payload: str, timestamp: str, nonce: str, signature: str) -> bool:
        """Verify Binance Pay webhook signature."""
        expected = self._pay_signature(nonce, timestamp, payload)
        return hmac.compare_digest(expected, signature.upper())
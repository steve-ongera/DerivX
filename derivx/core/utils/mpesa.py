"""
core/utils/mpesa.py — Safaricom Daraja M-Pesa Integration
Handles STK Push (C2B deposit) and B2C (withdrawal).
"""

import base64
import logging
import requests
from datetime import datetime
from django.conf import settings

logger = logging.getLogger(__name__)


class MpesaService:
    def __init__(self):
        self.consumer_key = settings.MPESA_CONSUMER_KEY
        self.consumer_secret = settings.MPESA_CONSUMER_SECRET
        self.shortcode = settings.MPESA_SHORTCODE
        self.passkey = settings.MPESA_PASSKEY
        self.base_url = settings.MPESA_BASE_URL
        self.callback_url = settings.MPESA_CALLBACK_URL
        self.timeout_url = settings.MPESA_TIMEOUT_URL
        self._access_token = None

    # ── Auth ──────────────────────────────────────────────────────

    def get_access_token(self) -> str:
        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        credentials = base64.b64encode(
            f"{self.consumer_key}:{self.consumer_secret}".encode()
        ).decode()
        response = requests.get(
            url,
            headers={"Authorization": f"Basic {credentials}"},
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

    # ── Password (timestamp + base64) ─────────────────────────────

    def _get_password(self) -> tuple[str, str]:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        raw = f"{self.shortcode}{self.passkey}{timestamp}"
        password = base64.b64encode(raw.encode()).decode()
        return password, timestamp

    # ── STK Push (deposit) ─────────────────────────────────────────

    def stk_push(self, phone_number: str, amount: int) -> dict:
        """
        Initiate Lipa na M-Pesa Online (STK Push).
        phone_number: format 254XXXXXXXXX
        amount: integer KES amount
        """
        password, timestamp = self._get_password()
        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone_number,
            "PartyB": self.shortcode,
            "PhoneNumber": phone_number,
            "CallBackURL": self.callback_url,
            "AccountReference": "DerivX",
            "TransactionDesc": "DerivX Deposit",
        }
        response = requests.post(url, json=payload, headers=self.headers, timeout=30)
        logger.info(f"M-Pesa STK Push response: {response.status_code} | {response.text[:200]}")
        return response.json()

    def query_stk_push(self, checkout_request_id: str) -> dict:
        """Query STK Push transaction status."""
        password, timestamp = self._get_password()
        url = f"{self.base_url}/mpesa/stkpushquery/v1/query"
        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id,
        }
        response = requests.post(url, json=payload, headers=self.headers, timeout=30)
        return response.json()

    # ── B2C (withdrawal) ──────────────────────────────────────────

    def b2c_payment(self, phone_number: str, amount: int, remarks: str = "DerivX Withdrawal") -> dict:
        """
        Send money to a customer's M-Pesa wallet (Business to Customer).
        phone_number: format 254XXXXXXXXX
        amount: integer KES
        """
        url = f"{self.base_url}/mpesa/b2c/v3/paymentrequest"
        payload = {
            "OriginatorConversationID": f"DRX-{datetime.now().strftime('%Y%m%d%H%M%S%f')}",
            "InitiatorName": settings.MPESA_B2C_INITIATOR_NAME,
            "SecurityCredential": settings.MPESA_B2C_SECURITY_CREDENTIAL,
            "CommandID": "BusinessPayment",
            "Amount": amount,
            "PartyA": settings.MPESA_B2C_SHORTCODE,
            "PartyB": phone_number,
            "Remarks": remarks,
            "QueueTimeOutURL": settings.MPESA_B2C_QUEUE_TIMEOUT_URL,
            "ResultURL": settings.MPESA_B2C_RESULT_URL,
            "Occasion": "Withdrawal",
        }
        response = requests.post(url, json=payload, headers=self.headers, timeout=30)
        logger.info(f"M-Pesa B2C response: {response.status_code}")
        return response.json()
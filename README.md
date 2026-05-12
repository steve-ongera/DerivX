# 🚀 DerivX — Binary Options & CFD Trading Platform Clone

A full-stack trading platform inspired by Deriv, built with **Django (Backend)** + **React (Frontend)**, featuring real-time charts, robot trading, M-Pesa/PayPal/Binance payments, and SEO-optimized slug-based routing.

---

## 📁 Full Project Structure

```
derivx/
│
├── README.md
├── .env                          # Environment variables (never commit)
├── .gitignore
├── requirements.txt
├── manage.py
│
├── derivx/                       # Django project config
│   ├── __init__.py
│   ├── settings.py               # All settings incl. M-Pesa, PayPal, Binance, Channels
│   ├── urls.py                   # Root URL config
│   ├── asgi.py                   # ASGI for WebSocket support (Django Channels)
│   └── wsgi.py
│
├── core/                         # Single Django app — all models, views, serializers
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py                 # All database models
│   ├── serializers.py            # DRF serializers
│   ├── views.py                  # All API views
│   ├── urls.py                   # App-level URLs (slug-based SEO routes)
│   ├── consumers.py              # WebSocket consumers (real-time price feeds)
│   ├── routing.py                # Django Channels routing
│   ├── tasks.py                  # Celery tasks (price simulation, payouts)
│   ├── signals.py                # Django signals
│   ├── permissions.py            # Custom DRF permissions
│   ├── pagination.py             # Custom pagination
│   ├── filters.py                # Django-filter classes
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── mpesa.py              # M-Pesa Daraja API integration
│   │   ├── paypal.py             # PayPal REST API integration
│   │   ├── binance.py            # Binance Pay / Crypto integration
│   │   ├── price_feed.py         # Price simulation & market data
│   │   └── robot_engine.py       # Trading robot logic engine
│   └── migrations/
│       └── 0001_initial.py
│
├── frontend/                     # React SPA
│   ├── index.html                # Entry HTML with Bootstrap Icons & SEO meta tags
│   ├── vite.config.js
│   ├── package.json
│   ├── .env
│   │
│   └── src/
│       ├── main.jsx              # React DOM entry point
│       ├── App.jsx               # Root component with router
│       │
│       ├── styles/
│       │   └── main.css          # Global CSS, design tokens, animations
│       │
│       ├── utils/
│       │   ├── api.js            # Axios instance + all API calls
│       │   ├── websocket.js      # WebSocket manager for real-time data
│       │   └── helpers.js        # Formatters, validators, constants
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Navbar.jsx
│       │   │   ├── Sidebar.jsx
│       │   │   ├── Footer.jsx
│       │   │   └── MobileNav.jsx
│       │   │
│       │   ├── trading/
│       │   │   ├── TradingChart.jsx        # Real-time candlestick/line chart (lightweight-charts)
│       │   │   ├── TradePanel.jsx          # Buy/Sell panel with stake input
│       │   │   ├── MarketSelector.jsx      # Asset/market picker
│       │   │   ├── TradeTypeSelector.jsx   # Rise/Fall, Even/Odd, etc.
│       │   │   ├── DurationPicker.jsx      # Trade duration
│       │   │   ├── StakeInput.jsx          # Stake/payout calculator
│       │   │   ├── ActiveTrades.jsx        # Live open positions
│       │   │   ├── TradeHistory.jsx        # Closed trades log
│       │   │   └── Ticker.jsx              # Live price ticker strip
│       │   │
│       │   ├── robot/
│       │   │   ├── RobotBuilder.jsx        # Visual robot builder (drag & drop)
│       │   │   ├── RobotList.jsx           # Saved robots
│       │   │   ├── RobotCard.jsx           # Single robot card
│       │   │   ├── RobotControls.jsx       # Start/Stop/Edit
│       │   │   └── RobotLogs.jsx           # Robot activity logs
│       │   │
│       │   ├── wallet/
│       │   │   ├── BalanceCard.jsx
│       │   │   ├── DepositModal.jsx        # Unified deposit modal
│       │   │   ├── WithdrawModal.jsx       # Unified withdraw modal
│       │   │   ├── MpesaForm.jsx
│       │   │   ├── PaypalForm.jsx
│       │   │   ├── BinanceForm.jsx
│       │   │   └── TransactionTable.jsx
│       │   │
│       │   ├── auth/
│       │   │   ├── LoginForm.jsx
│       │   │   ├── RegisterForm.jsx
│       │   │   └── ProtectedRoute.jsx
│       │   │
│       │   └── common/
│       │       ├── Button.jsx
│       │       ├── Modal.jsx
│       │       ├── Spinner.jsx
│       │       ├── Toast.jsx
│       │       ├── Badge.jsx
│       │       └── SEOHead.jsx             # Dynamic meta tags per page
│       │
│       └── pages/
│           ├── Home.jsx                    # Landing / dashboard
│           ├── Trade.jsx                   # Main trading page (charts + panels)
│           ├── Robot.jsx                   # Robot trading page
│           ├── Markets.jsx                 # All available markets
│           ├── Wallet.jsx                  # Deposits, withdrawals, history
│           ├── Profile.jsx                 # User account settings
│           ├── Login.jsx
│           ├── Register.jsx
│           ├── NotFound.jsx
│           └── MarketDetail.jsx            # SEO slug page e.g. /markets/volatility-100-index/
│
└── staticfiles/                            # Collected Django static files
```

---

## 🧠 Core Models Overview

| Model | Purpose |
|---|---|
| `User` | Extended AbstractUser |
| `UserProfile` | KYC, avatar, preferences |
| `Wallet` | Balance per currency |
| `Market` | Tradable asset (slug-based SEO) |
| `TradingPair` | Symbol config per market |
| `Trade` | Individual trade record |
| `TradeType` | Rise/Fall, Even/Odd, Touch, etc. |
| `Robot` | User-configured trading bot |
| `RobotLog` | Robot execution history |
| `PriceCandle` | OHLC price history |
| `Transaction` | Deposit/withdrawal record |
| `MpesaTransaction` | M-Pesa STK push logs |
| `PaypalTransaction` | PayPal order logs |
| `BinanceTransaction` | Binance Pay logs |
| `Notification` | In-app alerts |
| `SystemSetting` | Admin-controlled platform config |

---

## 🔌 API Endpoints (Slug-Based SEO)

```
# Auth
POST   /api/auth/register/
POST   /api/auth/login/
POST   /api/auth/logout/
POST   /api/auth/token/refresh/

# Markets (SEO slugs)
GET    /api/markets/                          # All markets
GET    /api/markets/<slug>/                   # Single market detail
GET    /api/markets/<slug>/candles/           # OHLC price data

# Trading
GET    /api/trades/
POST   /api/trades/place/
GET    /api/trades/<id>/
GET    /api/trades/active/
GET    /api/trades/history/

# Trade Types
GET    /api/trade-types/

# Robots
GET    /api/robots/
POST   /api/robots/
GET    /api/robots/<id>/
PUT    /api/robots/<id>/
DELETE /api/robots/<id>/
POST   /api/robots/<id>/start/
POST   /api/robots/<id>/stop/
GET    /api/robots/<id>/logs/

# Wallet
GET    /api/wallet/
GET    /api/wallet/transactions/

# Payments — M-Pesa
POST   /api/payments/mpesa/deposit/
POST   /api/payments/mpesa/withdraw/
POST   /api/payments/mpesa/callback/        # M-Pesa webhook

# Payments — PayPal
POST   /api/payments/paypal/deposit/
POST   /api/payments/paypal/withdraw/
POST   /api/payments/paypal/webhook/

# Payments — Binance
POST   /api/payments/binance/deposit/
POST   /api/payments/binance/withdraw/
POST   /api/payments/binance/webhook/

# WebSocket
ws://  /ws/prices/<market-slug>/             # Real-time price feed
ws://  /ws/trades/                           # Live trade updates
ws://  /ws/notifications/                    # User notifications
```

---

## 🎯 Trade Types Supported

| Type | Description |
|---|---|
| **Rise / Fall** | Predict if price rises or falls after duration |
| **Higher / Lower** | Price above/below a barrier |
| **Touch / No Touch** | Price touches a level or not |
| **Even / Odd** | Last digit of price is even or odd |
| **Matches / Differs** | Last digit matches exact number |
| **Over / Under** | Last digit over or under a number |
| **Asian Up/Down** | Average price vs entry |
| **Lookback High/Low** | Pays on high-low range |

---

## 💳 Payment Integrations

### M-Pesa (Safaricom Daraja)
- STK Push for deposits
- B2C for withdrawals
- Callback URL for confirmation

### PayPal
- Orders API for deposits
- Payouts API for withdrawals
- Webhook verification

### Binance Pay
- Create order for crypto deposits
- Withdraw via Binance API
- Webhook signature verification

---

## ⚡ Real-Time Architecture

```
Browser ←──WebSocket──→ Django Channels ←──→ Redis (Channel Layer)
                                    ↑
                              Celery Beat
                          (Price Simulation Task)
```

---

## 🛠️ Tech Stack

**Backend**
- Django 5.x + Django REST Framework
- Django Channels + Daphne (WebSocket)
- Celery + Redis (async tasks + channel layer)
- PostgreSQL
- Simple JWT (authentication)
- django-filter, django-cors-headers
- Pillow (image uploads)

**Frontend**
- React 18 + Vite
- React Router v6 (slug-based routing)
- Lightweight Charts (TradingView library — real-time charts)
- Axios
- Bootstrap Icons (CDN)
- CSS Custom Properties (no Tailwind)

**Payments**
- Safaricom Daraja API (M-Pesa)
- PayPal REST SDK
- Binance Pay API

---

## 🚀 Setup Instructions

### Backend
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in all keys
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_markets   # seeds default markets & trade types
daphne derivx.asgi:application  # starts ASGI server
celery -A derivx worker -l info  # in another terminal
celery -A derivx beat -l info    # price tick scheduler
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env        # set VITE_API_URL, VITE_WS_URL
npm run dev
```

---

## 🌍 SEO Strategy

- Market pages at `/markets/<slug>/` (e.g. `/markets/volatility-100-index/`)
- Trade pages at `/trade/<slug>/` (e.g. `/trade/boom-1000-index/`)
- Dynamic `<title>`, `<meta description>`, Open Graph tags per page
- Server-side sitemap at `/sitemap.xml` (django.contrib.sitemaps)
- Robots.txt at `/robots.txt`
- Schema.org JSON-LD on market pages

---

## 🔐 Environment Variables (.env)

```env
# Django
SECRET_KEY=
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://user:pass@localhost:5432/derivx

# Redis
REDIS_URL=redis://localhost:6379/0

# M-Pesa (Daraja)
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/mpesa/callback/
MPESA_B2C_INITIATOR_NAME=
MPESA_B2C_SECURITY_CREDENTIAL=

# PayPal
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_MODE=sandbox  # or live

# Binance
BINANCE_API_KEY=
BINANCE_SECRET_KEY=
BINANCE_PAY_MERCHANT_ID=
BINANCE_PAY_WEBHOOK_SECRET=

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:5173
```

---

## 📄 License

MIT — Built for educational purposes. Not for production financial services without regulatory compliance.
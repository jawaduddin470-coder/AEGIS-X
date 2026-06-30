# 🛡️ AEGIS X — Urban Emergency Intelligence Platform

> **Predict. Simulate. Respond.**
>
> Real-time emergency management digital twin for Hyderabad, India.

![Status](https://img.shields.io/badge/Status-Production_Ready-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![Platform](https://img.shields.io/badge/Platform-Web_|_Android_|_PWA-orange)

---

## 🏛️ Overview

AEGIS X is a production-grade, startup-ready Emergency Intelligence Platform designed for deployment by:

- **GHMC** — Greater Hyderabad Municipal Corporation
- **Hyderabad Police** — Law enforcement coordination
- **Hyderabad Fire Department** — Fire response management
- **NDRF** — National Disaster Response Force
- **Smart City Initiatives** — IoT-integrated urban governance

### Core Capabilities

| Module | Description |
|--------|-------------|
| **Digital Twin Map** | Real-time Hyderabad map with live incidents, resources, weather |
| **AI Copilot** | OpenRouter-powered emergency advisory engine |
| **Incident Management** | Full lifecycle: Report → Dispatch → Respond → Resolve |
| **Disaster Simulation** | Fire, Flood, Earthquake, Stampede scenario modeling |
| **Resource Allocation** | Smart dispatch with vehicle tracking and ETA |
| **Analytics Center** | Real-time dashboards with incident trends and KPIs |
| **Shelter Management** | Capacity tracking across Hyderabad shelters |
| **Broadcast Center** | Multi-channel emergency alerts (Web, Push, SMS) |
| **System Health** | Live service monitoring and audit logs |
| **Presentation Mode** | Auto-scrolling showcase for demos and expos |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AEGIS X Platform                      │
├──────────────┬──────────────┬───────────────────────────┤
│  Web (React) │ Mobile (Expo)│     PWA (Offline)        │
│  Vite + TS   │ React Native │  Service Worker + Cache  │
├──────────────┴──────────────┴───────────────────────────┤
│                    FastAPI Backend                        │
│  REST API  │  WebSocket  │  Background Tasks            │
├──────────────────────────────────────────────────────────┤
│  Neon PostgreSQL  │  Cloudinary  │  Upstash Redis       │
│  (PostGIS)        │  (Media)     │  (Cache/Queue)       │
├──────────────────────────────────────────────────────────┤
│  Firebase Auth  │  Firebase FCM  │  OpenRouter AI       │
│  (Google SSO)   │  (Push Notif)  │  (Gemini 2.5 Flash) │
└──────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Leaflet Maps |
| Mobile | Expo (React Native), TypeScript |
| Backend | Python 3.12, FastAPI, Uvicorn, SQLAlchemy |
| Database | Neon PostgreSQL (serverless), PostGIS |
| Auth | Firebase Authentication, Google Sign-In |
| AI | OpenRouter API (Google Gemini 2.5 Flash) |
| Media | Cloudinary (image/video upload & CDN) |
| Notifications | Firebase Cloud Messaging (FCM) |
| Cache | Upstash Redis (REST API) |
| Deployment | Docker, Docker Compose, GitHub Actions |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **Git**

### 1. Clone & Setup

```bash
git clone https://github.com/your-org/aegis-x.git
cd aegis-x
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment template and fill in your keys
cp ../.env.example .env
# Edit .env with your production credentials

# Run database migrations & seed Hyderabad data
python -m app.db.migrate

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Web Frontend Setup

```bash
cd web
npm install
npm run dev
```

Open: `http://localhost:5173`

### 4. Mobile Setup (Optional)

```bash
cd mobile
npm install
npx expo start
```

---

## 🔐 Environment Variables

See `.env.example` for the full template. Required services:

| Variable | Service | Required |
|----------|---------|----------|
| `DATABASE_URL` | Neon PostgreSQL | ✅ |
| `OPENROUTER_API_KEY` | OpenRouter AI | ✅ |
| `FIREBASE_PROJECT_ID` | Firebase Auth | ✅ |
| `FIREBASE_FCM_SERVER_KEY` | Push Notifications | ⚡ |
| `CLOUDINARY_CLOUD_NAME` | Image Upload | ⚡ |
| `CLOUDINARY_API_KEY` | Image Upload | ⚡ |
| `CLOUDINARY_API_SECRET` | Image Upload | ⚡ |
| `UPSTASH_REDIS_REST_URL` | Redis Cache | Optional |

---

## 🐳 Docker Deployment

```bash
# Build and start all services
docker-compose up --build -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

---

## 📡 API Documentation

Once running, visit: `http://localhost:8000/docs`

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Email login (auto-create) |
| POST | `/api/auth/firebase` | Firebase Google Sign-In |
| GET | `/api/incidents` | List all incidents |
| POST | `/api/incidents` | Create new incident |
| GET | `/api/resources` | List all resources |
| GET | `/api/hospitals` | Hyderabad hospitals |
| GET | `/api/shelters` | Emergency shelters |
| GET | `/api/stations` | Police & fire stations |
| POST | `/api/upload` | Cloudinary image upload |
| POST | `/api/ai/chat` | AI Copilot query |
| GET | `/api/weather` | Real-time weather |
| GET | `/api/health` | System health check |
| GET | `/api/predictions` | AI risk predictions |
| GET | `/api/broadcasts` | Alert broadcasts |
| WS | `/ws` | Real-time WebSocket feed |

---

## 🏙️ Hyderabad Data

The platform is pre-loaded with realistic Hyderabad demo data:

- **5 Hospitals** — Osmania, Gandhi, Yashoda, CARE, Niloufer
- **5 Shelters** — Charminar Hall, LB Stadium, Secunderabad Railway, etc.
- **6 Stations** — Banjara Hills PS, Charminar PS, Jubilee Hills FS, etc.
- **8 Vehicles** — Ambulances, Fire Tenders, Police PCR, NDRF Boat
- **5 Incidents** — Flood (Hussain Sagar), Fire (HITEC City), Collapse (Charminar)
- **5 Users** — Admin, Operator, Fire Responder, NDRF Captain, Citizen

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@aegisx.in | Admin@2025 |
| Operator | operator@aegisx.in | Operator@2025 |
| Responder | fire@aegisx.in | Fire@2025 |
| NDRF | ndrf@aegisx.in | Ndrf@2025 |
| Citizen | citizen@aegisx.in | Citizen@2025 |

---

## 🌐 Multi-Language Support

| Language | Code | Coverage |
|----------|------|----------|
| English | `en` | Full |
| Hindi | `hi` | Full |
| Telugu | `te` | Full |

---

## 📱 PWA / Offline Support

AEGIS X is a Progressive Web App with:
- **Offline caching** — Critical assets cached via Service Worker
- **Background sync** — SOS reports queued when offline
- **Push notifications** — FCM-powered alerts
- **Installable** — Add to home screen on mobile/desktop

---

## 🔒 Security

- Firebase Authentication with Google SSO
- Rate limiting middleware (200 req/min per IP)
- Security headers (CSP, X-Frame-Options, XSS Protection)
- Input validation on all API endpoints
- Environment-based secret management
- CORS protection

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

Built for Hyderabad's emergency response ecosystem.

**AEGIS X** — *Predict. Simulate. Respond.*

# 🏰 World Dungeon — Production Deployment Guide

World Dungeon is a location-based dark fantasy fitness RPG that turns real-world walking into spatial dungeon-crawling adventures using OpenStreetMap, Mapillary street imagery, and ElevenLabs ancient voice narration.

---

## 🏛 Architecture Overview

```
                          ┌────────────────────────┐
                          │   Next.js 14 PWA       │
                          │   (Frontend on :3000)  │
                          └───────────┬────────────┘
                                      │
               ┌──────────────────────┼──────────────────────┐
               │                      │                      │
               ▼                      ▼                      ▼
      ┌────────────────┐     ┌────────────────┐     ┌────────────────┐
      │  Mapillary API │     │ ElevenLabs TTS │     │ Fastify Forge  │
      │ (Street Visual)│     │(Ancient Voice) │     │ (Backend :3001)│
      └────────────────┘     └────────────────┘     └────────┬───────┘
                                                             │
                                              ┌──────────────┴──────────────┐
                                              │                             │
                                              ▼                             ▼
                                     ┌────────────────┐            ┌────────────────┐
                                     │  Overpass API  │            │   Ollama LLM   │
                                     │ (OpenStreetMap)│            │  (gemma2:2b)   │
                                     └────────────────┘            └────────────────┘
```

---

## 🚀 Deployment Options

### Option 1: Vercel (Frontend) + Render / Railway (Backend) — *Recommended*

#### A. Deploying Fastify Backend to Render / Railway:
1. Push repository to GitHub.
2. Create a new **Web Service** on [Render](https://render.com) or [Railway](https://railway.app).
3. Set **Root Directory** to `world-dungeon-backend`.
4. Configure Build & Start commands:
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm start`
5. Add Environment Variables:
   * `PORT`: `3001`
   * `OLLAMA_URL`: URL to your Ollama instance (or leave default for automated fallback to OpenStreetMap lore generator)
   * `ALLOWED_ORIGINS`: `https://your-frontend.vercel.app`
6. Note the deployed backend URL (e.g. `https://world-dungeon-api.onrender.com`).

#### B. Deploying Next.js Frontend to Vercel:
1. Import repository on [Vercel](https://vercel.com).
2. Set **Root Directory** to `./`.
3. Add Environment Variables in Vercel Project Settings:
   * `BACKEND_URL`: `https://world-dungeon-api.onrender.com`
   * `NEXT_PUBLIC_BACKEND_URL`: `https://world-dungeon-api.onrender.com`
   * `NEXT_PUBLIC_MAPILLARY_TOKEN`: Your Mapillary client token
   * `NEXT_PUBLIC_ELEVENLABS_KEY`: Your ElevenLabs API key
4. Deploy!

---

### Option 2: 1-Click Docker Compose (Self-Hosted on VPS / Cloud VM)

On any Ubuntu / Debian / Linux server with Docker and Docker Compose installed:

1. Clone repository:
   ```bash
   git clone https://github.com/your-username/world-dungeon.git
   cd world-dungeon
   ```

2. Create `.env.local` or export your keys:
   ```bash
   export NEXT_PUBLIC_MAPILLARY_TOKEN="MLY|..."
   export NEXT_PUBLIC_ELEVENLABS_KEY="sk_..."
   ```

3. Launch all services:
   ```bash
   docker-compose up -d --build
   ```

4. Download the Ollama model:
   ```bash
   docker exec -it world-dungeon-ollama ollama pull gemma2:2b
   ```

5. Access your dungeon:
   * Frontend: `http://your-server-ip:3000`
   * Backend API: `http://your-server-ip:3001/api/health`
   * Ollama: `http://your-server-ip:11434`

---

## 🔒 Security & Performance Features

* **Security Headers**: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: geolocation=(self), camera=(self)`.
* **Zero-Latency Audio Pipeline**: Next.js `/api/tts` streaming proxy with `eleven_turbo_v2_5` model caching.
* **Singleton Audio Engine**: Global audio manager that guarantees only a single character voice is active at any time.
* **Open Fallback Reliability**: Automatic fallback to local procedural coordinate forging and Wikipedia/Mapillary open imagery when third-party APIs are unreachable.
* **PWA & Mobile Ready**: Standalone display mode, touch gesture optimization, safe-area padding, and dark fantasy theme colors.

---

## 🩺 Health Check & Diagnostics

* **Frontend Status**: `GET /api/health`
* **Backend Status**: `GET http://localhost:3001/api/health`
* **TTS Voice Verification**: `POST /api/tts` with JSON `{"text":"Sanctum reached","voiceId":"onwK4e9ZLuTAKqWW03F9"}`

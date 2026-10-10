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
                                     │  Overpass API  │            │  LLM Inference │
                                     │ (OpenStreetMap)│            │ (Groq / Ollama)│
                                     └────────────────┘            └────────────────┘
```

---

## 🤖 Dual-Mode Open-Weight Inference (Groq & Ollama)

World Dungeon uses the **Gemma2 open-weight model family** for spatial lore generation:
* **Production Cloud Mode (Default)**: Uses **Gemma2-9b-it** hosted on Groq (`https://api.groq.com/openai/v1/chat/completions`) for sub-second quest synthesis with guaranteed JSON schema compliance.
* **Local Offline Mode**: Set `USE_LOCAL_OLLAMA=true` to run against your local **Gemma2:2b** instance via Ollama (`http://localhost:11434`) with zero code changes.

### Local Development Commands:
```bash
# 1. Run in Production Cloud Mode (Groq):
GROQ_API_KEY=gsk_your_key USE_LOCAL_OLLAMA=false npm run dev

# 2. Run in Local Offline Mode (Ollama):
USE_LOCAL_OLLAMA=true npm run dev
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
   * `GROQ_API_KEY`: Your Groq API key (free at https://console.groq.com)
   * `GROQ_MODEL`: `gemma2-9b-it`
   * `USE_LOCAL_OLLAMA`: `false`
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
   export GROQ_API_KEY="gsk_..."
   ```

3. Launch all services:
   ```bash
   docker-compose up -d --build
   ```

4. If running local Ollama:
   ```bash
   docker exec -it world-dungeon-ollama ollama pull gemma2:2b
   ```

5. Access your dungeon:
   * Frontend: `http://your-server-ip:3000`
   * Backend API: `http://your-server-ip:3001/api/health`

---

## 🔒 Security & Performance Features

* **Security Headers**: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: geolocation=(self), camera=(self)`.
* **Zero-Latency Audio Pipeline**: Next.js `/api/tts` streaming proxy with `eleven_turbo_v2_5` model caching.
* **Singleton Audio Engine**: Global audio manager that guarantees only a single character voice is active at any time.
* **Open Fallback Reliability**: Automatic fallback to local procedural coordinate forging and Wikipedia/Mapillary open imagery when third-party APIs are unreachable.
* **PWA & Mobile Ready**: Standalone display mode, touch gesture optimization, safe-area padding, and dark fantasy theme colors.

---

## 💡 Open Source Innovation (DEV Post Submission Note)

> "The inference layer uses Gemma2-9b-it hosted on Groq for the deployed version — the same open-weight Gemma2 model family I benchmarked locally, now running on Groq's free inference infrastructure. The model is swappable: set `USE_LOCAL_OLLAMA=true` and the exact same code runs against local Gemma2:2b via Ollama with zero other changes. This is the open-weight advantage — the model is not locked to any provider. Local, Groq, DigitalOcean GPU, or any Ollama-compatible endpoint: one env var."

# World Dungeon Backend

A standalone Node.js + TypeScript service that powers the World Dungeon PWA.
It turns GPS coordinates into atmospheric walking quests using **real OpenStreetMap data** and a **local Ollama LLM** — with zero cloud AI calls and zero cost per quest.

---

## Architecture

```
GPS Coordinates
      ↓
Overpass API (OSM real landmarks within 1km)
      ↓
[Optional] SerpApi enrichment (real-world context snippets)
      ↓
Prompt Builder (hyperlocal dungeon master prompt)
      ↓
Ollama gemma2:2b (runs on your machine, no cloud)
      ↓
Zod Validation (strict schema enforcement)
      ↓
Wikimedia Commons (parallel real place image fetch)
      ↓
Quest JSON + Images → Frontend
```

---

## Prerequisites

- **Node.js 18+**
- **Ollama** installed → [ollama.com](https://ollama.com)
- **gemma2:2b** pulled: `ollama pull gemma2:2b`

---

## Setup

```bash
cd world-dungeon-backend
cp .env.example .env
npm install
```

**In a separate terminal:**
```bash
ollama serve
```

**Start the backend:**
```bash
npm run dev
```

---

## Verify it works

```bash
# Health check (Ollama + Overpass status)
curl http://localhost:3001/api/health

# Generate a test quest (Lodi Garden, Delhi)
curl -X POST http://localhost:3001/api/generate-quest \
  -H "Content-Type: application/json" \
  -d '{"lat": 28.5934, "lng": 77.2090}'

# Fetch an image for a place
curl "http://localhost:3001/api/fetch-image?place=Bara+Gumbad"

# Enrich a landmark (requires SERPAPI_KEY in .env)
curl "http://localhost:3001/api/enrich?place=Lodi+Garden&city=Delhi"
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OLLAMA_URL` | No | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | No | `gemma2:2b` | Model to use |
| `PORT` | No | `3001` | Backend port |
| `SERPAPI_KEY` | No | — | SerpApi key (100 free searches/month) |
| `FRONTEND_URL` | No | `http://localhost:3000` | CORS allow origin |

---

## API Reference

### `POST /api/generate-quest`

**Body:**
```json
{
  "lat": 28.5934,
  "lng": 77.2090,
  "radius": 1000,
  "tone": "folkloric"
}
```

**Success Response:**
```json
{
  "success": true,
  "quest": { ... },
  "meta": {
    "landmarksFound": 8,
    "modelUsed": "gemma2:2b",
    "generationMs": 14200,
    "totalMs": 17800,
    "enriched": false,
    "insufficientLandmarks": false
  }
}
```

**Error Codes:**
| Code | HTTP | Meaning |
|---|---|---|
| `INVALID_COORDS` | 400 | Bad request body |
| `OLLAMA_UNAVAILABLE` | 503 | Ollama not running |
| `NO_LANDMARKS` | 422 | Too few OSM landmarks |
| `GENERATION_FAILED` | 500 | Ollama couldn't produce valid JSON |

### `GET /api/fetch-image?place=Bara+Gumbad`
Returns `{ imageUrl: string | null }` from Wikimedia Commons.

### `GET /api/enrich?place=Lodi+Garden&city=Delhi`
Returns `{ enrichment: { snippet, source, isRecent } | null }` from SerpApi.

### `GET /api/health`
Returns service status for Ollama, Overpass, and SerpApi.

---

## Open Source Stack

| Service | License | Cost | Data Privacy |
|---|---|---|---|
| **OpenStreetMap / Overpass** | CC BY-SA | Free | No GPS sent to cloud |
| **Mapillary / Open Street Photos** | CC BY-SA | Free | Community street-level photography |
| **Procedural Cartography Canvas** | Open Source (Local) | Free | 100% offline mathematical SVG art |
| **Ollama + Gemma2:2b** | MIT / Apache | Free | Runs on your hardware |
| **Wikimedia Commons** | CC licenses | Free | No GPS sent |
| **SerpApi** | Commercial (optional) | 100 free/month | Sends search queries only |

**Closed alternative cost estimate (GPT-4 + Google Maps + Google Street View + Bing):**
~$0.08–0.15 per quest, with precise GPS coordinates sent to 3+ corporate servers on every waypoint load.

**This stack:** $0.00, GPS stays on your device. Every image comes from Mapillary or local procedural generation.

---

## Expected Response Times

| Step | Time |
|---|---|
| Overpass API fetch | 0.8–2s |
| SerpApi enrichment (optional, parallel) | 0–3s |
| Ollama generation (gemma2:2b) | 8–25s |
| Wikimedia image fetch (parallel) | 1–3s |
| **Total** | **10–30s** |

This is intentional. Quest generation happens before the player leaves home.
The frontend shows the animated typewriter loading screen during this time.

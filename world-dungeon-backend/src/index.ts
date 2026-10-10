import 'dotenv/config.js'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from './config.js'
import { generateQuestRoute } from './routes/generateQuest.js'
import { fetchImageRoute } from './routes/fetchImage.js'
import { enrichLandmarkRoute } from './routes/enrichLandmark.js'
import { healthRoute } from './routes/health.js'

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  },
})

// CORS — allow frontend origin and preview environments
await server.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    
    const allowed = [
      config.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()) : []),
    ]

    if (
      allowed.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.railway.app') ||
      origin.endsWith('.fly.dev')
    ) {
      return cb(null, true)
    }

    return cb(null, true) // Permissive API access for mobile and PWA clients
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
})

// Register all routes under /api prefix
await server.register(generateQuestRoute, { prefix: '/api' })
await server.register(fetchImageRoute, { prefix: '/api' })
await server.register(enrichLandmarkRoute, { prefix: '/api' })
await server.register(healthRoute, { prefix: '/api' })

// Global unhandled error handler
server.setErrorHandler((error, _request, reply) => {
  server.log.error(error)
  reply.status(500).send({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  })
})

// Graceful shutdown
const shutdownSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM']
for (const signal of shutdownSignals) {
  process.once(signal, async () => {
    server.log.info(`Received ${signal} — shutting down gracefully...`)
    await server.close()
    process.exit(0)
  })
}

// Start server
try {
  await server.listen({ port: config.PORT, host: '0.0.0.0' })

  const isGroq = !config.USE_LOCAL_OLLAMA && Boolean(config.GROQ_API_KEY)
  const provider = isGroq ? 'Groq (Cloud)' : 'Ollama (Local)'
  const activeModel = isGroq ? config.GROQ_MODEL : config.OLLAMA_MODEL

  console.log(`
╔══════════════════════════════════════╗
║       WORLD DUNGEON BACKEND          ║
║       Running on :${config.PORT}              ║
║       Inference: ${provider.padEnd(19)}║
║       Model:     ${activeModel.padEnd(19)}║
║       SerpApi:   ${config.SERPAPI_KEY ? 'configured       ' : 'not configured   '}║
╚══════════════════════════════════════╝

  → Health:   http://localhost:${config.PORT}/api/health
  → Quests:   POST http://localhost:${config.PORT}/api/generate-quest
  → Images:   GET  http://localhost:${config.PORT}/api/fetch-image?place=...
  → Enrich:   GET  http://localhost:${config.PORT}/api/enrich?place=...

  Frontend:  ${config.FRONTEND_URL}
  `)
} catch (err) {
  server.log.error(err)
  process.exit(1)
}

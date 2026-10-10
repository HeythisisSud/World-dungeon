import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { checkOllamaHealth } from '../services/ollama.js'
import { checkOverpassHealth } from '../services/wikimedia.js'
import { config } from '../config.js'

const SERVER_START = Date.now()

export async function healthRoute(server: FastifyInstance): Promise<void> {
  server.get('/health', async (
    _request: FastifyRequest,
    reply: FastifyReply
  ) => {
    // Run Ollama and Overpass checks in parallel
    const [ollama, overpassReachable] = await Promise.all([
      checkOllamaHealth(),
      checkOverpassHealth(),
    ])

    const ollamaStatus = ollama.connected ? 'connected' : 'unavailable'
    const overpassStatus = overpassReachable ? 'reachable' : 'unreachable'
    const serpApiStatus = config.SERPAPI_KEY ? 'configured' : 'not_configured'

    // Overall status logic
    let status: 'ok' | 'degraded' | 'error'
    if (ollama.connected && overpassReachable) {
      status = 'ok'
    } else if (!ollama.connected && !overpassReachable) {
      status = 'error'
    } else {
      status = 'degraded'
    }

    return reply.status(200).send({
      status,
      services: {
        ollama: {
          status: ollamaStatus,
          model: ollama.model,
          url: ollama.url,
        },
        serpapi: {
          status: serpApiStatus,
        },
        overpass: {
          status: overpassStatus,
        },
      },
      version: '1.0.0',
      uptime: Math.floor((Date.now() - SERVER_START) / 1000),
    })
  })
}

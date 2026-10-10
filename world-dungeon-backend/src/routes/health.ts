import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { checkLLMHealth } from '../services/ollama.js'
import { checkOverpassHealth } from '../services/wikimedia.js'
import { config } from '../config.js'

const SERVER_START = Date.now()

export async function healthRoute(server: FastifyInstance): Promise<void> {
  server.get('/health', async (
    _request: FastifyRequest,
    reply: FastifyReply
  ) => {
    // Run LLM and Overpass checks in parallel
    const [llm, overpassReachable] = await Promise.all([
      checkLLMHealth(),
      checkOverpassHealth(),
    ])

    const llmStatus = llm.connected ? 'connected' : 'unavailable'
    const overpassStatus = overpassReachable ? 'reachable' : 'unreachable'
    const serpApiStatus = config.SERPAPI_KEY ? 'configured' : 'not_configured'

    // Overall status logic
    let status: 'ok' | 'degraded' | 'error'
    if (llm.connected && overpassReachable) {
      status = 'ok'
    } else if (!llm.connected && !overpassReachable) {
      status = 'error'
    } else {
      status = 'degraded'
    }

    return reply.status(200).send({
      status,
      services: {
        llm: {
          provider: llm.provider,
          status: llmStatus,
          model: llm.model,
          url: llm.url,
        },
        ollama: {
          status: llm.provider === 'ollama' ? llmStatus : 'cloud_mode',
          model: llm.model,
          url: llm.url,
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

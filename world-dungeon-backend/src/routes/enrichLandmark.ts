import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { enrichLandmark } from '../services/serpapi.js'
import { config } from '../config.js'

const EnrichQuerySchema = z.object({
  place: z.string().min(1).max(200),
  city: z.string().default('Delhi'),
})

export async function enrichLandmarkRoute(server: FastifyInstance): Promise<void> {
  server.get('/enrich', async (
    request: FastifyRequest<{ Querystring: { place?: string; city?: string } }>,
    reply: FastifyReply
  ) => {
    const parsed = EnrichQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Missing or invalid "place" query parameter',
        enrichment: null,
      })
    }

    const { place, city } = parsed.data
    const enrichment = await enrichLandmark(place, city)

    return reply.status(200).send({
      success: true,
      enrichment,
      place,
      serpApiConfigured: Boolean(config.SERPAPI_KEY),
    })
  })
}

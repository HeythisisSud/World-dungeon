import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { fetchPlaceImage } from '../services/wikimedia.js'

const FetchImageQuerySchema = z.object({
  place: z.string().min(1).max(200),
})

export async function fetchImageRoute(server: FastifyInstance): Promise<void> {
  server.get('/fetch-image', async (
    request: FastifyRequest<{ Querystring: { place?: string } }>,
    reply: FastifyReply
  ) => {
    const parsed = FetchImageQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Missing or invalid "place" query parameter',
        imageUrl: null,
      })
    }

    const { place } = parsed.data
    const imageUrl = await fetchPlaceImage(place)

    return reply.status(200).send({
      success: true,
      imageUrl,
      place,
    })
  })
}

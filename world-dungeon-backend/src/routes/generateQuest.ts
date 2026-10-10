import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { GenerateQuestRequestSchema, type Quest } from '../validators/questSchema.js'
import { fetchLandmarks, type OSMLandmark } from '../services/overpass.js'
import { enrichLandmark } from '../services/serpapi.js'
import { buildQuestPrompt } from '../prompts/questPrompt.js'
import { generateQuestFromLLM, checkLLMHealth } from '../services/ollama.js'
import { fetchPlaceImage } from '../services/wikimedia.js'
import { config } from '../config.js'

type GenerateQuestBody = {
  lat: number
  lng: number
  radius?: number
  tone?: string
}

function buildProceduralQuest(
  landmarks: OSMLandmark[],
  userLat: number,
  userLng: number
): Quest {
  const chosen: OSMLandmark[] = [...landmarks.slice(0, 4)]

  const offsetPatterns = [
    { name: 'The Ancient Threshold', dLat: 0.0012, dLng: 0.0010 },
    { name: 'The Forgotten Crossroads', dLat: 0.0022, dLng: -0.0015 },
    { name: 'The Old Stone Wall', dLat: -0.0018, dLng: 0.0025 },
    { name: 'The Hidden Sanctum', dLat: -0.0028, dLng: -0.0020 },
  ]

  while (chosen.length < 4) {
    const pattern = offsetPatterns[chosen.length]
    chosen.push({
      id: Date.now() + chosen.length,
      name: pattern.name,
      type: 'historic',
      subtype: 'unnamed',
      lat: userLat + pattern.dLat,
      lng: userLng + pattern.dLng,
      tags: {},
      isUnnamed: true,
      mayBeInaccessible: false,
    })
  }

  const loreTemplates = [
    (name: string) =>
      `You stand before ${name}. The air here feels heavy with silence, as if the bustling street has faded into an older memory. The worn textures and quiet corners suggest years of unnoticed passage.\n\nDecades ago, before the modern city expanded over these lanes, this ground marked an old boundary line. Travelers and cartographers stopped near ${name} to consult their instruments before venturing deeper into the uncharted quarter.`,
    (name: string) =>
      `The path leads directly to ${name}. Notice the subtle shifts in the stone and earth beneath your feet, where countless footsteps have pressed into the dust. The surrounding sounds seem muffled here.\n\nDuring the middle of the last century, this exact spot was a gathering point for local watchmen during nighttime power cuts. Stories passed around ${name} spoke of subterranean tunnels that ran beneath the neighborhood foundations.`,
    (name: string) =>
      `At ${name}, the light filters through with a golden hue against the weathered walls. A strange stillness lingers between the gaps of the structures.\n\nArchival records from the 1970s note that an old municipal surveyor marked ${name} with a brass talisman that was never cataloged. Those who linger here report a sense of being observed by the city itself.`,
    (name: string) =>
      `You have arrived at ${name}, the final coordinate of the route. The surroundings open up slightly, revealing the intersection where the forgotten path resolves.\n\nAccording to urban folklore, this mark at ${name} seals the pact between the walkers and the spirits of the old settlement. By reaching this destination on foot, you have retraced a lineage unbroken since the dawn of the settlement.`,
  ]

  const unlockCues = [
    'The threshold recognizes you.',
    'The ground knows your weight.',
    'The forgotten mark is found.',
    'The circle is complete.',
  ]

  const waypoints = chosen.slice(0, 4).map((lm, idx) => ({
    sequence: idx + 1,
    realPlaceName: lm.name,
    coords: {
      lat: lm.lat,
      lng: lm.lng,
    },
    loreFragment: loreTemplates[idx](lm.name),
    unlockCue: unlockCues[idx],
  }))

  const primaryName = chosen[0]?.name || 'The Neighborhood Realm'

  return {
    title: `The Secret of ${primaryName}`,
    premise: `An ancient manuscript points to an unbroken sequence of forgotten landmarks right in your neighborhood. Walk the path to recover what was buried beneath time.`,
    tone: 'folkloric' as const,
    waypoints,
    resolution: `You have completed the walker's route through your neighborhood. The seals of the district have answered your journey.`,
    artifactName: `The Talisman of ${primaryName}`,
  }
}

export async function generateQuestRoute(server: FastifyInstance): Promise<void> {
  server.post('/generate-quest', async (
    request: FastifyRequest<{ Body: GenerateQuestBody }>,
    reply: FastifyReply
  ) => {
    const start = Date.now()

    // 1. Validate request body
    const bodyParsed = GenerateQuestRequestSchema.safeParse(request.body)
    if (!bodyParsed.success) {
      return reply.status(400).send({
        success: false,
        error: bodyParsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        code: 'INVALID_COORDS',
      })
    }
    const { lat, lng, radius, tone } = bodyParsed.data

    // 2. Fetch real landmarks from OpenStreetMap around user coordinates
    server.log.info(`Fetching OSM landmarks at ${lat},${lng} radius=${radius}m`)
    let landmarks: OSMLandmark[] = []
    let insufficientLandmarks = false
    try {
      const osmResult = await fetchLandmarks(lat, lng, radius)
      landmarks = osmResult.landmarks
      insufficientLandmarks = osmResult.insufficientLandmarks
    } catch (err) {
      server.log.warn(`OSM fetch failed: ${(err as Error).message}. Will use procedural offsets near coordinates.`)
    }

    // 3. Check LLM availability (Groq or Ollama)
    const llmHealth = await checkLLMHealth().catch(() => ({
      connected: false,
      model: 'none',
      provider: 'ollama' as const,
      url: '',
    }))

    let quest: Quest | null = null
    let modelUsed = 'procedural-osm'
    let generationMs = 0

    if (llmHealth.connected && landmarks.length >= 3) {
      // 4. Enrich top 4 landmarks via SerpApi in parallel (optional)
      const enriched = config.SERPAPI_KEY != null
      if (enriched) {
        server.log.info('Enriching landmarks via SerpApi...')
        const enrichmentResults = await Promise.all(
          landmarks.slice(0, 4).map(lm =>
            enrichLandmark(lm.name).catch(() => null)
          )
        )
        for (let i = 0; i < Math.min(4, landmarks.length); i++) {
          landmarks[i].enrichment = enrichmentResults[i]
        }
      }

      // 5. Build prompt and query LLM (Groq or Ollama)
      const prompt = buildQuestPrompt(landmarks, tone)
      const llmStart = Date.now()
      try {
        quest = await generateQuestFromLLM(prompt)
        generationMs = Date.now() - llmStart
        modelUsed = `${llmHealth.provider}:${llmHealth.model}`
        server.log.info(`LLM (${llmHealth.provider}) generated quest in ${generationMs}ms`)
      } catch (err) {
        server.log.warn(`LLM generation failed: ${(err as Error).message}. Falling back to procedural OSM synthesis at user coords.`)
        quest = null
      }
    }

    // 6. If Ollama is unavailable or failed, generate procedural quest at the user's REAL coordinates
    if (!quest) {
      quest = buildProceduralQuest(landmarks, lat, lng)
      generationMs = Date.now() - start
      modelUsed = 'local-osm-synthesizer'
    }

    // 7. Fetch images for all waypoints in parallel
    const imageUrls = await Promise.all(
      quest.waypoints.map(wp => fetchPlaceImage(wp.realPlaceName))
    )

    const waypointsWithImages = quest.waypoints.map((wp, i) => ({
      ...wp,
      fetchedImageUrl: imageUrls[i] ?? null,
      userPhotoDataUrl: null,
    }))

    const finalQuest = { ...quest, waypoints: waypointsWithImages }

    return reply.status(200).send({
      success: true,
      quest: finalQuest,
      meta: {
        landmarksFound: landmarks.length,
        modelUsed,
        generationMs,
        totalMs: Date.now() - start,
        enriched: Boolean(config.SERPAPI_KEY),
        insufficientLandmarks,
      },
    })
  })
}

import { config } from '../config.js'

export type LandmarkEnrichment = {
  snippet: string
  source: string
  isRecent: boolean
}

type SerpApiOrganicResult = {
  snippet?: string
  link?: string
  date?: string
}

type SerpApiResponse = {
  organic_results?: SerpApiOrganicResult[]
}

/**
 * Enrich a landmark with real-world context using SerpApi web search.
 * Only runs when SERPAPI_KEY is configured. Always fails gracefully.
 */
export async function enrichLandmark(
  placeName: string,
  city: string = 'Delhi'
): Promise<LandmarkEnrichment | null> {
  if (!config.SERPAPI_KEY) return null

  try {
    const query = `${placeName} ${city} history facts`
    const url = new URL('https://serpapi.com/search.json')
    url.searchParams.set('q', query)
    url.searchParams.set('api_key', config.SERPAPI_KEY)
    url.searchParams.set('num', '3')
    url.searchParams.set('engine', 'google')

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(3000),
    })

    if (!res.ok) return null

    const data = (await res.json()) as SerpApiResponse
    const firstResult = data.organic_results?.[0]
    if (!firstResult?.snippet) return null

    // Truncate to last complete sentence before 200 chars
    let snippet = firstResult.snippet
    if (snippet.length > 200) {
      const truncated = snippet.slice(0, 200)
      const lastPeriod = truncated.lastIndexOf('.')
      snippet = lastPeriod > 50 ? truncated.slice(0, lastPeriod + 1) : truncated
    }

    // Detect if published within last 6 months
    let isRecent = false
    if (firstResult.date) {
      try {
        const published = new Date(firstResult.date)
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
        isRecent = published > sixMonthsAgo
      } catch {
        // Unparseable date — not recent
      }
    }

    return {
      snippet,
      source: firstResult.link ?? 'web search',
      isRecent,
    }
  } catch {
    // Never let SerpApi failure block quest generation
    return null
  }
}

/**
 * Wikimedia Commons image fetcher.
 * Tries Wikipedia page summary → Commons file search → Commons text search.
 * Never throws — a missing image is not a fatal error.
 * Results are cached in memory to avoid redundant API calls.
 */
const imageCache = new Map<string, string | null>()

type WikipediaSummaryResponse = {
  thumbnail?: {
    source: string
    width: number
    height: number
  }
  title?: string
  extract?: string
}

type CommonsImageInfoResponse = {
  query?: {
    pages?: Record<
      string,
      {
        title?: string
        imageinfo?: Array<{ url: string }>
      }
    >
  }
}

type CommonsSearchResponse = {
  query?: {
    search?: Array<{
      title: string
      snippet: string
    }>
    pages?: Record<
      string,
      {
        imageinfo?: Array<{ url: string }>
      }
    >
  }
}

/**
 * Fetch a representative image URL for a place name.
 * Tries 3 strategies in order, returns first success or null.
 */
export async function fetchPlaceImage(placeName: string): Promise<string | null> {
  const cacheKey = placeName.toLowerCase().trim()
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!
  }

  const timeout = AbortSignal.timeout(5000)

  // STRATEGY 1: Wikipedia page thumbnail (highest quality)
  try {
    const slug = encodeURIComponent(placeName.replace(/\s+/g, '_'))
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`,
      {
        headers: { 'User-Agent': 'WorldDungeonPWA/1.0 (local-dev)' },
        signal: timeout,
      }
    )
    if (res.ok) {
      const data = (await res.json()) as WikipediaSummaryResponse
      if (data.thumbnail?.source) {
        imageCache.set(cacheKey, data.thumbnail.source)
        return data.thumbnail.source
      }
    }
  } catch {
    // Strategy 1 failed — try next
  }

  // STRATEGY 2: Wikimedia Commons direct file lookup
  try {
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(
        placeName
      )}&prop=imageinfo&iiprop=url&format=json&origin=*`,
      {
        headers: { 'User-Agent': 'WorldDungeonPWA/1.0 (local-dev)' },
        signal: AbortSignal.timeout(5000),
      }
    )
    if (res.ok) {
      const data = (await res.json()) as CommonsImageInfoResponse
      const pages = data.query?.pages
      if (pages) {
        const pageKey = Object.keys(pages)[0]
        if (pageKey && pageKey !== '-1') {
          const url = pages[pageKey]?.imageinfo?.[0]?.url
          if (url) {
            imageCache.set(cacheKey, url)
            return url
          }
        }
      }
    }
  } catch {
    // Strategy 2 failed — try next
  }

  // STRATEGY 3: Wikimedia Commons text search
  try {
    const searchRes = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        placeName
      )}&srnamespace=6&srlimit=3&format=json&origin=*`,
      {
        headers: { 'User-Agent': 'WorldDungeonPWA/1.0 (local-dev)' },
        signal: AbortSignal.timeout(5000),
      }
    )
    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as CommonsSearchResponse
      const results = searchData.query?.search ?? []
      for (const result of results) {
        const title = result.title
        // Fetch imageinfo for this file
        const infoRes = await fetch(
          `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
            title
          )}&prop=imageinfo&iiprop=url&format=json&origin=*`,
          {
            headers: { 'User-Agent': 'WorldDungeonPWA/1.0 (local-dev)' },
            signal: AbortSignal.timeout(5000),
          }
        )
        if (infoRes.ok) {
          const infoData = (await infoRes.json()) as CommonsImageInfoResponse
          const pages = infoData.query?.pages
          if (pages) {
            const pageKey = Object.keys(pages)[0]
            const url = pages[pageKey ?? '']?.imageinfo?.[0]?.url
            if (url && /\.(jpg|jpeg|png)$/i.test(url)) {
              imageCache.set(cacheKey, url)
              return url
            }
          }
        }
      }
    }
  } catch {
    // All strategies failed
  }

  imageCache.set(cacheKey, null)
  return null
}

/**
 * Check if Overpass API is reachable.
 */
export async function checkOverpassHealth(): Promise<boolean> {
  try {
    const res = await fetch('https://overpass-api.de/api/status', {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch {
    return false
  }
}

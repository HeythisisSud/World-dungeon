const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

export type OSMLandmark = {
  id: number
  name: string          // may be auto-generated if unnamed
  type: string
  subtype: string       // the specific OSM tag value
  lat: number
  lng: number
  tags: Record<string, string>
  isUnnamed: boolean    // true if we generated the name
  mayBeInaccessible: boolean
  score?: number
  snapCoords?: { lat: number; lng: number }
  enrichment?: { snippet: string; source: string; isRecent: boolean } | null
}

type OverpassElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

type OverpassResponse = {
  elements: OverpassElement[]
}

/**
 * Haversine distance between two lat/lng points in meters.
 */
function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Build the Overpass QL query for a given coordinate + radius.
 * Queries neighborhood street furniture, nature, walls, shops, plots, alongside historic sites.
 */
function buildOverpassQuery(lat: number, lng: number, radius: number): string {
  return `[out:json][timeout:30];
(
  // Named shops, stalls, businesses
  node["name"]["shop"](around:${radius},${lat},${lng});
  node["name"]["amenity"](around:${radius},${lat},${lng});

  // Street furniture — benches, bins, lights
  node["amenity"="bench"](around:${radius},${lat},${lng});
  node["amenity"="waste_basket"](around:${radius},${lat},${lng});
  node["amenity"="drinking_water"](around:${radius},${lat},${lng});
  node["highway"="bus_stop"](around:${radius},${lat},${lng});

  // Named roads, lanes, alleys
  way["name"]["highway"~"residential|living_street|service|unclassified|tertiary|secondary|footway|path|steps|pedestrian|alley"](around:${radius},${lat},${lng});

  // Any named place at all
  node["name"](around:${radius},${lat},${lng});
  way["name"](around:${radius},${lat},${lng});

  // Land use — empty plots, parks, fields
  way["landuse"~"grass|farmland|meadow|vacant|brownfield|greenfield"](around:${radius},${lat},${lng});

  // Natural features — trees, water, rocks
  node["natural"~"tree|rock|spring|water"](around:${radius},${lat},${lng});

  // Barriers and walls (interesting lore potential)
  way["barrier"~"wall|fence|gate|retaining_wall"](around:${radius},${lat},${lng});

  // Historic (keep these too)
  node["historic"](around:${radius},${lat},${lng});
  way["historic"](around:${radius},${lat},${lng});
);
out body;
>;
out skel qt;`
}

/**
 * Process raw OSM elements into structured OSMLandmark objects,
 * generating descriptive names for unnamed objects, scoring, and deduplicating by type.
 */
export function processOSMResults(
  elements: OverpassElement[],
  userLat: number,
  userLng: number,
  radius: number
): OSMLandmark[] {
  const landmarks: OSMLandmark[] = []

  for (const el of elements) {
    if (!el.lat && !el.center) continue

    const lat = el.lat ?? el.center!.lat
    const lng = el.lon ?? el.center!.lon

    // Generate a name if OSM has none
    // Unnamed places are valid quest waypoints
    let name = el.tags?.name
    let isUnnamed = false

    if (!name) {
      // Generate descriptive name from tags
      if (el.tags?.amenity === 'bench') {
        name = 'The Bench'
        isUnnamed = true
      } else if (el.tags?.natural === 'tree') {
        name = 'The Old Tree'
        isUnnamed = true
      } else if (el.tags?.barrier === 'wall') {
        name = 'The Old Wall'
        isUnnamed = true
      } else if (el.tags?.highway === 'bus_stop') {
        name = el.tags?.ref
          ? `Bus Stop ${el.tags.ref}`
          : 'The Bus Stop'
        isUnnamed = true
      } else if (el.tags?.landuse === 'vacant') {
        name = 'The Empty Plot'
        isUnnamed = true
      } else if (el.tags?.shop) {
        name = `The ${el.tags.shop} Shop`
        isUnnamed = true
      } else {
        // Skip truly featureless elements
        continue
      }
    }

    // Determine type and subtype
    const type = (
      el.tags?.historic ??
      el.tags?.amenity ??
      el.tags?.shop ??
      el.tags?.natural ??
      el.tags?.barrier ??
      el.tags?.landuse ??
      el.tags?.highway ??
      el.tags?.leisure ??
      'place'
    )

    const subtype = el.tags?.name
      ? 'named'
      : 'unnamed'

    // Distance from user
    const dist = haversineMeters(userLat, userLng, lat, lng)

    // Skip if more than radius + 20% buffer
    if (dist > radius * 1.2) continue

    landmarks.push({
      id: el.id,
      name,
      type,
      subtype,
      lat,
      lng,
      tags: el.tags ?? {},
      isUnnamed,
      mayBeInaccessible: false,
    })
  }

  // SCORING — unnamed everyday places score differently from named monuments
  // Both are valid — just weighted differently
  const scored = landmarks.map(l => {
    let score = 0

    // Named places get slight boost
    if (!l.isUnnamed) score += 2

    // Historically significant
    if (l.tags.historic) score += 4
    if (l.tags.heritage) score += 3

    // Everyday but interesting
    if (l.type === 'bench') score += 2
    if (l.type === 'tree' && l.tags.natural) score += 2
    if (l.type === 'wall') score += 1
    if (l.tags.shop) score += 1

    // Penalize if likely inaccessible
    if (l.tags.access === 'private') {
      score -= 5
      l.mayBeInaccessible = true
    }
    if (l.tags.access === 'no') {
      score -= 10
      l.mayBeInaccessible = true
    }

    return { ...l, score }
  })

  // Sort by score descending
  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  // Deduplicate by type — max 2 of same type
  const typeCounts: Record<string, number> = {}
  const deduped = scored.filter(l => {
    typeCounts[l.type] = (typeCounts[l.type] ?? 0) + 1
    return typeCounts[l.type] <= 2
  })

  // Return top 8, ensuring variety
  return deduped.slice(0, 8)
}

type FetchLandmarksResult = {
  landmarks: OSMLandmark[]
  insufficientLandmarks: boolean
}

/**
 * Fetch real geographic landmarks from OpenStreetMap via Overpass API.
 * Uses the expanded neighborhood query + processOSMResults.
 */
export async function fetchLandmarks(
  lat: number,
  lng: number,
  radius: number = 1000
): Promise<FetchLandmarksResult> {
  const doFetch = async (r: number): Promise<OverpassElement[]> => {
    const query = buildOverpassQuery(lat, lng, r)
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(28000),
    })
    if (!res.ok) {
      throw new Error(`Overpass API error: ${res.status} ${res.statusText}`)
    }
    const data = (await res.json()) as OverpassResponse
    return data.elements
  }

  const elements = await doFetch(radius)
  const landmarks = processOSMResults(elements, lat, lng, radius)

  // Fallback: widen radius if too few results
  if (landmarks.length < 4 && radius < 2000) {
    console.log(`⚠  Only ${landmarks.length} landmarks found at ${radius}m. Widening to 2000m...`)
    return fetchLandmarks(lat, lng, 2000)
  }

  const insufficientLandmarks = landmarks.length < 4

  return { landmarks, insufficientLandmarks }
}

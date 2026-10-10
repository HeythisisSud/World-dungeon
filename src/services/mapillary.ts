/**
 * Mapillary open street-level photography client.
 * Mapillary is a community-contributed street-level photo platform.
 * Queries imagery near GPS coordinates without requiring closed commercial APIs.
 */

// Mapillary v4 search radius: ~100m bounding box
export async function fetchMapillaryImage(
  lat: number,
  lng: number,
  clientToken?: string
): Promise<string | null> {
  const token = clientToken || process.env.NEXT_PUBLIC_MAPILLARY_CLIENT_TOKEN

  // If no token is configured, or if running in community open mode:
  // Mapillary v4 images endpoint requires an access token (free to register at mapillary.com).
  // If token is missing, fail gracefully so GeneratedLocationArt takes over immediately.
  if (!token) {
    return null
  }

  try {
    const delta = 0.001 // ~100m
    const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`
    const url = `https://graph.mapillary.com/images?bbox=${bbox}&fields=id,thumb_1024_url,compass_angle&limit=1&access_token=${token}`

    const res = await fetch(url, { signal: AbortSignal.timeout(3500) })
    if (!res.ok) return null

    const data = await res.json()
    if (data.data && data.data.length > 0) {
      return data.data[0].thumb_1024_url || null
    }
  } catch (error) {
    console.warn('Mapillary fetch error:', error)
  }

  return null
}

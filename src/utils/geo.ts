export type Coords = {
  lat: number;
  lng: number;
};

/**
 * Calculates distance in meters between two lat/lng pairs using the Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Interpolates between start position and target position by fraction t (0.0 to 1.0).
 */
export function interpolateCoords(start: Coords, target: Coords, t: number): Coords {
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    lat: start.lat + (target.lat - start.lat) * clampedT,
    lng: start.lng + (target.lng - start.lng) * clampedT,
  };
}

export function formatDistance(meters: number): string {
  if (meters < 50) return 'YOU ARE HERE'
  if (meters < 100) return `${Math.round(meters)}m`
  if (meters < 1000) return `${Math.round(meters / 10) * 10}m`
  return `${(meters / 1000).toFixed(1)}km`
}

export function getDirectionArrow(
  userLat: number, userLng: number,
  targetLat: number, targetLng: number,
  userHeading: number | null
): string {
  const dLng = targetLng - userLng
  const dLat = targetLat - userLat
  const bearing = Math.atan2(dLng, dLat) * (180 / Math.PI)
  
  if (userHeading === null) return '◆' // no heading data
  
  const relative = ((bearing - userHeading) + 360) % 360
  
  if (relative < 22.5 || relative >= 337.5) return '↑'
  if (relative < 67.5) return '↗'
  if (relative < 112.5) return '→'
  if (relative < 157.5) return '↘'
  if (relative < 202.5) return '↓'
  if (relative < 247.5) return '↙'
  if (relative < 292.5) return '←'
  return '↖'
}

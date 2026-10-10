import { NextRequest, NextResponse } from "next/server";

type LandmarkCandidate = {
  name: string;
  lat: number;
  lng: number;
};

function generateLocalQuest(userLat: number, userLng: number, nearbyLandmarks: LandmarkCandidate[] = []) {
  const chosen: LandmarkCandidate[] = [...nearbyLandmarks.slice(0, 4)];

  const offsetPatterns = [
    { name: "The Ancient Threshold", dLat: 0.0012, dLng: 0.0010 },
    { name: "The Forgotten Crossroads", dLat: 0.0022, dLng: -0.0015 },
    { name: "The Old Stone Wall", dLat: -0.0018, dLng: 0.0025 },
    { name: "The Hidden Sanctum", dLat: -0.0028, dLng: -0.0020 },
  ];

  while (chosen.length < 4) {
    const pattern = offsetPatterns[chosen.length];
    chosen.push({
      name: pattern.name,
      lat: userLat + pattern.dLat,
      lng: userLng + pattern.dLng,
    });
  }

  const loreTemplates = [
    (name: string) =>
      `You stand before ${name}. The surrounding air feels heavy with quiet reverence, as if the bustling street has faded into an older memory. The worn textures and quiet corners suggest years of unnoticed passage.\n\nDecades ago, before the modern district expanded over these lanes, this ground marked an old boundary line. Travelers and cartographers stopped near ${name} to consult their instruments before venturing deeper into the uncharted quarter.`,
    (name: string) =>
      `The path leads directly to ${name}. Notice the subtle shifts in the stone and earth beneath your feet, where countless footsteps have pressed into the dust. The surrounding sounds seem muffled here.\n\nDuring the middle of the last century, this exact spot was a gathering point for local watchmen during nighttime power cuts. Stories passed around ${name} spoke of subterranean passages that ran beneath the neighborhood foundations.`,
    (name: string) =>
      `At ${name}, the light filters through with a golden hue against the weathered walls. A strange stillness lingers between the gaps of the structures.\n\nArchival records note that an old municipal surveyor marked ${name} with a brass talisman that was never cataloged. Those who linger here report a sense of being observed by the city itself.`,
    (name: string) =>
      `You have arrived at ${name}, the final coordinate of the route. The surroundings open up slightly, revealing the intersection where the forgotten path resolves.\n\nAccording to urban folklore, this mark at ${name} seals the pact between the walkers and the spirits of the old settlement. By reaching this destination on foot, you have retraced a lineage unbroken since the dawn of the settlement.`,
  ];

  const unlockCues = [
    "The threshold recognizes you.",
    "The ground knows your weight.",
    "The forgotten mark is found.",
    "The circle is complete.",
  ];

  const waypoints = chosen.slice(0, 4).map((lm, idx) => ({
    sequence: idx + 1,
    realPlaceName: lm.name,
    coords: {
      lat: lm.lat,
      lng: lm.lng,
    },
    loreFragment: loreTemplates[idx](lm.name),
    unlockCue: unlockCues[idx],
    fetchedImageUrl: null,
    userPhotoDataUrl: null,
  }));

  const primaryName = chosen[0]?.name || "The Neighborhood Sanctum";

  return {
    title: `The Secret of ${primaryName}`,
    premise: `An ancient manuscript points to an unbroken sequence of forgotten landmarks right in your neighborhood. Walk the path to recover what was buried beneath time.`,
    tone: "folkloric" as const,
    waypoints,
    resolution: `You have completed the walker's route through your neighborhood. The seals of the district have answered your journey.`,
    artifactName: `The Talisman of ${primaryName}`,
  };
}

async function fetchNearbyOSM(lat: number, lng: number, radius = 1000): Promise<LandmarkCandidate[]> {
  const query = `[out:json][timeout:10];
(
  node["name"]["amenity"](around:${radius},${lat},${lng});
  node["name"]["shop"](around:${radius},${lat},${lng});
  node["name"]["historic"](around:${radius},${lat},${lng});
  node["amenity"="bench"](around:${radius},${lat},${lng});
  node["natural"="tree"](around:${radius},${lat},${lng});
);
out body 10;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) return [];
  const data = await res.json();
  const candidates: LandmarkCandidate[] = [];

  for (const el of data.elements || []) {
    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    if (!elLat || !elLng) continue;

    let name = el.tags?.name;
    if (!name) {
      if (el.tags?.amenity === "bench") name = "The Bench";
      else if (el.tags?.natural === "tree") name = "The Old Tree";
      else if (el.tags?.barrier === "wall") name = "The Old Wall";
      else continue;
    }

    candidates.push({ name, lat: elLat, lng: elLng });
    if (candidates.length >= 4) break;
  }

  return candidates;
}

export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
  let body: { lat?: number; lng?: number; radius?: number; tone?: string } = {};

  try {
    body = await request.json();
  } catch {
    body = { lat: 28.5934, lng: 77.2090 };
  }

  const userLat = typeof body.lat === "number" ? body.lat : 28.5934;
  const userLng = typeof body.lng === "number" ? body.lng : 77.2090;
  const radius = typeof body.radius === "number" ? body.radius : 1000;

  // 1. Try forwarding to backend service
  try {
    const res = await fetch(`${backendUrl}/api/generate-quest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, lat: userLat, lng: userLng, radius }),
      signal: AbortSignal.timeout(90000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.quest) {
        return NextResponse.json({
          success: true,
          quest: data.quest,
          meta: {
            ...data.meta,
            source: "live-backend",
          },
        });
      }
    }
  } catch (err) {
    console.warn("Backend request failed, generating local neighborhood quest:", (err as Error).message);
  }

  // 2. Dynamic neighborhood fallback directly at user's coordinates
  let osmLandmarks: LandmarkCandidate[] = [];
  try {
    osmLandmarks = await fetchNearbyOSM(userLat, userLng, radius);
  } catch {
    // Fall back to localized offset points
  }

  const localQuest = generateLocalQuest(userLat, userLng, osmLandmarks);

  return NextResponse.json({
    success: true,
    quest: localQuest,
    meta: {
      source: "local-neighborhood-forge",
      note: `Generated at player location (${userLat.toFixed(4)}, ${userLng.toFixed(4)})`,
      landmarksFound: osmLandmarks.length,
    },
  });
}

import type { OSMLandmark } from '../services/overpass.js'

/**
 * Auto-detect the best quest tone based on landmark tags and local time.
 */
function detectTone(landmarks: OSMLandmark[]): string {
  const hasMosque = landmarks.some(
    (l) =>
      l.tags['historic'] === 'mosque' ||
      (l.tags['amenity'] === 'place_of_worship' && l.tags['religion'] === 'islam')
  )
  const hasFortOrRuins = landmarks.some(
    (l) =>
      l.tags['historic'] === 'fort' ||
      l.tags['historic'] === 'ruins' ||
      l.tags['historic'] === 'castle'
  )
  const hour = new Date().getHours()
  const isNight = hour >= 18 && hour <= 23

  if (hasMosque) return 'folkloric'
  if (hasFortOrRuins) return 'mythic'
  if (isNight) return 'dark'
  return 'eerie'
}

/**
 * Build the complete Ollama prompt from real OSM landmark data.
 * This is the most critical function — quest quality depends entirely on it.
 */
export function buildQuestPrompt(
  landmarks: OSMLandmark[],
  tone?: string
): string {
  const resolvedTone = tone ?? detectTone(landmarks)

  const usableLandmarks = landmarks
    .filter((l) => !l.mayBeInaccessible)
    .slice(0, 8)

  const locationLines = usableLandmarks
    .map((l) => {
      let line =
        `- "${l.name}" (${l.type}) at coordinates ${l.lat.toFixed(6)},${l.lng.toFixed(6)}`

      if (l.tags['wikipedia']) line += ` [has Wikipedia entry]`
      if (l.tags['historic']) line += ` [historic: ${l.tags['historic']}]`
      if (l.tags['heritage']) line += ` [heritage site]`
      if (l.tags['description']) {
        line += ` [description: "${l.tags['description']?.slice(0, 80) ?? ''}"]`
      }

      // Inject SerpApi enrichment if available
      if (l.enrichment?.snippet) {
        line += `\n  [REAL CONTEXT: "${l.enrichment.snippet}"]`
      }

      return line
    })
    .join('\n')

  return `You are a dungeon master and urban historian writing a walking quest for a real neighborhood.
You have been given REAL geographic data from OpenStreetMap. Every waypoint you create MUST use a real place from the list below.

STRICT RULES:
1. Use ONLY places from the AVAILABLE LOCATIONS list as waypoints. Do not invent locations.
2. Choose exactly 4 waypoints. No more, no less.
3. Each lore fragment must reference the specific place name at least twice.
4. Do not use European fantasy tropes. Draw from Mughal history, Indian folk mythology, urban legends, or historical events of this region.
5. The quest must be completable by walking — no crossing highways, no private property.
6. Lore fragments must be 80-150 words each.
7. The tone is ${resolvedTone}.
8. Respond ONLY with a valid JSON object. No explanation. No markdown. No code fences. Just the raw JSON object starting with {

LORE PHILOSOPHY — CRITICAL:
The waypoints may include ordinary places:
a bench, a stall, a street corner, an empty
plot, a tree, a wall. This is intentional.
Your job is to make the ORDINARY feel
MYTHIC. A bench is not just a bench —
it is where someone waited for someone
who never came. An empty plot is not
empty — something stood here and was
erased. A street corner is not random —
paths cross here because they always did.

Do NOT apologize for ordinary locations.
Do NOT default to generic fantasy imagery.
Draw from the specific reality of this
neighborhood in Delhi:

Auto-rickshaws and their drivers
Chai stalls and their regulars
Power cuts and water shortages
The 1947 partition’s shadow on old
neighborhoods
The Emergency of 1975-77
DDA housing colonies and their history
The way monsoon changes everything
Construction that never finishes
Walls with faded political slogans
The specific quality of Delhi dust

Make the walker feel that THIS EXACT SPOT
they are standing on has a story that
only they now know. That is the quest.

LORE STRUCTURE REQUIREMENT:
Each loreFragment MUST contain exactly two distinct sections separated by a line break:

SECTION 1 (2-3 sentences): What the walker SEES and FEELS standing at this location right now. Use present tense. Be sensory and specific to THIS place — describe the physical reality of being there: sounds, smells, textures, the quality of light, what is broken or worn.

SECTION 2 (3-4 sentences): What HAPPENED here. Draw from real Indian history: Mughal court politics, the 1857 uprising, the Delhi Durbar, colonial land seizures, the 1947 partition, Indira Gandhi's emergency, or authentic Delhi urban legend. Name a specific decade or era. Make it feel like recovered truth, not fiction.

Do not blend the sections. Keep them distinct. The break between them should feel like lifting a stone and finding something underneath.

AVAILABLE LOCATIONS (choose 4 as waypoints):
${locationLines}

REQUIRED JSON SCHEMA:
{
  "title": "string (5-60 chars, evocative)",
  "premise": "string (2-3 sentences, sets the mystery)",
  "tone": "${resolvedTone}",
  "waypoints": [
    {
      "sequence": 1,
      "realPlaceName": "exact name from list above",
      "coords": {
        "lat": number,
        "lng": number
      },
      "loreFragment": "string (80-150 words, mentions place name twice, no generic fantasy, draws from regional history)",
      "unlockCue": "string (max 8 words, spoken aloud when player arrives, atmospheric, present tense)"
    }
  ],
  "resolution": "string (2 sentences, what the walker has accomplished or uncovered)",
  "artifactName": "string (3-6 words, the name of the earned artifact)"
}`
}

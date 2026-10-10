import { trackAudioUsage } from '@/utils/audioCache'

// Best ElevenLabs voices for dark fantasy / ancient narration:
// Daniel (onwK4e9ZLuTAKqWW03F9): Deep, ancient, British dark storyteller (verified 200 OK)
// Adam (pNInz6obpgDQGcFmaJgB): Deep, authoritative male voice (verified 200 OK)
// Callum (N2lVS1w4EtoT3dr4eOWO): Whispering, intense character (verified 200 OK)
// George (JBFqnCBsd6RMkjVDRZzb): Deep, warm narrator (verified 200 OK)
export const PRIMARY_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9' // Daniel

export async function getAvailableVoiceId(): Promise<string> {
  return PRIMARY_VOICE_ID
}

// VOICE SETTINGS for ancient/whispering feel
export const UNLOCK_CUE_SETTINGS = {
  stability: 0.85,
  similarity_boost: 0.80,
  style: 0.15,
  use_speaker_boost: true,
}

export const LORE_SETTINGS = {
  stability: 0.45,
  similarity_boost: 0.82,
  style: 0.35,
  use_speaker_boost: true,
}

// TEXT PREPARATION
export function prepareUnlockCueText(cue: string): string {
  return cue
    .replace(/,/g, '... ')
    .replace(/\./g, '.')
    .toUpperCase()
}

export function prepareLoreText(lore: string): string {
  return lore
    .replace(/\. /g, '.  ')
    .replace(/\? /g, '?  ')
    .replace(/! /g, '!  ')
    .replace(/ but /gi, '... but ')
    .replace(/ and yet /gi, '... and yet ')
    .replace(/ until /gi, '... until ')
    .replace(/ never /gi, ' never ')
}

/**
 * Synthesize speech via Next.js /api/tts endpoint (or direct ElevenLabs fallback)
 */
export async function synthesizeSpeech(
  text: string,
  voiceId: string = PRIMARY_VOICE_ID,
  settings: typeof UNLOCK_CUE_SETTINGS = UNLOCK_CUE_SETTINGS
): Promise<ArrayBuffer | null> {
  if (!text) return null

  // Track character usage in local reserve tracker
  trackAudioUsage(text.length)

  // 1. Try local /api/tts Next.js route (handles CORS & server key safely)
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voiceId,
        stability: settings.stability,
        similarity_boost: settings.similarity_boost,
        style: settings.style,
        modelId: 'eleven_turbo_v2_5',
      }),
      signal: AbortSignal.timeout(18000),
    })

    if (res.ok) {
      return await res.arrayBuffer()
    }
  } catch (err) {
    console.warn('/api/tts fetch failed, trying direct ElevenLabs:', err)
  }

  // 2. Direct ElevenLabs API fallback (if client has key)
  const clientKey =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_ELEVENLABS_KEY ||
        process.env.NEXT_PUBLIC_ELEVENLABS_KEYS ||
        process.env.ELEVENLABS_KEY
      : null

  if (!clientKey) return null

  try {
    let directRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': clientKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: settings,
        }),
        signal: AbortSignal.timeout(18000),
      }
    )

    if (!directRes.ok) {
      directRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': clientKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: settings,
          }),
          signal: AbortSignal.timeout(18000),
        }
      )
    }

    if (directRes.ok) {
      return await directRes.arrayBuffer()
    }
  } catch (directErr) {
    console.warn('Direct ElevenLabs synthesis failed:', directErr)
  }

  return null
}

// WAYPOINT NARRATION
export async function generateWaypointAudio(
  unlockCue: string,
  loreFragment: string,
  voiceId: string = PRIMARY_VOICE_ID
): Promise<{
  cueAudio: ArrayBuffer | null
  loreAudio: ArrayBuffer | null
}> {
  const preparedCue = prepareUnlockCueText(unlockCue)
  const preparedLore = prepareLoreText(loreFragment)

  // Generate both in parallel
  const [cueAudio, loreAudio] = await Promise.all([
    synthesizeSpeech(preparedCue, voiceId, UNLOCK_CUE_SETTINGS),
    synthesizeSpeech(preparedLore, voiceId, LORE_SETTINGS),
  ])

  return { cueAudio, loreAudio }
}

// PREFETCH ALL WAYPOINT AUDIO
export async function prefetchQuestAudio(
  waypoints: Array<{
    unlockCue: string
    loreFragment: string
  }>,
  voiceId: string = PRIMARY_VOICE_ID
): Promise<Array<{
  cueAudio: ArrayBuffer | null
  loreAudio: ArrayBuffer | null
}>> {
  const results = []
  for (const waypoint of waypoints) {
    const audio = await generateWaypointAudio(
      waypoint.unlockCue,
      waypoint.loreFragment,
      voiceId
    )
    results.push(audio)
    // Small delay between requests to be respectful of limits
    await new Promise((r) => setTimeout(r, 400))
  }
  return results
}

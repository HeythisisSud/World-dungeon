'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import {
  PRIMARY_VOICE_ID,
  UNLOCK_CUE_SETTINGS,
  LORE_SETTINGS,
  prepareUnlockCueText,
  prepareLoreText,
  synthesizeSpeech,
} from '@/services/elevenlabs'

export type VoiceOption = {
  id: string
  name: string
  title: string
  description: string
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  {
    id: 'onwK4e9ZLuTAKqWW03F9',
    name: 'Daniel',
    title: 'The Ancient Whisperer',
    description: 'Deep, eerie British storyteller with ancient weight.',
  },
  {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    title: 'The Grave Overseer',
    description: 'Deep, gravelly authority speaking from the stone.',
  },
  {
    id: 'nPczCjzI2devNBz1zQrb',
    name: 'Brian',
    title: 'The Wandering Mystic',
    description: 'Resonant, atmospheric dark fantasy narrator.',
  },
  {
    id: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'George',
    title: 'The Old Cartographer',
    description: 'Warm, weathered voice of forgotten roads.',
  },
]

type NarrationState = {
  voiceId: string
  isLoading: boolean
  isSpeaking: boolean
  hasElevenLabs: boolean
  audioBlocked: boolean
  error: string | null
}

// Global browser-level singleton to ensure NEVER more than one voice plays at a time
declare global {
  interface Window {
    __WD_ACTIVE_AUDIO__?: HTMLAudioElement | null
    __WD_ACTIVE_BLOB_URL__?: string | null
  }
}

function stopGlobalAudio() {
  if (typeof window === 'undefined') return
  if (window.__WD_ACTIVE_AUDIO__) {
    try {
      window.__WD_ACTIVE_AUDIO__.pause()
      window.__WD_ACTIVE_AUDIO__.currentTime = 0
      window.__WD_ACTIVE_AUDIO__.src = ''
    } catch {}
    window.__WD_ACTIVE_AUDIO__ = null
  }
  if (window.__WD_ACTIVE_BLOB_URL__) {
    try {
      URL.revokeObjectURL(window.__WD_ACTIVE_BLOB_URL__)
    } catch {}
    window.__WD_ACTIVE_BLOB_URL__ = null
  }
}

export function useVoiceNarration() {
  const [state, setState] = useState<NarrationState>({
    voiceId: PRIMARY_VOICE_ID,
    isLoading: false,
    isSpeaking: false,
    hasElevenLabs: true,
    audioBlocked: false,
    error: null,
  })

  // Monotonically increasing sequence ID to cancel stale async narration chains
  const sequenceIdRef = useRef<number>(0)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const currentBlobUrlRef = useRef<string | null>(null)

  // Clean up any playing audio immediately
  const stop = useCallback(() => {
    // Invalidate any ongoing narration sequence
    sequenceIdRef.current += 1

    // Stop local ref
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause()
        currentAudioRef.current.currentTime = 0
        currentAudioRef.current.src = ''
      } catch {}
      currentAudioRef.current = null
    }
    if (currentBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(currentBlobUrlRef.current)
      } catch {}
      currentBlobUrlRef.current = null
    }

    // Stop global audio singleton
    stopGlobalAudio()

    setState((prev) => ({ ...prev, isSpeaking: false, isLoading: false }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  // Play an ArrayBuffer using HTML5 Audio (Blob URL)
  const playAudioBuffer = useCallback(
    (buffer: ArrayBuffer, expectedSeqId?: number): Promise<void> => {
      return new Promise((resolve, reject) => {
        try {
          // If a sequence ID was provided and it was already invalidated, abort immediately
          if (expectedSeqId !== undefined && sequenceIdRef.current !== expectedSeqId) {
            resolve()
            return
          }

          // Stop any previous audio across the entire application
          stopGlobalAudio()
          if (currentAudioRef.current) {
            try {
              currentAudioRef.current.pause()
              currentAudioRef.current.currentTime = 0
              currentAudioRef.current.src = ''
            } catch {}
            currentAudioRef.current = null
          }
          if (currentBlobUrlRef.current) {
            try {
              URL.revokeObjectURL(currentBlobUrlRef.current)
            } catch {}
            currentBlobUrlRef.current = null
          }

          const blob = new Blob([buffer], { type: 'audio/mpeg' })
          const blobUrl = URL.createObjectURL(blob)
          currentBlobUrlRef.current = blobUrl
          if (typeof window !== 'undefined') {
            window.__WD_ACTIVE_BLOB_URL__ = blobUrl
          }

          const audio = new Audio(blobUrl)
          currentAudioRef.current = audio
          if (typeof window !== 'undefined') {
            window.__WD_ACTIVE_AUDIO__ = audio
          }

          audio.preload = 'auto'
          // Slight deceleration (0.94x) adds ancient, foreboding resonance
          audio.playbackRate = 0.94

          audio.onplay = () => {
            if (expectedSeqId !== undefined && sequenceIdRef.current !== expectedSeqId) {
              audio.pause()
              return
            }
            setState((prev) => ({
              ...prev,
              isSpeaking: true,
              isLoading: false,
              audioBlocked: false,
            }))
          }

          audio.onended = () => {
            if (currentBlobUrlRef.current) {
              URL.revokeObjectURL(currentBlobUrlRef.current)
              currentBlobUrlRef.current = null
            }
            if (typeof window !== 'undefined' && window.__WD_ACTIVE_AUDIO__ === audio) {
              window.__WD_ACTIVE_AUDIO__ = null
              window.__WD_ACTIVE_BLOB_URL__ = null
            }
            currentAudioRef.current = null
            setState((prev) => ({ ...prev, isSpeaking: false }))
            resolve()
          }

          audio.onerror = (err) => {
            console.warn('[ElevenLabs Audio Playback Error]', err)
            if (currentBlobUrlRef.current) {
              URL.revokeObjectURL(currentBlobUrlRef.current)
              currentBlobUrlRef.current = null
            }
            currentAudioRef.current = null
            setState((prev) => ({ ...prev, isSpeaking: false, isLoading: false }))
            reject(err)
          }

          const playPromise = audio.play()
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              console.warn('[Autoplay blocked or playback interrupted]:', err)
              setState((prev) => ({
                ...prev,
                audioBlocked: true,
                isSpeaking: false,
                isLoading: false,
              }))
              reject(err)
            })
          }
        } catch (err) {
          reject(err)
        }
      })
    },
    []
  )

  // Change active voice
  const setVoiceId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, voiceId: id }))
  }, [])

  // Main narration execution: Cue → 1000ms pause → Lore (with strict cancellation check)
  const narrateWaypoint = useCallback(
    async (
      cueAudio: ArrayBuffer | null,
      loreAudio: ArrayBuffer | null,
      fallbackCue?: string,
      fallbackLore?: string,
      targetVoiceId?: string
    ) => {
      // 1. Invalidate any previous sequence and assign new sequence ID
      sequenceIdRef.current += 1
      const thisSeq = sequenceIdRef.current

      // 2. Stop any existing audio immediately
      stopGlobalAudio()
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause()
          currentAudioRef.current.currentTime = 0
        } catch {}
      }

      const activeVoice = targetVoiceId || state.voiceId
      setState((prev) => ({ ...prev, isLoading: true, error: null, audioBlocked: false, isSpeaking: false }))

      try {
        let activeCueBuffer = cueAudio
        let activeLoreBuffer = loreAudio

        // 3. Synthesize cue on demand if pre-generated buffer missing
        if (!activeCueBuffer && fallbackCue) {
          const preparedCue = prepareUnlockCueText(fallbackCue)
          activeCueBuffer = await synthesizeSpeech(
            preparedCue,
            activeVoice,
            UNLOCK_CUE_SETTINGS
          )
        }

        // Check if canceled during synthesis
        if (sequenceIdRef.current !== thisSeq) return

        // 4. Play the unlock cue
        if (activeCueBuffer) {
          try {
            await playAudioBuffer(activeCueBuffer, thisSeq)
          } catch (cuePlayErr) {
            console.warn('Cue audio autoplay prevented by browser:', cuePlayErr)
          }
        }

        // Check if canceled during playback
        if (sequenceIdRef.current !== thisSeq) return

        // 5. Atmospheric silence between cue and lore
        await new Promise((r) => setTimeout(r, 1000))

        // Check if canceled during pause
        if (sequenceIdRef.current !== thisSeq) return

        // 6. Synthesize lore on demand if pre-generated buffer missing
        if (!activeLoreBuffer && fallbackLore) {
          const preparedLore = prepareLoreText(fallbackLore)
          activeLoreBuffer = await synthesizeSpeech(
            preparedLore,
            activeVoice,
            LORE_SETTINGS
          )
        }

        // Check if canceled during lore synthesis
        if (sequenceIdRef.current !== thisSeq) return

        // 7. Play lore fragment
        if (activeLoreBuffer) {
          try {
            await playAudioBuffer(activeLoreBuffer, thisSeq)
          } catch (lorePlayErr) {
            console.warn('Lore audio autoplay prevented by browser:', lorePlayErr)
          }
        }
      } catch (err) {
        if (sequenceIdRef.current === thisSeq) {
          console.error('[Narration Engine Error]:', err)
          setState((prev) => ({
            ...prev,
            error: (err as Error).message || 'Failed to synthesize narration',
          }))
        }
      } finally {
        if (sequenceIdRef.current === thisSeq) {
          setState((prev) => ({ ...prev, isLoading: false }))
        }
      }
    },
    [state.voiceId, playAudioBuffer]
  )

  return {
    voiceId: state.voiceId,
    isLoading: state.isLoading,
    isSpeaking: state.isSpeaking,
    hasElevenLabs: state.hasElevenLabs,
    audioBlocked: state.audioBlocked,
    error: state.error,
    availableVoices: AVAILABLE_VOICES,
    setVoiceId,
    narrateWaypoint,
    playAudioBuffer,
    stop,
  }
}

const STORAGE_KEY = 'wd_elevenlabs_usage'

type AudioUsage = {
  month: string          // e.g. "2026-10"
  charactersUsed: number
  lastUpdated: number
}

export function trackAudioUsage(chars: number): number {
  if (typeof window === 'undefined') return 0
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  let usage: AudioUsage = { month, charactersUsed: 0, lastUpdated: 0 }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      usage = JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Failed to parse audio usage from localStorage', e)
  }

  // Reset if new month
  if (usage.month !== month) {
    usage.month = month
    usage.charactersUsed = 0
  }

  usage.charactersUsed += chars
  usage.lastUpdated = Date.now()

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage))
  } catch (e) {
    console.warn('Failed to save audio usage to localStorage', e)
  }

  return usage.charactersUsed
}

export function getAudioUsagePercent(): number {
  if (typeof window === 'undefined') return 0
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return 0
    const usage: AudioUsage = JSON.parse(stored)
    return Math.min(100, Math.round((usage.charactersUsed / 10000) * 100))
  } catch {
    return 0
  }
}

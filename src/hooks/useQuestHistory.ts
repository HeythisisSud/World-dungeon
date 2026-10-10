'use client'

import { useState, useEffect, useCallback } from 'react'
import { Quest } from '@/types/quest'

export type CompletedQuest = {
  id: string              // timestamp as string
  title: string
  completedAt: number     // Date.now()
  waypointCount: number
  distanceMeters: number
  level: number           // player level at completion
  stampImageUrl: string | null  // best photo from quest (user photo > mapillary > null)
  artifactName: string
  coords: { lat: number; lng: number } // start coords
}

export type WalkStats = {
  distanceMeters: number
  waypointsUnlocked: number
  timeElapsedSeconds?: number
  photosTooken?: number
}

export function useQuestHistory() {
  const [history, setHistory] = useState<CompletedQuest[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('wd_quest_history')
      if (stored) {
        setHistory(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Failed to read quest history from localStorage', e)
    }
  }, [])

  const addCompletedQuest = useCallback((
    quest: Quest,
    stats: WalkStats,
    playerLevel: number,
    mapillaryResults?: Array<{ imageUrl?: string | null }>
  ) => {
    // Find best stamp image
    // Priority: first user photo, then first mapillary
    let stampImageUrl: string | null = null

    for (const waypoint of quest.waypoints) {
      if (waypoint.userPhotoDataUrl) {
        stampImageUrl = waypoint.userPhotoDataUrl
        break
      }
    }
    if (!stampImageUrl && mapillaryResults) {
      const firstMapillary = mapillaryResults.find(
        (r) => r.imageUrl !== null && r.imageUrl !== undefined
      )
      stampImageUrl = firstMapillary?.imageUrl ?? null
    }
    if (!stampImageUrl) {
      for (const waypoint of quest.waypoints) {
        if (waypoint.mapillaryImageUrl) {
          stampImageUrl = waypoint.mapillaryImageUrl
          break
        }
      }
    }

    const startCoords = quest.waypoints[0]?.coords ?? { lat: 28.5934, lng: 77.2090 }

    const completed: CompletedQuest = {
      id: String(Date.now()),
      title: quest.title,
      completedAt: Date.now(),
      waypointCount: stats.waypointsUnlocked,
      distanceMeters: stats.distanceMeters,
      level: playerLevel,
      stampImageUrl,
      artifactName: quest.artifactName,
      coords: {
        lat: startCoords.lat,
        lng: startCoords.lng,
      },
    }

    setHistory((prev) => {
      const updated = [...prev, completed]
      try {
        localStorage.setItem('wd_quest_history', JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to save quest history to localStorage', e)
      }
      return updated
    })
  }, [])

  return { history, addCompletedQuest }
}

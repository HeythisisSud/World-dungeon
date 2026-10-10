'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

export type Position = {
  lat: number
  lng: number
  accuracy: number
  heading: number | null
  speed: number | null
  timestamp: number
}

export type GeolocationState = {
  position: Position | null
  isSimulated: boolean
  error: string | null
  isWatching: boolean
}

export function useGeolocation(targetLat?: number, targetLng?: number) {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    isSimulated: false,
    error: null,
    isWatching: false,
  })

  const watchIdRef = useRef<number | null>(null)
  const simulationRef = useRef<NodeJS.Timeout | null>(null)
  const startPosRef = useRef<{ lat: number; lng: number } | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (simulationRef.current) {
      clearInterval(simulationRef.current)
      simulationRef.current = null
    }
  }, [])

  const startSimulation = useCallback((tLat: number, tLng: number) => {
    // Start 300m away from target
    const offsetLat = tLat + 0.0027
    const offsetLng = tLng + 0.0015
    startPosRef.current = { lat: offsetLat, lng: offsetLng }
    startTimeRef.current = Date.now()
    const DURATION = 45000 // 45 seconds to reach target

    if (simulationRef.current) {
      clearInterval(simulationRef.current)
    }

    simulationRef.current = setInterval(() => {
      const elapsed = Date.now() - (startTimeRef.current!)
      const progress = Math.min(elapsed / DURATION, 1)
      // Ease-in-out so movement feels organic
      const eased =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2

      const currentLat = offsetLat + (tLat - offsetLat) * eased
      const currentLng = offsetLng + (tLng - offsetLng) * eased
      // Add tiny noise so it looks like real GPS
      const noise = () => (Math.random() - 0.5) * 0.00003

      setState(prev => ({
        ...prev,
        position: {
          lat: currentLat + noise(),
          lng: currentLng + noise(),
          accuracy: 8 + Math.random() * 12,
          heading:
            Math.atan2(tLng - currentLng, tLat - currentLat) * (180 / Math.PI),
          speed: 1.2 + Math.random() * 0.8,
          // CRITICAL: always new timestamp so
          // React sees a new object and re-renders
          timestamp: Date.now(),
        },
        isSimulated: true,
        isWatching: true,
      }))

      if (progress >= 1) {
        if (simulationRef.current) {
          clearInterval(simulationRef.current)
          simulationRef.current = null
        }
      }
    }, 1000) // update every 1 second
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation not supported',
        isSimulated: true,
      }))
      if (targetLat && targetLng) {
        startSimulation(targetLat, targetLng)
      }
      return
    }

    let didGetRealPosition = false
    const timeout = setTimeout(() => {
      if (!didGetRealPosition && targetLat && targetLng) {
        startSimulation(targetLat, targetLng)
      }
    }, 8000) // wait 8s for real GPS before simulating

    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        didGetRealPosition = true
        clearTimeout(timeout)
        // Stop simulation if it started
        if (simulationRef.current) {
          clearInterval(simulationRef.current)
          simulationRef.current = null
        }
        // CRITICAL: spread into new object every time
        // so React always detects the state change
        setState({
          position: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp, // always changes
          },
          isSimulated: false,
          error: null,
          isWatching: true,
        })
      },
      err => {
        clearTimeout(timeout)
        if (targetLat && targetLng) {
          startSimulation(targetLat, targetLng)
        }
        setState(prev => ({
          ...prev,
          error: err.message,
          isSimulated: true,
        }))
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0, // CRITICAL: never use cached position
        timeout: 10000,
      }
    )

    return () => {
      clearTimeout(timeout)
      stopWatching()
    }
  }, [targetLat, targetLng, startSimulation, stopWatching])

  return state
}

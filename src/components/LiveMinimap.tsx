'use client'

import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Waypoint } from '@/types/quest'

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']

// Component to dynamically pan, zoom, fit bounds, and handle drag interactions
function MapController({
  userCenter,
  targetCoords,
  isUserPanning,
  fitTrigger,
}: {
  userCenter: [number, number]
  targetCoords?: [number, number]
  isUserPanning: boolean
  fitTrigger: number
}) {
  const map = useMap()

  // Auto-fit both player and destination into the frame on first load or when "FIT" button is pressed
  useEffect(() => {
    if (targetCoords) {
      const bounds = L.latLngBounds([userCenter, targetCoords])
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 17,
        animate: true,
      })
    } else {
      map.setView(userCenter, 16, { animate: true })
    }
  }, [fitTrigger, map])

  // Follow player position smoothly when NOT manually dragging
  useEffect(() => {
    if (!isUserPanning) {
      map.panTo(userCenter, { animate: true, duration: 1 })
    }
  }, [userCenter, isUserPanning, map])

  return null
}

function createUserIcon(heading: number | null) {
  const rotation = heading ?? 0
  const headingArrow = heading !== null
    ? `<div style="position: absolute; top: -6px; transform: rotate(${rotation}deg); color: #c9a84c; font-size: 10px; font-weight: bold; line-height: 1;">▲</div>`
    : ''

  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
        <div class="animate-player-pulse" style="position: absolute; width: 20px; height: 20px; border-radius: 50%; background: rgba(201,168,76,0.3);"></div>
        <div style="position: absolute; width: 12px; height: 12px; border-radius: 50%; border: 1px solid rgba(201,168,76,0.6); display: flex; align-items: center; justify-content: center;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #c9a84c;"></div>
        </div>
        ${headingArrow}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function createWaypointIcon(
  index: number,
  isCurrent: boolean,
  isUnlocked: boolean
) {
  const roman = ROMAN_NUMERALS[index] || `${index + 1}`

  if (isCurrent) {
    return L.divIcon({
      className: 'custom-wp-current',
      html: `
        <div style="
          position: relative;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div class="animate-rotate-border" style="
            position: absolute;
            inset: 0;
            border-radius: 50%;
            border: 1.5px dashed #c9a84c;
            box-shadow: 0 0 14px rgba(201,168,76,0.6);
          "></div>
          <div style="
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: rgba(10,10,15,0.9);
            border: 1px solid #c9a84c;
            color: #f0d060;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--font-cinzel), serif;
            font-size: 12px;
            font-weight: 900;
            text-shadow: 0 0 6px rgba(201,168,76,0.8);
          ">
            ${roman}
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    })
  }

  if (isUnlocked) {
    return L.divIcon({
      className: 'custom-wp-unlocked',
      html: `
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid #c9a84c;
          background: rgba(201,168,76,0.15);
          color: #c9a84c;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-cinzel), serif;
          font-size: 11px;
          font-weight: bold;
          box-shadow: 0 0 8px rgba(122,154,76,0.4);
        ">
          ${roman}
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })
  }

  // Locked
  return L.divIcon({
    className: 'custom-wp-locked',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 1px solid rgba(201,168,76,0.4);
        background: rgba(10,10,15,0.8);
        color: rgba(201,168,76,0.4);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: var(--font-cinzel), serif;
        font-size: 10px;
        font-weight: bold;
      ">
        <span>${roman}</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

export type LiveMinimapProps = {
  userLat: number
  userLng: number
  userHeading?: number | null
  waypoints: Waypoint[]
  currentWaypointIndex: number
  unlockedWaypoints: number[]
  gpxTrace?: Array<{ lat: number; lng: number; timestamp: number }>
  className?: string
}

export function LiveMinimap({
  userLat,
  userLng,
  userHeading = null,
  waypoints,
  currentWaypointIndex,
  unlockedWaypoints,
  gpxTrace = [],
  className = '',
}: LiveMinimapProps) {
  const [isUserPanning, setIsUserPanning] = useState(false)
  const [fitTrigger, setFitTrigger] = useState(0)
  const mapInstanceRef = useRef<L.Map | null>(null)

  if (typeof window === 'undefined') return null

  const userCenter: [number, number] = [userLat, userLng]

  const traceCoords: [number, number][] = gpxTrace.map(p => [p.lat, p.lng])
  if (traceCoords.length === 0 || traceCoords[traceCoords.length - 1][0] !== userLat) {
    traceCoords.push(userCenter)
  }

  const currentWp = waypoints[currentWaypointIndex]
  const targetCoords: [number, number] | undefined = currentWp
    ? [currentWp.coords.lat, currentWp.coords.lng]
    : undefined

  const questLineCoords: [number, number][] = targetCoords
    ? [userCenter, targetCoords]
    : []

  // Zoom handlers
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn()
    }
  }

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut()
    }
  }

  // Auto-fit both player and waypoint inside frame
  const handleFitBounds = () => {
    setIsUserPanning(false)
    setFitTrigger(prev => prev + 1)
  }

  // Re-center on user
  const handleRecenter = () => {
    setIsUserPanning(false)
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(userCenter, 16, { animate: true })
    }
  }

  return (
    <div
      className={`relative w-full h-[280px] overflow-hidden bg-dungeon-bg ${className}
      before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-10 before:bg-gradient-to-b before:from-dungeon-bg before:to-transparent before:z-[450] before:pointer-events-none
      after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-10 after:bg-gradient-to-t after:from-dungeon-bg after:to-transparent after:z-[450] after:pointer-events-none`}
    >
      {/* DUNGEON MAP CONTROLS OVERLAY */}
      <div className="absolute top-3 right-3 z-[500] flex flex-col space-y-1.5 shadow-[0_0_15px_rgba(0,0,0,0.8)]">
        {/* Zoom In */}
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-7 h-7 bg-[#0a0a0f]/90 border border-dungeon-gold/60 text-dungeon-gold hover:bg-dungeon-gold hover:text-black font-cinzel text-sm font-bold flex items-center justify-center transition-colors active:scale-95"
          title="Zoom In"
        >
          +
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-7 h-7 bg-[#0a0a0f]/90 border border-dungeon-gold/60 text-dungeon-gold hover:bg-dungeon-gold hover:text-black font-cinzel text-sm font-bold flex items-center justify-center transition-colors active:scale-95"
          title="Zoom Out"
        >
          −
        </button>

        {/* Enclose Both / Fit Bounds */}
        <button
          type="button"
          onClick={handleFitBounds}
          className="w-7 h-7 bg-[#0a0a0f]/90 border border-dungeon-gold/60 text-dungeon-gold hover:bg-dungeon-gold hover:text-black font-cinzel text-[9px] font-bold flex items-center justify-center transition-colors active:scale-95"
          title="Enclose Destination & Player in View"
        >
          ⛶
        </button>

        {/* Recenter on Player */}
        <button
          type="button"
          onClick={handleRecenter}
          className="w-7 h-7 bg-[#0a0a0f]/90 border border-dungeon-gold/60 text-dungeon-gold hover:bg-dungeon-gold hover:text-black font-cinzel text-[11px] font-bold flex items-center justify-center transition-colors active:scale-95"
          title="Recenter on Player"
        >
          ◎
        </button>
      </div>

      {/* Manual Dragging Active Indicator */}
      {isUserPanning && (
        <button
          type="button"
          onClick={handleRecenter}
          className="absolute bottom-3 left-3 z-[500] px-2.5 py-1 bg-[#0a0a0f]/90 border border-dungeon-gold/50 text-dungeon-gold/90 font-cinzel text-[9px] tracking-wider uppercase hover:border-dungeon-gold shadow-md"
        >
          ◎ RECENTER PLAYER
        </button>
      )}

      <MapContainer
        center={userCenter}
        zoom={16}
        zoomControl={false}
        attributionControl={false}
        dragging={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        ref={(map) => {
          if (map) {
            mapInstanceRef.current = map
            map.on('dragstart', () => setIsUserPanning(true))
          }
        }}
      >
        <MapController
          userCenter={userCenter}
          targetCoords={targetCoords}
          isUserPanning={isUserPanning}
          fitTrigger={fitTrigger}
        />

        {/* 100% Free OpenStreetMap tile server (No API key required) */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          subdomains={['a', 'b', 'c']}
          maxZoom={19}
        />

        {/* GPS trace line: player's walked path so far */}
        {traceCoords.length > 1 && (
          <Polyline
            positions={traceCoords}
            pathOptions={{
              color: '#c9a84c',
              weight: 2,
              opacity: 0.6,
              dashArray: '4, 4',
            }}
          />
        )}

        {/* Line to current waypoint: direction guide */}
        {questLineCoords.length === 2 && (
          <Polyline
            positions={questLineCoords}
            pathOptions={{
              color: '#c9a84c',
              weight: 1.5,
              opacity: 0.45,
              dashArray: '8, 8',
            }}
          />
        )}

        {/* Waypoints */}
        {waypoints.map((wp, i) => (
          <Marker
            key={`wp-${wp.sequence}-${i}`}
            position={[wp.coords.lat, wp.coords.lng]}
            icon={createWaypointIcon(
              i,
              i === currentWaypointIndex,
              unlockedWaypoints.includes(i)
            )}
          />
        ))}

        {/* User player dot marker */}
        <Marker position={userCenter} icon={createUserIcon(userHeading)} />
      </MapContainer>
    </div>
  )
}
export default LiveMinimap

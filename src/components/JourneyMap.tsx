'use client'

import React, { useEffect, useRef, useState } from 'react'
import { CompletedQuest } from '@/hooks/useQuestHistory'
import { QuestStamp } from '@/components/QuestStamp'
import { GeneratedLocationArt } from '@/components/GeneratedLocationArt'

export type JourneyMapProps = {
  history: CompletedQuest[]
  currentLevel: number
  totalLevelsToShow?: number
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  const day = d.getDate()
  const months = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ]
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  return `UNCOVERED ${day} ${month} ${year}`
}

function generateRoadPoints(
  totalNodes: number,
  svgWidth: number,
  svgHeight: number
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = []
  const startX = svgWidth / 2
  const startY = svgHeight - 80
  const verticalSpacing = 110
  const horizontalSwing = Math.min(svgWidth * 0.28, 120)

  for (let i = 0; i < totalNodes; i++) {
    const y = startY - i * verticalSpacing
    const x = startX + Math.sin(i * 0.9 + 1.2) * horizontalSwing
    points.push({ x, y })
  }
  return points
}

export const JourneyMap: React.FC<JourneyMapProps> = ({
  history,
  currentLevel,
  totalLevelsToShow,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const currentLevelNodeRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState<number>(380)
  const [selectedQuest, setSelectedQuest] = useState<CompletedQuest | null>(null)
  const [selectedQuestNumber, setSelectedQuestNumber] = useState<number>(1)

  const totalNodes = totalLevelsToShow ?? Math.max(history.length + 3, 5)
  const svgHeight = totalNodes * 110 + 160

  // Track container width for responsive road generation
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth || window.innerWidth || 380)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Auto-scroll to current level node on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentLevelNodeRef.current) {
        currentLevelNodeRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [])

  const roadPoints = generateRoadPoints(totalNodes, containerWidth, svgHeight)
  const pointsString = roadPoints.map((p) => `${p.x},${p.y}`).join(' ')

  // Completed path slice
  const completedCount = history.length
  const completedPoints = roadPoints.slice(0, Math.max(completedCount, 1))
  const completedPointsString = completedPoints.map((p) => `${p.x},${p.y}`).join(' ')

  // Midpoints for decorative trail markers
  const midpoints: Array<{ x: number; y: number; index: number }> = []
  for (let i = 0; i < roadPoints.length - 1; i++) {
    midpoints.push({
      x: (roadPoints[i].x + roadPoints[i + 1].x) / 2,
      y: (roadPoints[i].y + roadPoints[i + 1].y) / 2,
      index: i,
    })
  }

  // Next quest marker index (the first locked node)
  const nextQuestIndex = history.length

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-dungeon-bg select-none"
      style={{ minHeight: `${svgHeight}px` }}
    >
      {/* Subtle Map Grid Lines Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(201,168,76,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* SVG ROAD LAYERS */}
      <svg
        width={containerWidth}
        height={svgHeight}
        viewBox={`0 0 ${containerWidth} ${svgHeight}`}
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        {/* Layer 1: Road Shadow (Bottom) */}
        <polyline
          points={pointsString}
          fill="none"
          stroke="rgba(0, 0, 0, 0.6)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(0, 2)"
        />

        {/* Layer 2: Road Surface (Dirt Road / Dungeon-Ash) */}
        <polyline
          points={pointsString}
          fill="none"
          stroke="#3d2b1f"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Layer 3: Completed Walked Path Highlight */}
        {completedCount > 0 && (
          <polyline
            points={completedPointsString}
            fill="none"
            stroke="rgba(201, 168, 76, 0.25)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Layer 4: Road Center-Line Dashes */}
        <polyline
          points={pointsString}
          fill="none"
          stroke="rgba(201, 168, 76, 0.35)"
          strokeWidth="2"
          strokeDasharray="8 12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Decorative Trail Diamonds between nodes */}
        {midpoints.map((mid) => (
          <g key={`mid-${mid.index}`} transform={`translate(${mid.x}, ${mid.y})`}>
            <polygon
              points="0,-3 3,0 0,3 -3,0"
              fill={mid.index < completedCount ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.15)'}
            />
          </g>
        ))}
      </svg>

      {/* STAMP NODES AND ACTIVE INDICATORS */}
      {roadPoints.map((pt, idx) => {
        const questData = idx < history.length ? history[idx] : null
        const isLocked = idx >= history.length
        const questNum = idx + 1
        const isCurrent = idx === Math.max(0, history.length - 1)
        const isNextQuestNode = idx === nextQuestIndex

        return (
          <div
            key={`node-${idx}`}
            ref={isCurrent ? currentLevelNodeRef : undefined}
            className="absolute z-10 flex flex-col items-center"
            style={{
              left: `${pt.x}px`,
              top: `${pt.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* CURRENT LEVEL GLOWING RING BEHIND STAMP */}
            {isCurrent && history.length > 0 && (
              <div
                className="absolute w-[88px] h-[88px] rounded-full border-2 border-dungeon-gold animate-pulse pointer-events-none -z-10"
                style={{
                  boxShadow: '0 0 20px rgba(201,168,76,0.35)',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            )}

            {/* NEXT QUEST EMBER MARKER (First locked node) */}
            {isNextQuestNode && (
              <div className="absolute -top-7 flex flex-col items-center pointer-events-none">
                <span className="text-dungeon-ember text-sm animate-pulse">◆</span>
                <span className="font-cinzel text-[8px] font-bold text-dungeon-ember tracking-[0.3em] uppercase whitespace-nowrap animate-pulse">
                  NEXT QUEST
                </span>
              </div>
            )}

            {/* THE QUEST STAMP */}
            <QuestStamp
              quest={questData}
              questNumber={questNum}
              isCurrentLevel={isCurrent}
              isLocked={isLocked}
              onClick={() => {
                if (questData) {
                  setSelectedQuest(questData)
                  setSelectedQuestNumber(questNum)
                }
              }}
            />
          </div>
        )
      })}

      {/* BOTTOM SHEET DETAIL MODAL */}
      {selectedQuest && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          {/* Backdrop click dismiss */}
          <div
            className="absolute inset-0"
            onClick={() => setSelectedQuest(null)}
          />

          {/* Bottom Sheet Sheet Container */}
          <div className="relative z-10 w-full max-w-lg bg-[#0a0a0f] border-t border-dungeon-gold/30 rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col text-dungeon-parchment animate-slide-up">
            {/* Torn paper / decorative top border */}
            <div className="w-full h-2 bg-gradient-to-r from-transparent via-dungeon-gold/40 to-transparent" />

            {/* Top Photo Section (40% height / 180px) */}
            <div className="relative w-full h-[180px] bg-dungeon-ash/40 overflow-hidden">
              {selectedQuest.stampImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedQuest.stampImageUrl}
                  alt={selectedQuest.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <GeneratedLocationArt
                  lat={selectedQuest.coords.lat}
                  lng={selectedQuest.coords.lng}
                  placeName={selectedQuest.title}
                  placeType="SANCTUM"
                  className="w-full h-full"
                />
              )}

              {/* Bottom fade to modal background */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent pointer-events-none" />

              {/* Quest number badge */}
              <div className="absolute top-3 left-3 bg-dungeon-bg/85 border border-dungeon-gold/60 px-2.5 py-1 font-cinzel text-[10px] text-dungeon-gold font-bold tracking-widest uppercase">
                QUEST #{selectedQuestNumber}
              </div>
            </div>

            {/* Middle Section: Title, Artifact, Stats */}
            <div className="p-5 flex flex-col items-center text-center space-y-3">
              <h2 className="font-cinzel text-lg sm:text-xl font-bold text-dungeon-gold tracking-wider leading-snug">
                {selectedQuest.title}
              </h2>

              <p className="font-lore italic text-sm text-dungeon-parchment/75">
                ✦ {selectedQuest.artifactName} ✦
              </p>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <div className="border border-dungeon-gold/30 bg-dungeon-bg/80 px-2.5 py-1 font-cinzel text-[9px] text-dungeon-gold tracking-widest uppercase">
                  ◆ {selectedQuest.waypointCount} WAYPOINTS
                </div>
                <div className="border border-dungeon-gold/30 bg-dungeon-bg/80 px-2.5 py-1 font-cinzel text-[9px] text-dungeon-gold tracking-widest uppercase">
                  ⚔ {(selectedQuest.distanceMeters / 1000).toFixed(1)}km
                </div>
                <div className="border border-dungeon-gold/30 bg-dungeon-bg/80 px-2.5 py-1 font-cinzel text-[9px] text-dungeon-gold tracking-widest uppercase">
                  ✦ LEVEL {selectedQuest.level}
                </div>
              </div>

              {/* Uncovered Date */}
              <span className="font-cinzel text-[9px] text-dungeon-gold/40 tracking-[0.2em] uppercase pt-1">
                {formatDate(selectedQuest.completedAt)}
              </span>
            </div>

            {/* Close Button */}
            <div className="p-4 pt-1 pb-6 w-full">
              <button
                onClick={() => setSelectedQuest(null)}
                type="button"
                className="w-full py-3.5 border border-dungeon-gold/50 bg-dungeon-gold/10 hover:bg-dungeon-gold hover:text-dungeon-bg font-cinzel text-xs font-bold tracking-[0.25em] text-dungeon-gold transition-colors"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

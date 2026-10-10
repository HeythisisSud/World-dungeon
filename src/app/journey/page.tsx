'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useQuest } from '@/context/QuestContext'
import { useQuestHistory } from '@/hooks/useQuestHistory'
import { JourneyMap } from '@/components/JourneyMap'

export default function JourneyPage() {
  const router = useRouter()
  const { playerLevel } = useQuest()
  const { history } = useQuestHistory()

  return (
    <div className="relative w-full min-h-screen bg-dungeon-bg text-dungeon-parchment overflow-hidden select-none">
      {/* FIXED TOP HEADER */}
      <header className="fixed top-0 inset-x-0 z-30 h-14 bg-gradient-to-b from-[#0a0a0f] via-[#0a0a0f]/90 to-transparent flex items-center justify-between px-4 sm:px-6">
        {/* Left: Back Button */}
        <button
          onClick={() => router.back()}
          type="button"
          className="flex items-center space-x-1.5 font-cinzel text-xs font-bold text-dungeon-gold/80 hover:text-dungeon-gold transition-colors py-1 px-2 border border-dungeon-gold/20 bg-dungeon-bg/40 active:scale-95"
        >
          <span>←</span>
          <span>BACK</span>
        </button>

        {/* Center: Title */}
        <h1 className="font-cinzel text-sm sm:text-base font-bold text-dungeon-gold tracking-[0.3em] uppercase">
          YOUR JOURNEY
        </h1>

        {/* Right: Player Level Badge */}
        <div className="border border-dungeon-gold/40 bg-dungeon-bg/80 px-2.5 py-1 font-cinzel text-xs font-bold text-dungeon-gold tracking-widest">
          LVL {playerLevel.level}
        </div>
      </header>

      {/* SCROLLABLE MAP BODY / EMPTY STATE */}
      <main className="w-full h-screen overflow-y-auto pt-14 pb-20">
        {history.length > 0 ? (
          <JourneyMap history={history} currentLevel={playerLevel.level} />
        ) : (
          /* EMPTY STATE */
          <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center p-6 text-center space-y-6">
            {/* Giant Faded Diamond */}
            <span className="font-cinzel text-5xl text-dungeon-gold/20 select-none animate-pulse">
              ◆
            </span>

            <div className="space-y-2 max-w-xs">
              <h2 className="font-cinzel text-lg font-bold text-dungeon-gold tracking-[0.2em] uppercase">
                YOUR PATH IS UNWRITTEN
              </h2>
              <p className="font-lore italic text-sm text-dungeon-parchment/65">
                Complete your first quest to begin your journey across the realm.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-3 pt-4">
              <span className="font-cinzel text-[10px] text-dungeon-gold/40 tracking-[0.25em] uppercase">
                ↓ BEGIN BELOW
              </span>

              {/* Hexagonal / Styled Button */}
              <button
                onClick={() => router.push('/')}
                type="button"
                className="relative py-3.5 px-6 border-2 border-dungeon-gold bg-dungeon-gold/15 hover:bg-dungeon-gold hover:text-dungeon-bg font-cinzel text-xs font-bold tracking-[0.3em] text-dungeon-gold transition-all active:scale-95 shadow-lg"
              >
                START YOUR FIRST QUEST
              </button>
            </div>
          </div>
        )}
      </main>

      {/* FIXED BOTTOM FOOTER */}
      {history.length > 0 && (
        <footer className="fixed bottom-0 inset-x-0 z-30 h-16 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/90 to-transparent flex items-center justify-center px-4">
          <button
            onClick={() => router.push('/')}
            type="button"
            className="py-2.5 px-7 border border-dungeon-gold bg-dungeon-bg/90 hover:bg-dungeon-gold hover:text-dungeon-bg font-cinzel text-xs font-bold tracking-[0.3em] text-dungeon-gold transition-all active:scale-95 shadow-lg"
          >
            START NEW QUEST
          </button>
        </footer>
      )}
    </div>
  )
}

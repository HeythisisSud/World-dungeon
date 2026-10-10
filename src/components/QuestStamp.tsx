'use client'

import React from 'react'
import { CompletedQuest } from '@/hooks/useQuestHistory'

export type StampProps = {
  quest: CompletedQuest | null // null = locked future
  questNumber: number
  isCurrentLevel: boolean
  isLocked: boolean
  onClick: () => void
}

const ROMAN_NUMERALS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
]

function getRoman(num: number): string {
  if (num >= 1 && num <= ROMAN_NUMERALS.length) {
    return ROMAN_NUMERALS[num - 1]
  }
  return String(num)
}

export const QuestStamp: React.FC<StampProps> = ({
  quest,
  questNumber,
  isCurrentLevel,
  isLocked,
  onClick,
}) => {
  const roman = getRoman(questNumber)

  if (isLocked || !quest) {
    return (
      <div className="flex flex-col items-center select-none opacity-80 cursor-not-allowed">
        {/* LOCKED STAMP CIRCLE */}
        <div
          className="w-[72px] h-[72px] rounded-full border border-dungeon-gold/20 bg-dungeon-bg/60 flex flex-col items-center justify-center relative shadow-inner"
          style={{ backdropFilter: 'blur(2px)' }}
        >
          {/* Roman Numeral */}
          <span className="font-cinzel text-[18px] font-bold text-dungeon-gold/30 leading-none">
            {roman}
          </span>

          {/* Small Lock Icon */}
          <svg
            className="w-3 h-3 mt-1 text-dungeon-gold/20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
          </svg>
        </div>
      </div>
    )
  }

  // COMPLETED STAMP
  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform select-none"
    >
      {/* 72px Circle with Gold Border & Aged Effect */}
      <div
        className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center overflow-hidden"
        style={{
          filter: 'sepia(0.3) contrast(1.1) drop-shadow(0 0 6px rgba(201,168,76,0.4))',
        }}
      >
        {/* Background Image / Fill */}
        {quest.stampImageUrl ? (
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url("${quest.stampImageUrl}")`,
            }}
          >
            {/* Dark overlay & radial vignette */}
            <div className="absolute inset-0 bg-[#0a0a0f]/35" />
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle, rgba(10,10,15,0) 0%, rgba(10,10,15,0.65) 100%)',
              }}
            />
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full bg-dungeon-ash flex items-center justify-center">
            <span className="font-cinzel text-[20px] font-bold text-dungeon-gold">
              {questNumber}
            </span>
          </div>
        )}

        {/* Outer Ring */}
        <div
          className={`absolute inset-0 rounded-full border-[3px] border-dungeon-gold pointer-events-none ${
            isCurrentLevel ? 'border-dashed animate-spin-cw' : ''
          }`}
          style={{
            animationDuration: isCurrentLevel ? '4s' : undefined,
          }}
        />

        {/* Small gold diamond in center if photo is present */}
        {quest.stampImageUrl && (
          <div className="relative z-10 w-5 h-5 rounded-full bg-dungeon-bg/70 border border-dungeon-gold/60 flex items-center justify-center">
            <span className="font-cinzel text-[10px] font-bold text-dungeon-gold">
              {questNumber}
            </span>
          </div>
        )}
      </div>

      {/* Quest Number Label (6px gap below) */}
      <span className="mt-1.5 font-cinzel text-[10px] tracking-[0.15em] text-dungeon-gold/70 font-semibold uppercase">
        QUEST {questNumber}
      </span>
    </div>
  )
}

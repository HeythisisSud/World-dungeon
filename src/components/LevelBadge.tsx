"use client";

import React from "react";

interface LevelBadgeProps {
  level: number;
  title: string;
  xp: number;
  xpToNext: number;
  isLevelUp?: boolean;
  className?: string;
}

export function LevelBadge({
  level,
  title,
  xp,
  xpToNext,
  isLevelUp = false,
  className = "",
}: LevelBadgeProps) {
  const percentage = Math.min(100, Math.round((xp / Math.max(1, xpToNext)) * 100));

  return (
    <div className={`relative inline-block ${className}`}>
      {/* LEVEL UP FLOATING HEADER */}
      {isLevelUp && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 animate-float-xp font-cinzel text-xs font-bold tracking-[0.3em] text-dungeon-gold whitespace-nowrap">
          +LEVEL UP!
        </div>
      )}

      {/* COMPACT BADGE CONTAINER */}
      <div
        className={`border border-dungeon-gold/60 bg-dungeon-bg p-2.5 transition-all ${
          isLevelUp ? "animate-levelup-flash border-dungeon-ember" : ""
        }`}
      >
        <div className="flex items-center space-x-2 text-xs font-cinzel">
          <span className="text-dungeon-gold font-bold">◆ Level {level}</span>
          <span className="text-dungeon-gold/60">—</span>
          <span className="font-lore italic text-dungeon-parchment text-sm">{title}</span>
        </div>

        {/* THIN XP PROGRESS BAR */}
        <div className="mt-1.5 space-y-0.5">
          <div className="h-[2px] w-full bg-dungeon-ash overflow-hidden">
            <div
              className="h-full bg-dungeon-gold transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[9px] font-cinzel text-dungeon-parchment/60">
            <span>XP PROGRESS</span>
            <span>
              {xp} / {xpToNext} XP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

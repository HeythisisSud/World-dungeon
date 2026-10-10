"use client";

import React, { useId } from "react";

interface BurntManuscriptProps {
  segments: string[];
  revealedCount: number;
  className?: string;
}

export function BurntManuscript({ segments, revealedCount, className = "" }: BurntManuscriptProps) {
  const filterId = useId();
  const totalSegments = segments.length;
  const clampedRevealed = Math.min(totalSegments, Math.max(0, revealedCount));
  const percentage = Math.round((clampedRevealed / Math.max(1, totalSegments)) * 100);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* STORY UNCOVERED PROGRESS BAR */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-cinzel font-bold tracking-[0.3em] text-dungeon-gold">
          <span>STORY UNCOVERED</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-[3px] w-full bg-dungeon-ash overflow-hidden">
          <div
            className="h-full bg-dungeon-gold transition-all duration-700 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* MANUSCRIPT SCROLL CONTAINER */}
      <div className="relative border border-dungeon-gold/40 bg-dungeon-bg p-5 font-lore italic text-dungeon-parchment leading-relaxed border-radius-0">
        <svg className="absolute w-0 h-0" aria-hidden="true">
          <defs>
            <filter id={`burn-filter-${filterId}`} x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>

        <div className="space-y-6">
          {segments.map((segmentText, idx) => {
            const isUnlocked = idx < clampedRevealed;

            return (
              <div key={idx} className="relative overflow-hidden transition-all duration-500">
                {isUnlocked ? (
                  <div className="animate-fade-in space-y-2">
                    <p className="text-[15px] sm:text-base leading-relaxed text-dungeon-parchment">
                      {segmentText}
                    </p>
                  </div>
                ) : (
                  <div className="relative p-4 bg-dungeon-burn border border-dungeon-ash/50 overflow-hidden select-none">
                    {/* SVG Burnt Overlay Texture */}
                    <div
                      className="absolute inset-0 bg-dungeon-burn"
                      style={{
                        filter: `url(#burn-filter-${filterId})`,
                        boxShadow: "inset 0 0 12px #ff4500",
                      }}
                    />

                    {/* Ragged Burnt Edge Glow */}
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-dungeon-ember shadow-[0_0_8px_#ff4500]" />
                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-dungeon-ember shadow-[0_0_8px_#ff4500]" />

                    {/* Hidden text placeholder */}
                    <p className="opacity-0 text-[15px] sm:text-base text-transparent pointer-events-none select-none">
                      {segmentText}
                    </p>

                    {/* Redacted Label Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-cinzel text-xs tracking-[0.25em] text-dungeon-gold/60 uppercase">
                        [ BURNT MANUSCRIPT — UNLOCK WAYPOINT {idx} ]
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

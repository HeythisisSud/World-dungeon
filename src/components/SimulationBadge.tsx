"use client";

import React from "react";

interface SimulationBadgeProps {
  isSimulated: boolean;
  className?: string;
}

export function SimulationBadge({ isSimulated, className = "" }: SimulationBadgeProps) {
  if (!isSimulated) return null;

  return (
    <div className={`inline-flex items-center space-x-1 border border-red-800 bg-red-950/80 px-2 py-0.5 text-[9px] font-cinzel tracking-widest text-red-400 select-none ${className}`}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      <span>SIMULATION MODE</span>
    </div>
  );
}

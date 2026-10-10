"use client";

import React from "react";

interface XPFlashProps {
  amount: number | null;
  className?: string;
}

export function XPFlash({ amount, className = "" }: XPFlashProps) {
  if (!amount) return null;

  return (
    <div className={`fixed top-16 right-6 z-50 pointer-events-none ${className}`}>
      <div className="animate-float-xp font-cinzel font-bold text-lg text-dungeon-ember tracking-widest drop-shadow-[0_0_8px_#ff4500]">
        +{amount} XP
      </div>
    </div>
  );
}

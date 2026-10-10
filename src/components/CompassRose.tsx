"use client";

import React from "react";

interface CompassRoseProps {
  className?: string;
  size?: number;
  isRotating?: boolean;
}

export function CompassRose({ className = "", size = 200, isRotating = false }: CompassRoseProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={`${isRotating ? "animate-spin-slow" : ""} ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Ring */}
      <circle cx="100" cy="100" r="92" stroke="#c9a84c" strokeWidth="2" strokeOpacity="0.9" />
      <circle cx="100" cy="100" r="86" stroke="#c9a84c" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.6" />
      
      {/* Degree ticks */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
        <line
          key={deg}
          x1="100"
          y1="10"
          x2="100"
          y2="14"
          stroke="#c9a84c"
          strokeWidth="1.5"
          transform={`rotate(${deg} 100 100)`}
        />
      ))}

      {/* Cardinal Letters (N, E, S, W) */}
      <text x="100" y="26" textAnchor="middle" fill="#c9a84c" fontSize="12" fontFamily="var(--font-cinzel), serif" fontWeight="bold">
        N
      </text>
      <text x="178" y="104" textAnchor="middle" fill="#c9a84c" fontSize="12" fontFamily="var(--font-cinzel), serif" fontWeight="bold">
        E
      </text>
      <text x="100" y="182" textAnchor="middle" fill="#c9a84c" fontSize="12" fontFamily="var(--font-cinzel), serif" fontWeight="bold">
        S
      </text>
      <text x="22" y="104" textAnchor="middle" fill="#c9a84c" fontSize="12" fontFamily="var(--font-cinzel), serif" fontWeight="bold">
        W
      </text>

      {/* Diagonal Small Points */}
      <polygon points="100,100 135,65 100,88" fill="#3d2b1f" stroke="#c9a84c" strokeWidth="0.5" />
      <polygon points="100,100 135,65 112,100" fill="#1a0a00" stroke="#c9a84c" strokeWidth="0.5" />

      <polygon points="100,100 135,135 112,100" fill="#3d2b1f" stroke="#c9a84c" strokeWidth="0.5" />
      <polygon points="100,100 135,135 100,112" fill="#1a0a00" stroke="#c9a84c" strokeWidth="0.5" />

      <polygon points="100,100 65,135 100,112" fill="#3d2b1f" stroke="#c9a84c" strokeWidth="0.5" />
      <polygon points="100,100 65,135 88,100" fill="#1a0a00" stroke="#c9a84c" strokeWidth="0.5" />

      <polygon points="100,100 65,65 88,100" fill="#3d2b1f" stroke="#c9a84c" strokeWidth="0.5" />
      <polygon points="100,100 65,65 100,88" fill="#1a0a00" stroke="#c9a84c" strokeWidth="0.5" />

      {/* Main Points (North, South, East, West) */}
      {/* North */}
      <polygon points="100,32 108,92 100,100" fill="#c9a84c" />
      <polygon points="100,32 92,92 100,100" fill="#3d2b1f" />

      {/* South */}
      <polygon points="100,168 92,108 100,100" fill="#c9a84c" />
      <polygon points="100,168 108,108 100,100" fill="#3d2b1f" />

      {/* East */}
      <polygon points="168,100 108,108 100,100" fill="#c9a84c" />
      <polygon points="168,100 108,92 100,100" fill="#3d2b1f" />

      {/* West */}
      <polygon points="32,100 92,92 100,100" fill="#c9a84c" />
      <polygon points="32,100 92,108 100,100" fill="#3d2b1f" />

      {/* Center Rose Ring */}
      <circle cx="100" cy="100" r="10" fill="#0a0a0f" stroke="#c9a84c" strokeWidth="2" />
      <circle cx="100" cy="100" r="4" fill="#c9a84c" />
    </svg>
  );
}

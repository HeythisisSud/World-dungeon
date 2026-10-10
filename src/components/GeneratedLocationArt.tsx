"use client";

import React, { useId, useMemo } from "react";

interface GeneratedLocationArtProps {
  lat: number;
  lng: number;
  placeName: string;
  placeType?: string;
  className?: string;
}

/**
 * Deterministic PRNG from a string seed.
 */
function createPseudoRandom(seed: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Procedural Dungeon-Map Illustration generated deterministically
 * from GPS coordinates and location name.
 * Used when Mapillary has no street-level coverage in the area.
 */
export function GeneratedLocationArt({
  lat,
  lng,
  placeName,
  placeType = "SANCTUM",
  className = "",
}: GeneratedLocationArtProps) {
  const filterId = useId().replace(/:/g, "_");
  const seed = `${lat.toFixed(4)}_${lng.toFixed(4)}_${placeName}`;

  const elements = useMemo(() => {
    const rng = createPseudoRandom(seed);

    // Generate concentric runic rings
    const rings = [35, 65, 95, 125].map((r) => ({
      r,
      strokeDasharray: `${Math.floor(rng() * 12) + 2} ${Math.floor(rng() * 8) + 4}`,
      opacity: 0.25 + rng() * 0.4,
    }));

    // Generate cross-hatch dungeon corridors/streets
    const corridors = Array.from({ length: 8 }, (_, i) => {
      const angle = (i * Math.PI) / 4 + (rng() - 0.5) * 0.2;
      const length = 110 + rng() * 30;
      return {
        x1: 150 - Math.cos(angle) * length,
        y1: 150 - Math.sin(angle) * length,
        x2: 150 + Math.cos(angle) * length,
        y2: 150 + Math.sin(angle) * length,
        dash: rng() > 0.5 ? "3,6" : "none",
        opacity: 0.15 + rng() * 0.35,
      };
    });

    // Generate occult node glyphs / markers
    const nodes = Array.from({ length: 6 }, () => {
      const dist = 40 + rng() * 80;
      const ang = rng() * Math.PI * 2;
      return {
        cx: 150 + Math.cos(ang) * dist,
        cy: 150 + Math.sin(ang) * dist,
        r: 3 + rng() * 3,
        symbol: rng() > 0.5 ? "◆" : "◇",
      };
    });

    // Cardinal coordinate runes
    const latStr = `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? "N" : "S"}`;
    const lngStr = `${Math.abs(lng).toFixed(4)}°${lng >= 0 ? "E" : "W"}`;

    return { rings, corridors, nodes, latStr, lngStr };
  }, [seed, lat, lng]);

  return (
    <div className={`relative w-full h-full bg-[#0a0a0f] overflow-hidden select-none flex items-center justify-center ${className}`}>
      {/* SVG Canvas for Procedural Dungeon Cartography */}
      <svg
        viewBox="0 0 300 300"
        className="w-full h-full max-h-full object-contain filter contrast-125"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Parchment & cracked bronze noise filter */}
          <filter id={`dungeon-noise-${filterId}`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.12 0" />
          </filter>

          {/* Dotted grid pattern */}
          <pattern id={`carto-grid-${filterId}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.8" fill="#c9a84c" opacity="0.15" />
          </pattern>

          {/* Radial ambient glow */}
          <radialGradient id={`core-glow-${filterId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.18" />
            <stop offset="60%" stopColor="#3d2b1f" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#0a0a0f" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient background glow */}
        <rect x="0" y="0" width="300" height="300" fill={`url(#core-glow-${filterId})`} />

        {/* Grid pattern */}
        <rect x="0" y="0" width="300" height="300" fill={`url(#carto-grid-${filterId})`} />

        {/* Noise overlay */}
        <rect x="0" y="0" width="300" height="300" filter={`url(#dungeon-noise-${filterId})`} fill="#c9a84c" />

        {/* Outer diamond frame */}
        <polygon
          points="150,18 282,150 150,282 18,150"
          fill="none"
          stroke="#c9a84c"
          strokeWidth="1"
          opacity="0.35"
        />
        <polygon
          points="150,28 272,150 150,272 28,150"
          fill="none"
          stroke="#c9a84c"
          strokeWidth="0.6"
          strokeDasharray="4,6"
          opacity="0.25"
        />

        {/* Concentric Runic Rings */}
        {elements.rings.map((ring, idx) => (
          <circle
            key={`ring-${idx}`}
            cx="150"
            cy="150"
            r={ring.r}
            fill="none"
            stroke="#c9a84c"
            strokeWidth="0.9"
            strokeDasharray={ring.strokeDasharray}
            opacity={ring.opacity}
          />
        ))}

        {/* Corridors / Streets */}
        {elements.corridors.map((c, idx) => (
          <line
            key={`corridor-${idx}`}
            x1={c.x1}
            y1={c.y1}
            x2={c.x2}
            y2={c.y2}
            stroke="#c9a84c"
            strokeWidth="1"
            strokeDasharray={c.dash}
            opacity={c.opacity}
          />
        ))}

        {/* Central Sanctorum Core */}
        <circle cx="150" cy="150" r="14" fill="#0a0a0f" stroke="#c9a84c" strokeWidth="1.5" />
        <circle cx="150" cy="150" r="8" fill="none" stroke="#f0d060" strokeWidth="0.8" strokeDasharray="2,2" />
        <circle cx="150" cy="150" r="3" fill="#c9a84c" />

        {/* Peripheral Occult Nodes */}
        {elements.nodes.map((n, idx) => (
          <g key={`node-${idx}`}>
            <circle cx={n.cx} cy={n.cy} r={n.r} fill="#0a0a0f" stroke="#c9a84c" strokeWidth="0.8" opacity="0.8" />
            <line x1="150" y1="150" x2={n.cx} y2={n.cy} stroke="#c9a84c" strokeWidth="0.5" strokeDasharray="2,4" opacity="0.3" />
          </g>
        ))}

        {/* Coordinate inscriptions */}
        <text
          x="150"
          y="42"
          textAnchor="middle"
          fill="#c9a84c"
          opacity="0.5"
          fontFamily="var(--font-cinzel), serif"
          fontSize="7"
          letterSpacing="2"
        >
          {elements.latStr}
        </text>
        <text
          x="150"
          y="266"
          textAnchor="middle"
          fill="#c9a84c"
          opacity="0.5"
          fontFamily="var(--font-cinzel), serif"
          fontSize="7"
          letterSpacing="2"
        >
          {elements.lngStr}
        </text>

        {/* Four cardinal compass ticks */}
        <path d="M150,8 L150,18 M150,282 L150,292 M8,150 L18,150 M282,150 L292,150" stroke="#c9a84c" strokeWidth="1.2" opacity="0.7" />
      </svg>

      {/* Atmospheric center title overlay */}
      <div className="absolute inset-x-0 bottom-4 text-center pointer-events-none px-4">
        <span className="font-cinzel text-[9px] text-[#c9a84c]/70 tracking-[0.3em] uppercase block">
          PROCEDURAL CARTOGRAPHY · {placeType}
        </span>
      </div>
    </div>
  );
}

"use client";

import React, { useId } from "react";
import { Quest, Waypoint } from "@/types/quest";
import { CompassRose } from "./CompassRose";

interface DungeonMapSVGProps {
  quest: Quest;
  gpxTrace?: Array<{ lat: number; lng: number }>;
  className?: string;
}

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export function DungeonMapSVG({ quest, gpxTrace = [], className = "" }: DungeonMapSVGProps) {
  const filterId = useId();

  // Normalize lat/lng to fit within SVG 340x340 view box (with 40px padding)
  const waypoints = quest.waypoints;
  const allLats = waypoints.map((w) => w.coords.lat).concat(gpxTrace.map((g) => g.lat));
  const allLngs = waypoints.map((w) => w.coords.lng).concat(gpxTrace.map((g) => g.lng));

  const minLat = Math.min(...allLats);
  const maxLat = Math.max(...allLats);
  const minLng = Math.min(...allLngs);
  const maxLng = Math.max(...allLngs);

  const latSpan = maxLat - minLat || 0.001;
  const lngSpan = maxLng - minLng || 0.001;

  const mapToSVG = (coords: { lat: number; lng: number }) => {
    // Map lng to X (40 to 300), lat to Y (300 to 40 - inverted because SVG Y increases downward)
    const x = 40 + ((coords.lng - minLng) / lngSpan) * 260;
    const y = 300 - ((coords.lat - minLat) / latSpan) * 240;
    return { x: Math.round(x), y: Math.round(y) };
  };

  // Convert GPX points or waypoints to SVG path string
  const tracePoints = gpxTrace.length > 0 ? gpxTrace : waypoints.map((w) => w.coords);
  const svgTracePoints = tracePoints.map(mapToSVG);
  const pathD = svgTracePoints
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
    .join(" ");

  return (
    <div className={`relative inline-block border-2 border-dungeon-gold bg-dungeon-bg ${className}`}>
      <svg
        id="dungeon-map-svg-element"
        width="340"
        height="340"
        viewBox="0 0 340 340"
        xmlns="http://www.w3.org/2000/svg"
        className="block"
      >
        <defs>
          {/* Parchment SVG Noise Texture Filter */}
          <filter id={`parchment-noise-${filterId}`} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
            <feDiffuseLighting in="noise" lightingColor="#c9a84c" surfaceScale="1.5" result="light">
              <feDistantLight azimuth="60" elevation="50" />
            </feDiffuseLighting>
            <feComponentTransfer>
              <feFuncR type="linear" slope="0.12" />
              <feFuncG type="linear" slope="0.10" />
              <feFuncB type="linear" slope="0.05" />
            </feComponentTransfer>
            <feBlend mode="multiply" in="SourceGraphic" result="blend" />
          </filter>
        </defs>

        {/* Map Background with Parchment Filter */}
        <rect
          x="0"
          y="0"
          width="340"
          height="340"
          fill="#0a0a0f"
          filter={`url(#parchment-noise-${filterId})`}
        />

        {/* Aged Outer Map Border */}
        <rect x="8" y="8" width="324" height="324" fill="none" stroke="#c9a84c" strokeWidth="2" />
        <rect x="12" y="12" width="316" height="316" fill="none" stroke="#c9a84c" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />

        {/* Map Header Title */}
        <text
          x="170"
          y="32"
          textAnchor="middle"
          fill="#c9a84c"
          fontSize="11"
          fontFamily="var(--font-cinzel), serif"
          fontWeight="bold"
          letterSpacing="0.15em"
        >
          {quest.title.toUpperCase()}
        </text>
        <line x1="60" y1="38" x2="280" y2="38" stroke="#c9a84c" strokeWidth="0.75" opacity="0.6" />

        {/* Dotted Gold GPS Trace Path */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#c9a84c"
            strokeWidth="2.5"
            strokeDasharray="5,4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Waypoints Markers ◆ */}
        {waypoints.map((wp, idx) => {
          const pt = mapToSVG(wp.coords);
          const roman = ROMAN_NUMERALS[idx] || `${idx + 1}`;
          return (
            <g key={wp.sequence} transform={`translate(${pt.x}, ${pt.y})`}>
              {/* Waypoint diamond symbol ◆ */}
              <polygon points="0,-9 9,0 0,9 -9,0" fill="#0a0a0f" stroke="#c9a84c" strokeWidth="2" />
              <polygon points="0,-5 5,0 0,5 -5,0" fill="#c9a84c" />

              {/* Roman numeral label */}
              <text
                x="0"
                y="-14"
                textAnchor="middle"
                fill="#e8e0d0"
                fontSize="10"
                fontFamily="var(--font-cinzel), serif"
                fontWeight="bold"
              >
                {roman}
              </text>
            </g>
          );
        })}

        {/* Bottom Right Corner Compass Rose */}
        <g transform="translate(285, 285)">
          <CompassRose size={40} />
        </g>

        {/* Scale indicator legend */}
        <g transform="translate(20, 315)">
          <line x1="0" y1="0" x2="40" y2="0" stroke="#c9a84c" strokeWidth="1.5" />
          <line x1="0" y1="-3" x2="0" y2="3" stroke="#c9a84c" strokeWidth="1.5" />
          <line x1="40" y1="-3" x2="40" y2="3" stroke="#c9a84c" strokeWidth="1.5" />
          <text x="20" y="-5" textAnchor="middle" fill="#c9a84c" fontSize="8" fontFamily="var(--font-cinzel), serif">
            200m
          </text>
        </g>
      </svg>
    </div>
  );
}

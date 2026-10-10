"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuest } from "@/context/QuestContext";
import { useQuestHistory } from "@/hooks/useQuestHistory";
import { XPFlash } from "@/components/XPFlash";
import { getAudioUsagePercent } from "@/utils/audioCache";

// Loading phrases for quest generation
const LOADING_PHRASES = [
  "Reading the streets...",
  "Finding the forgotten places...",
  "The dungeon master stirs...",
  "Your quest is being written...",
  "Giving voice to the ancient...",
  "The old map awakens...",
  "Something stirs beneath the city...",
  "The seals are breaking...",
];

// Custom Angular Geometric Runes for Layer 3 Subliminal Background
const RUNE_PATHS = [
  "M 20 0 L 40 40 L 0 40 Z M 20 10 L 10 30 L 30 30 Z",
  "M 0 0 L 40 0 L 40 40 L 0 40 Z M 10 10 L 30 10 L 20 30 Z",
  "M 20 0 L 40 20 L 20 40 L 0 20 Z M 20 10 L 30 20 L 20 30 L 10 20 Z",
  "M 0 0 L 30 0 L 40 20 L 30 40 L 0 40 Z",
  "M 20 0 L 40 30 L 30 40 L 10 40 L 0 30 Z",
  "M 0 20 L 20 0 L 40 20 L 20 40 Z",
];

export default function HomePage() {
  const {
    generateQuest,
    isGenerating,
    playerLevel,
    isLevelUp,
    recentXPGain,
    walkStats,
    backendStatus,
  } = useQuest();

  const router = useRouter();
  const { history } = useQuestHistory();

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLineIndex, setLoadingLineIndex] = useState<number>(0);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("00:00");
  const [isAudioActive, setIsAudioActive] = useState<boolean>(false);
  const [buttonEmbers, setButtonEmbers] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [voiceUsagePercent, setVoiceUsagePercent] = useState<number>(0);

  useEffect(() => {
    setVoiceUsagePercent(getAudioUsagePercent());
  }, []);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // 1. Clock Updates
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const mins = String(now.getMinutes()).padStart(2, "0");
      setCurrentTimeStr(`${hours}:${mins}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 60000);
    return () => clearInterval(interval);
  }, []);

  // 2. Typewriter Loading Phrases Cycle
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setLoadingLineIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // 3. Ambient Audio Toggle (Web Audio API 60Hz Drone Synth)
  const toggleAmbientAudio = () => {
    if (!isAudioActive) {
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(60, ctx.currentTime);

        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 1.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        audioCtxRef.current = ctx;
        oscillatorRef.current = osc;
        gainNodeRef.current = gain;
        setIsAudioActive(true);
      } catch (e) {
        console.warn("Web Audio API not supported", e);
      }
    } else {
      if (gainNodeRef.current && audioCtxRef.current) {
        gainNodeRef.current.gain.exponentialRampToValueAtTime(0.0001, audioCtxRef.current.currentTime + 0.5);
        setTimeout(() => {
          oscillatorRef.current?.stop();
          audioCtxRef.current?.close();
          setIsAudioActive(false);
        }, 500);
      }
    }
  };

  // 4. HTML5 Canvas Animation Loop (3 Layers)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const isTouchDevice = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
    const particleCount = isTouchDevice ? 35 : 60;

    // Layer 1: Fog Ellipses Setup
    const fogs = [
      { yRatio: 0.2, rx: width * 0.5, ry: height * 0.2, phaseX: 0, phaseY: 0, speedX: 0.0007, speedY: 0.0004 },
      { yRatio: 0.25, rx: width * 0.45, ry: height * 0.18, phaseX: 2.1, phaseY: 1.4, speedX: 0.0005, speedY: 0.0006 },
      { yRatio: 0.5, rx: width * 0.55, ry: height * 0.22, phaseX: 1.2, phaseY: 3.1, speedX: 0.0008, speedY: 0.0005 },
      { yRatio: 0.55, rx: width * 0.4, ry: height * 0.15, phaseX: 4.2, phaseY: 0.8, speedX: 0.0006, speedY: 0.0007 },
      { yRatio: 0.75, rx: width * 0.6, ry: height * 0.25, phaseX: 2.8, phaseY: 4.5, speedX: 0.0004, speedY: 0.0008 },
      { yRatio: 0.8, rx: width * 0.48, ry: height * 0.19, phaseX: 5.1, phaseY: 2.3, speedX: 0.0009, speedY: 0.0003 },
    ];

    // Layer 2: Floating Embers Setup
    const emberColors = ["#c9a84c", "#ff6b35", "#ff4500", "#e8e0d0"];
    const particles = Array.from({ length: particleCount }, () => {
      const randVal = Math.random();
      let color = "#c9a84c";
      if (randVal < 0.2) color = "#ff4500";
      else if (randVal < 0.35) color = "#e8e0d0";
      else if (randVal < 0.65) color = "#ff6b35";

      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.6 + 0.3,
        speed: Math.random() * 0.6 + 0.2,
        drift: (Math.random() - 0.5) * 0.6,
        color,
        vx: 0,
        vy: 0,
      };
    });

    // Layer 3: Distant Subliminal Runes Setup
    const runes = Array.from({ length: 6 }, (_, i) => ({
      pathIndex: i % RUNE_PATHS.length,
      x: (0.15 + (i * 0.15)) * width,
      y: (0.15 + ((i * 1.7) % 0.7)) * height,
      scale: Math.random() * 0.6 + 0.7,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.0005,
      opacity: Math.random() * 0.03 + 0.03,
    }));

    // Mouse Interaction for Embers
    let mouseX = -9999;
    let mouseY = -9999;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);

    let startTime = performance.now();

    const render = (now: number) => {
      const time = now - startTime;
      ctx.clearRect(0, 0, width, height);

      // --- LAYER 1: DRIFTING FOG ---
      fogs.forEach((fog) => {
        const dx = Math.sin(time * fog.speedX + fog.phaseX) * 30;
        const dy = Math.sin(time * fog.speedY + fog.phaseY) * 15;
        const cx = width / 2 + dx;
        const cy = height * fog.yRatio + dy;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(fog.rx, fog.ry));
        grad.addColorStop(0, "rgba(139, 90, 43, 0.08)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.save();
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, fog.rx, fog.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // --- LAYER 3: DISTANT SUBLIMINAL RUNES ---
      runes.forEach((rune) => {
        rune.rotation += rune.rotSpeed;
        ctx.save();
        ctx.translate(rune.x, rune.y);
        ctx.rotate(rune.rotation);
        ctx.scale(rune.scale, rune.scale);
        ctx.strokeStyle = "#c9a84c";
        ctx.globalAlpha = rune.opacity;
        ctx.lineWidth = 1.5;

        const path2d = new Path2D(RUNE_PATHS[rune.pathIndex]);
        ctx.stroke(path2d);
        ctx.restore();
      });

      // --- LAYER 2: FLOATING EMBERS ---
      particles.forEach((p) => {
        // Cursor push repulsion
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80 && dist > 0) {
          const force = (80 - dist) / 80;
          p.vx += (dx / dist) * force * 0.5;
          p.vy += (dy / dist) * force * 0.5;
        }

        p.x += Math.sin(time * 0.001 + p.drift) * 0.5 + p.vx;
        p.y -= p.speed - p.vy;

        p.vx *= 0.95;
        p.vy *= 0.95;

        // Fade in at bottom, fade out top 20%
        let alpha = p.opacity;
        if (p.y < height * 0.2) {
          alpha = p.opacity * Math.max(0, p.y / (height * 0.2));
        } else if (p.y > height * 0.85) {
          alpha = p.opacity * Math.max(0, (height - p.y) / (height * 0.15));
        }

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Reset particle when exiting top
        if (p.y < -10) {
          p.y = height + Math.random() * 20;
          p.x = Math.random() * width;
          p.vx = 0;
          p.vy = 0;
        }
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  // Permission click
  const handleRevealMapClick = () => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setHasLocationPermission(true);
        },
        () => {
          // Fallback location for dev simulation
          setUserCoords({ lat: 28.5934, lng: 77.22 });
          setHasLocationPermission(true);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setUserCoords({ lat: 28.5934, lng: 77.22 });
      setHasLocationPermission(true);
    }
  };

  const handleGenerateQuestClick = () => {
    const lat = userCoords?.lat || 28.5934;
    const lng = userCoords?.lng || 77.22;
    generateQuest(lat, lng);
  };

  // Button Hover Embers Generator
  const handleButtonMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newEmbers = Array.from({ length: 5 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
    }));
    setButtonEmbers(newEmbers);
    setTimeout(() => setButtonEmbers([]), 600);
  };

  const questsCompleted = playerLevel.totalQuestsCompleted || 0;
  const distanceKm = (playerLevel.totalDistanceMeters / 1000).toFixed(1);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-dungeon-bg text-dungeon-parchment select-none">
      <XPFlash amount={recentXPGain} />

      {/* LAYER 0: FULL SCREEN HTML5 CANVAS BACKGROUND */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 block w-full h-full" />

      {/* LAYER 1: MAP TEAR EFFECT (behind UI) */}
      <div className="absolute inset-0 z-1 pointer-events-none flex items-center justify-center">
        <div
          className={`transition-transform duration-800 ease-out ${
            hasLocationPermission ? "scale-115" : "scale-100"
          }`}
        >
          <div className="animate-map-tear-pulse relative w-[280px] h-[380px]">
            <svg
              width="280"
              height="380"
              viewBox="0 0 280 380"
              className="w-full h-full overflow-visible"
            >
              <defs>
                <radialGradient id="mapTearGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(201, 168, 76, 0.12)" />
                  <stop offset="60%" stopColor="rgba(139, 90, 43, 0.06)" />
                  <stop offset="100%" stopColor="rgba(10, 10, 15, 0)" />
                </radialGradient>

                <filter id="goldCrackedLeaf" x="-10%" y="-10%" width="120%" height="120%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" />
                </filter>

                <pattern id="mapGridDotted" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#c9a84c" strokeWidth="1" strokeDasharray="1,4" opacity="0.12" />
                </pattern>
              </defs>

              {/* 14-Point Irregular Polygon Torn Map Shape */}
              <polygon
                points="30,15 95,8 175,22 250,12 268,85 275,170 262,260 272,345 200,368 120,358 35,372 12,290 22,190 8,95"
                fill="url(#mapTearGrad)"
                stroke="#c9a84c"
                strokeWidth="1.2"
                strokeOpacity="0.4"
                filter="url(#goldCrackedLeaf)"
              />

              {/* Inner Map Grid */}
              <polygon
                points="30,15 95,8 175,22 250,12 268,85 275,170 262,260 272,345 200,368 120,358 35,372 12,290 22,190 8,95"
                fill="url(#mapGridDotted)"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* LAYER 2: ATMOSPHERIC FULL-SCREEN VIGNETTE */}
      <div
        className="absolute inset-0 z-2 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(10, 10, 15, 0.4) 60%, rgba(10, 10, 15, 0.85) 100%)",
        }}
      />

      {/* LAYER 10: TOP STATUS BAR */}
      <header className="absolute top-0 left-0 right-0 h-9 z-10 px-4 flex items-center justify-between bg-gradient-to-b from-dungeon-bg/95 to-transparent">
        {/* Left: Version & Backend Indicator */}
        <div className="flex items-center space-x-2">
          <span className="font-cinzel text-[10px] text-dungeon-gold/60 tracking-[0.3em] font-bold uppercase">
            [ REALM MAPPER V1.0 ]
          </span>
          <span
            className={`font-cinzel text-[9px] tracking-wider px-1.5 py-0.5 border flex items-center space-x-1 ${
              backendStatus?.isConnected
                ? "border-[#7a9a4c]/50 bg-[#7a9a4c]/10 text-[#7a9a4c]"
                : "border-dungeon-gold/30 bg-dungeon-bg/80 text-dungeon-gold/50"
            }`}
            title={
              backendStatus?.isConnected
                ? `Fastify Backend Connected · Model: ${backendStatus.model || "gemma2:2b"}`
                : "Backend Offline (Archive Mode fallback active)"
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                backendStatus?.isConnected ? "bg-[#7a9a4c] animate-pulse" : "bg-dungeon-gold/40"
              }`}
            />
            <span>{backendStatus?.isConnected ? "LLM LIVE" : "ARCHIVE"}</span>
          </span>
        </div>

        {/* Center: Location Status */}
        {hasLocationPermission && (
          <span className="font-cinzel text-[10px] text-[#7a9a4c] tracking-[0.2em] font-bold flex items-center space-x-1">
            <span>◆</span>
            <span>LOCATION LOCKED</span>
          </span>
        )}

        {/* Right: Sound Toggle + Clock */}
        <div className="flex items-center space-x-3">
          {/* Ambient Sound Toggle */}
          <button
            onClick={toggleAmbientAudio}
            type="button"
            className="flex items-end space-x-0.5 h-3 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
            title="Toggle Ambient Audio Drone"
          >
            <span className={`w-0.5 bg-dungeon-gold ${isAudioActive ? "animate-sound-bar-1" : "h-1"}`} />
            <span className={`w-0.5 bg-dungeon-gold ${isAudioActive ? "animate-sound-bar-2" : "h-2.5"}`} />
            <span className={`w-0.5 bg-dungeon-gold ${isAudioActive ? "animate-sound-bar-3" : "h-1.5"}`} />
          </button>

          {/* Live Clock */}
          <span className="font-cinzel text-xs text-dungeon-gold/60 font-semibold tracking-wider">
            {currentTimeStr}
          </span>
        </div>
      </header>

      {/* CENTER HERO CONTAINER */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4">
        {/* MAIN TITLE (Top 22%) */}
        <div className="absolute top-[20%] sm:top-[22%] flex flex-col items-center text-center">
          <div className="relative animate-entry-title">
            {/* Halo Glow Backdrop */}
            <div
              className="absolute inset-0 font-cinzel font-bold text-4xl sm:text-6xl text-dungeon-gold opacity-30 blur-md tracking-[0.4em] select-none pointer-events-none"
              aria-hidden="true"
            >
              WORLD<br />DUNGEON
            </div>

            {/* Gradient Front Title */}
            <h1 className="font-cinzel font-bold text-4xl sm:text-6xl tracking-[0.4em] text-gold-gradient leading-tight">
              WORLD
              <br />
              DUNGEON
            </h1>
          </div>

          {/* SVG Ornamental Divider (8px gap) */}
          <div className="mt-2 mb-3">
            <svg width="180" height="12" viewBox="0 0 180 12" className="overflow-visible">
              {/* Flanking Lines */}
              <line x1="27" y1="4" x2="153" y2="4" stroke="#c9a84c" strokeWidth="0.5" strokeOpacity="0.4" />
              <line x1="27" y1="8" x2="153" y2="8" stroke="#c9a84c" strokeWidth="0.5" strokeOpacity="0.4" />

              {/* Center Line with Animated Stroke Draw */}
              <line
                x1="0"
                y1="6"
                x2="180"
                y2="6"
                stroke="#c9a84c"
                strokeWidth="1"
                strokeOpacity="0.8"
                className="animate-draw-stroke"
              />

              {/* Center Diamond ◆ */}
              <polygon points="90,2 94,6 90,10 86,6" fill="#c9a84c" fillOpacity="0.9" />
            </svg>
          </div>

          {/* Subtitle (12px gap) */}
          <p className="animate-entry-subtitle font-lore italic text-[17px] text-dungeon-parchment/75 tracking-wider">
            Your neighborhood holds secrets. Walk them.
          </p>

          {/* QUEST STATS ROW (16px gap) */}
          <div className="animate-entry-stats mt-4 flex items-center space-x-2">
            {questsCompleted > 0 ? (
              <>
                <div className="border border-dungeon-gold/30 bg-dungeon-bg/60 px-3 py-1 font-cinzel text-[10px] text-dungeon-gold tracking-[0.2em]">
                  ⚔ {questsCompleted} QUESTS
                </div>
                <div className="border border-dungeon-gold/30 bg-dungeon-bg/60 px-3 py-1 font-cinzel text-[10px] text-dungeon-gold tracking-[0.2em]">
                  ◆ {distanceKm}km WALKED
                </div>
                <div className="border border-dungeon-gold/30 bg-dungeon-bg/60 px-3 py-1 font-cinzel text-[10px] text-dungeon-gold tracking-[0.2em]">
                  ✦ LVL {playerLevel.level}
                </div>
              </>
            ) : (
              <div className="border border-dungeon-gold/30 bg-dungeon-bg/60 px-3.5 py-1 font-cinzel text-[10px] text-dungeon-gold tracking-[0.2em]">
                ✦ THE FIRST QUEST AWAITS
              </div>
            )}
          </div>

          {/* REDESIGNED LEVEL BADGE (20px gap) */}
          <div className="animate-entry-level mt-5 w-full max-w-[260px]">
            <div
              className={`border border-dungeon-gold bg-dungeon-bg/80 p-2.5 flex items-center space-x-3 text-left transition-all ${
                isLevelUp ? "animate-levelup-flash border-dungeon-ember" : ""
              }`}
            >
              {/* Left 30%: Level Number */}
              <div className="w-[30%] flex flex-col items-center justify-center text-center">
                <span className="font-cinzel text-2xl font-bold text-gold-gradient leading-none">
                  {playerLevel.level}
                </span>
                <span className="font-cinzel text-[8px] font-bold text-dungeon-gold tracking-[0.3em] uppercase mt-0.5">
                  LEVEL
                </span>
              </div>

              {/* Vertical Divider */}
              <div className="w-[1px] h-9 bg-dungeon-gold/30" />

              {/* Right 70%: Title & XP Bar */}
              <div className="w-[70%] space-y-1">
                <p className="font-lore italic text-sm text-dungeon-parchment leading-none truncate">
                  {playerLevel.title}
                </p>

                {/* Animated Flowing Gold XP Bar */}
                <div className="h-1 w-full bg-dungeon-gold/20 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#8b6914] via-[#c9a84c] to-[#f0d060] animate-shimmer"
                    style={{
                      width: `${Math.min(100, Math.round((playerLevel.xp / Math.max(1, playerLevel.xpToNext)) * 100))}%`,
                    }}
                  />
                </div>

                <p className="font-cinzel text-[9px] text-dungeon-gold/70 text-right font-semibold">
                  {playerLevel.xp} / {playerLevel.xpToNext} XP
                </p>
              </div>
            </div>

            {/* ElevenLabs Free Tier Voice Reserve Warning */}
            {voiceUsagePercent > 80 && (
              <p className="mt-2 font-cinzel text-[9px] text-dungeon-ember font-bold tracking-widest text-center uppercase animate-pulse">
                ◈ VOICE RESERVE: {100 - voiceUsagePercent}% REMAINING
              </p>
            )}
          </div>

          {/* REDESIGNED MAIN BUTTON (28px gap) */}
          <div
            className="animate-entry-button mt-7 relative group cursor-pointer"
            onMouseEnter={handleButtonMouseEnter}
          >
            {!hasLocationPermission ? (
              /* STATE A: REVEAL THE MAP */
              <button
                onClick={handleRevealMapClick}
                type="button"
                className="relative w-[240px] h-[56px] bg-transparent border-0 focus:outline-none flex items-center justify-center"
              >
                {/* SVG Shield / Gate Background */}
                <svg width="240" height="56" viewBox="0 0 240 56" className="absolute inset-0 w-full h-full">
                  <polygon
                    points="16,0 224,0 240,28 224,56 16,56 0,28"
                    className="fill-dungeon-bg/90 stroke-dungeon-gold stroke-[1.5] group-hover:fill-dungeon-gold/15 transition-colors animate-button-border-pulse"
                  />
                  {/* Side Notch Brackets */}
                  <line x1="0" y1="20" x2="0" y2="36" stroke="#c9a84c" strokeWidth="3" />
                  <line x1="240" y1="20" x2="240" y2="36" stroke="#c9a84c" strokeWidth="3" />
                </svg>

                {/* L-Bracket Corner Accents */}
                <svg width="240" height="56" viewBox="0 0 240 56" className="absolute inset-0 w-full h-full pointer-events-none">
                  <path d="M 6 12 L 6 6 L 12 6" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeOpacity="0.6" />
                  <path d="M 234 12 L 234 6 L 228 6" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeOpacity="0.6" />
                  <path d="M 6 44 L 6 50 L 12 50" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeOpacity="0.6" />
                  <path d="M 234 44 L 234 50 L 228 50" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeOpacity="0.6" />
                </svg>

                {/* Button Text */}
                <span className="relative z-10 font-cinzel text-[13px] font-semibold tracking-[0.35em] text-dungeon-gold">
                  REVEAL THE MAP
                </span>
              </button>
            ) : isGenerating ? (
              /* STATE B: CONSULTING (Spinning Rune Lock) */
              <div className="relative w-[240px] h-[56px] flex items-center justify-center">
                <svg width="240" height="56" viewBox="0 0 240 56" className="absolute inset-0 w-full h-full">
                  <polygon points="16,0 224,0 240,28 224,56 16,56 0,28" fill="rgba(10, 10, 15, 0.95)" stroke="#c9a84c" strokeWidth="1.5" />
                </svg>

                {/* Outer Clockwise Spin Bracket */}
                <div className="absolute inset-0 animate-spin-cw pointer-events-none">
                  <svg width="240" height="56" viewBox="0 0 240 56" className="w-full h-full">
                    <circle cx="20" cy="28" r="8" fill="none" stroke="#c9a84c" strokeWidth="1" strokeDasharray="3 3" />
                    <circle cx="220" cy="28" r="8" fill="none" stroke="#c9a84c" strokeWidth="1" strokeDasharray="3 3" />
                  </svg>
                </div>

                {/* Inner Counter-Clockwise Inset Border */}
                <div className="absolute inset-1.5 animate-spin-ccw pointer-events-none">
                  <svg width="228" height="44" viewBox="0 0 228 44" className="w-full h-full">
                    <polygon points="12,0 216,0 228,22 216,44 12,44 0,22" fill="none" stroke="#c9a84c" strokeWidth="0.75" strokeDasharray="4 4" opacity="0.6" />
                  </svg>
                </div>

                <span className="relative z-10 font-cinzel text-[11px] font-bold tracking-[0.25em] text-dungeon-gold animate-pulse text-center px-2">
                  CONSULTING...
                </span>
              </div>
            ) : (
              /* STATE C: GENERATE QUEST */
              <button
                onClick={handleGenerateQuestClick}
                type="button"
                className="relative w-[240px] h-[56px] bg-transparent border-0 focus:outline-none flex items-center justify-center"
              >
                <svg width="240" height="56" viewBox="0 0 240 56" className="absolute inset-0 w-full h-full">
                  <polygon
                    points="16,0 224,0 240,28 224,56 16,56 0,28"
                    className="fill-dungeon-bg/90 stroke-dungeon-gold stroke-[1.5] group-hover:fill-dungeon-gold/20 transition-colors"
                  />
                  <line x1="0" y1="20" x2="0" y2="36" stroke="#c9a84c" strokeWidth="3" />
                  <line x1="240" y1="20" x2="240" y2="36" stroke="#c9a84c" strokeWidth="3" />
                </svg>

                <div className="relative z-10 flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7a9a4c] animate-pulse" />
                  <span className="font-cinzel text-[13px] font-semibold tracking-[0.35em] text-dungeon-gold">
                    GENERATE QUEST
                  </span>
                </div>
              </button>
            )}

            {/* Hover Particle Burst Embers */}
            {buttonEmbers.map((emb) => (
              <span
                key={emb.id}
                className="absolute w-1 h-1 rounded-full bg-dungeon-ember animate-float-xp pointer-events-none"
                style={{ left: emb.x, top: emb.y }}
              />
            ))}
          </div>

          {/* SECONDARY GHOST BUTTON: YOUR JOURNEY */}
          <div className="mt-3 flex flex-col items-center space-y-1.5 animate-entry-button">
            <button
              onClick={() => router.push("/journey")}
              type="button"
              className="w-[200px] h-[44px] bg-transparent border border-dungeon-gold/35 hover:border-dungeon-gold/70 active:border-dungeon-gold font-cinzel text-[11px] text-dungeon-gold/70 hover:text-dungeon-gold tracking-[0.25em] transition-all flex items-center justify-center select-none active:scale-[0.98]"
            >
              ◆ YOUR JOURNEY
            </button>

            {history.length > 0 && (
              <span className="font-cinzel text-[9px] text-dungeon-gold/40 tracking-[0.2em] uppercase text-center">
                {history.length} QUEST{history.length > 1 ? "S" : ""} COMPLETED
              </span>
            )}
          </div>

          {/* TYPEWRITER LOADING PHRASE (State B only - Reserved 24px height) */}
          <div className="h-6 mt-3 flex items-center justify-center">
            {isGenerating && (
              <p className="font-lore italic text-sm text-dungeon-parchment/60 text-center animate-fade-in">
                {LOADING_PHRASES[loadingLineIndex]}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* LAYER 10: BOTTOM HUD AREA */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 p-4 flex items-end justify-between animate-entry-bottom">
        {/* Left Side: Coordinates HUD */}
        <div className="flex flex-col text-left">
          {hasLocationPermission && userCoords && (
            <>
              <span className="font-cinzel text-[9px] text-[#7a9a4c] tracking-[0.2em] font-bold">
                ◆ LOCATION LOCKED
              </span>
              <span className="font-mono text-[9px] text-dungeon-parchment/50 tracking-wider">
                {userCoords.lat.toFixed(4)}° N &nbsp; {userCoords.lng.toFixed(4)}° E
              </span>
            </>
          )}
        </div>

        {/* Center: Scroll Chevrons & Screen Dots */}
        <div className="flex flex-col items-center justify-center space-y-1">
          {/* Dripping Down Chevrons */}
          <div className="flex flex-col items-center space-y-[-4px] select-none">
            <span className="font-cinzel text-[10px] text-dungeon-gold/40 animate-chevron-drip">∨</span>
            <span className="font-cinzel text-[10px] text-dungeon-gold/40 animate-chevron-drip animation-delay-300">∨</span>
          </div>

          {/* 3 Screen Dots */}
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-dungeon-gold/30" />
            <span className="w-2 h-2 rounded-full bg-dungeon-gold" />
            <span className="w-1.5 h-1.5 rounded-full bg-dungeon-gold/30" />
          </div>
        </div>

        {/* Right Side: Hackathon Theme Meta Joke */}
        <div className="text-right">
          <span className="font-cinzel text-[10px] text-dungeon-gold/30 tracking-[0.3em] font-bold uppercase">
            TOUCH GRASS
          </span>
        </div>
      </footer>
    </main>
  );
}

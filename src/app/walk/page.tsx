"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQuest } from "@/context/QuestContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useVoiceNarration } from "@/hooks/useVoiceNarration";
import { useCamera } from "@/hooks/useCamera";
import { SimulationBadge } from "@/components/SimulationBadge";
import { XPFlash } from "@/components/XPFlash";
import { calculateDistanceMeters, formatDistance, getDirectionArrow } from "@/utils/geo";
import { GeneratedLocationArt } from "@/components/GeneratedLocationArt";

// Dynamically import LiveMinimap to prevent SSR Leaflet window errors
const LiveMinimap = dynamic(
  () => import("@/components/LiveMinimap").then((mod) => mod.LiveMinimap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[280px] bg-dungeon-bg border-y border-dungeon-gold/20 flex items-center justify-center font-cinzel text-[10px] text-dungeon-gold/50 tracking-widest">
        DIVINING CARTOGRAPHY...
      </div>
    ),
  }
);

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

// Map OSM tags/names to thematic labels
function derivePlaceType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("mosque") || lower.includes("masjid") || lower.includes("dargah") || lower.includes("temple")) {
    return "SACRED SITE";
  }
  if (lower.includes("ruin") || lower.includes("fort") || lower.includes("qila")) {
    return "FORGOTTEN RUINS";
  }
  if (lower.includes("monument") || lower.includes("gumbad") || lower.includes("tomb") || lower.includes("gate")) {
    return "ANCIENT MONUMENT";
  }
  if (lower.includes("park") || lower.includes("garden") || lower.includes("well") || lower.includes("baoli")) {
    return "THE BREATHING SPACE";
  }
  if (lower.includes("road") || lower.includes("chowk") || lower.includes("crossing")) {
    return "FORGOTTEN CROSSING";
  }
  return "UNMARKED THRESHOLD";
}

export default function WalkPage() {
  const router = useRouter();
  const {
    currentQuest,
    currentWaypointIndex,
    unlockedWaypoints,
    unlockWaypoint,
    advanceToNextWaypoint,
    saveUserPhoto,
    completeQuest,
    recentXPGain,
    addXP,
    gpxTrace,
    walkStats,
    setUserLocation,
    updateDistanceWalked,
    recordGPXPoint,
    preGeneratedAudio,
  } = useQuest();

  const { openCamera } = useCamera();
  const {
    narrateWaypoint,
    isSpeaking,
    isLoading: isAudioLoading,
    audioBlocked,
    voiceId,
    setVoiceId,
    availableVoices,
    stop: stopVoice,
  } = useVoiceNarration();

  const currentWaypoint = currentQuest?.waypoints[currentWaypointIndex];

  // Geolocation hook tracking real GPS with 8s simulation fallback
  const geoState = useGeolocation(
    currentWaypoint?.coords.lat,
    currentWaypoint?.coords.lng
  );
  const { position, isSimulated } = geoState;

  // Walk states
  const [isEncounterState, setIsEncounterState] = useState<boolean>(false);
  const [isBuriedHistoryRevealed, setIsBuriedHistoryRevealed] = useState<boolean>(false);
  const [isFlashActive, setIsFlashActive] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAbandonDialog, setShowAbandonDialog] = useState<boolean>(false);

  const prevCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const encounterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const narratedWaypointsRef = useRef<Set<number>>(new Set());

  // Cleanup audio & timers on unmount
  useEffect(() => {
    return () => {
      if (encounterTimeoutRef.current) clearTimeout(encounterTimeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      stopVoice();
    };
  }, [stopVoice]);

  // Sync position updates into QuestContext for statistics and GPX
  useEffect(() => {
    if (!position) return;
    setUserLocation({ lat: position.lat, lng: position.lng });
    recordGPXPoint(position.lat, position.lng);

    if (prevCoordsRef.current) {
      const delta = calculateDistanceMeters(
        prevCoordsRef.current.lat,
        prevCoordsRef.current.lng,
        position.lat,
        position.lng
      );
      if (delta > 0 && delta < 50) {
        updateDistanceWalked(delta);
      }
    }
    prevCoordsRef.current = { lat: position.lat, lng: position.lng };
  }, [position, setUserLocation, recordGPXPoint, updateDistanceWalked]);

  // Redirect to home if no active quest
  useEffect(() => {
    if (!currentQuest) {
      router.push("/");
    }
  }, [currentQuest, router]);

  const totalWaypoints = currentQuest?.waypoints.length || 0;
  const userLat = position?.lat ?? currentWaypoint?.coords.lat ?? 0;
  const userLng = position?.lng ?? currentWaypoint?.coords.lng ?? 0;
  const userHeading = position?.heading ?? null;

  // Real-time distance in meters to active waypoint
  const rawDistance = currentWaypoint
    ? calculateDistanceMeters(
        userLat,
        userLng,
        currentWaypoint.coords.lat,
        currentWaypoint.coords.lng
      )
    : 999999;

  // Direction arrow
  const directionArrow = currentWaypoint
    ? getDirectionArrow(
        userLat,
        userLng,
        currentWaypoint.coords.lat,
        currentWaypoint.coords.lng,
        userHeading
      )
    : "↑";

  // Roman numeral indexes
  const romanNumeral = ROMAN_NUMERALS[currentWaypointIndex] || `${currentWaypointIndex + 1}`;
  const totalRomanNumeral = ROMAN_NUMERALS[totalWaypoints - 1] || `${totalWaypoints}`;
  const isLastWaypoint = currentWaypointIndex >= totalWaypoints - 1;

  // Proximity calculations for ring
  // At 500m: 0% filled; At 100m: 50% filled; At 20m: 100% filled
  let proximityProgress = 0;
  if (rawDistance <= 20) {
    proximityProgress = 1;
  } else if (rawDistance >= 500) {
    proximityProgress = 0;
  } else {
    proximityProgress = (500 - rawDistance) / 480;
  }
  const isArrivingState = rawDistance <= 30 && !isEncounterState;

  // Trigger Encounter State when within 20m (strictly once per waypoint)
  useEffect(() => {
    if (!currentQuest || !currentWaypoint) return;

    if (
      rawDistance <= 20 &&
      !isEncounterState &&
      !unlockedWaypoints.includes(currentWaypointIndex) &&
      !narratedWaypointsRef.current.has(currentWaypointIndex)
    ) {
      narratedWaypointsRef.current.add(currentWaypointIndex);

      // Step 1: Visual flash
      setIsFlashActive(true);
      setTimeout(() => setIsFlashActive(false), 200);

      // Step 2: Set encounter mode
      setIsEncounterState(true);
      setIsBuriedHistoryRevealed(false);

      // Step 3: Unlock waypoint in context (grants +20 XP)
      unlockWaypoint(currentWaypointIndex);

      // Step 4+5: Narration with pre-generated audio & 400ms silence before voice
      const targetIndex = currentWaypointIndex;
      const targetWaypoint = currentWaypoint;
      const waypointAudio = preGeneratedAudio?.[targetIndex] ?? {
        cueAudio: null,
        loreAudio: null,
      };

      if (encounterTimeoutRef.current) clearTimeout(encounterTimeoutRef.current);
      encounterTimeoutRef.current = setTimeout(() => {
        narrateWaypoint(
          waypointAudio.cueAudio,
          waypointAudio.loreAudio,
          targetWaypoint.unlockCue,
          targetWaypoint.loreFragment
        );
      }, 400);
    }
  }, [
    rawDistance,
    isEncounterState,
    currentWaypointIndex,
    unlockedWaypoints,
    unlockWaypoint,
    currentWaypoint,
    currentQuest,
    preGeneratedAudio,
    narrateWaypoint,
  ]);

  // Toast notification for lore hint
  const handleShowHint = () => {
    if (!currentWaypoint) return;
    const hintText = currentWaypoint.surfaceObservation?.split(".")[0] ||
      currentWaypoint.loreFragment.split(".")[0] ||
      "Follow the gold line toward the destination.";
    
    setToastMessage(hintText + ".");
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Voice playback trigger (stops any previous audio first)
  const handlePlayVoice = (overrideVoiceId?: string) => {
    if (!currentWaypoint) return;
    stopVoice();
    if (encounterTimeoutRef.current) clearTimeout(encounterTimeoutRef.current);

    const targetVoice = overrideVoiceId || voiceId;
    const waypointAudio = preGeneratedAudio?.[currentWaypointIndex] ?? {
      cueAudio: null,
      loreAudio: null,
    };
    narrateWaypoint(
      waypointAudio.cueAudio,
      waypointAudio.loreAudio,
      currentWaypoint.unlockCue,
      currentWaypoint.loreFragment,
      targetVoice
    );
  };

  // Photo capture action
  const handleCapturePhoto = async () => {
    const captured = await openCamera();
    if (captured) {
      saveUserPhoto(currentWaypointIndex, captured);
    }
  };

  // Uncover buried history interaction
  const handleUncoverPast = () => {
    if (!isBuriedHistoryRevealed) {
      setIsBuriedHistoryRevealed(true);
      addXP(10); // Reward for uncovering past
    }
  };

  // Continue to next waypoint or artifact chamber (silences previous waypoint voice)
  const handleContinueQuest = () => {
    stopVoice();
    if (encounterTimeoutRef.current) clearTimeout(encounterTimeoutRef.current);

    if (isLastWaypoint) {
      completeQuest();
      return;
    }
    advanceToNextWaypoint();
    setIsEncounterState(false);
    setIsBuriedHistoryRevealed(false);
  };

  if (!currentQuest || !currentWaypoint) {
    return (
      <div className="min-h-screen bg-dungeon-bg flex flex-col items-center justify-center p-6 text-center space-y-3">
        <span className="font-cinzel text-2xl text-dungeon-gold animate-pulse">◆</span>
        <p className="font-cinzel text-xs text-dungeon-gold/70 tracking-[0.3em] uppercase">
          COMMUNING WITH THE REALM...
        </p>
      </div>
    );
  }

  // Resolve hero image URL (Mapillary or Wikimedia)
  const heroImageUrl = currentWaypoint.mapillaryImageUrl || currentWaypoint.fetchedImageUrl || null;
  const placeType = derivePlaceType(currentWaypoint.realPlaceName);

  // Proximity ring SVG values
  const ringRadius = 20;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference - proximityProgress * ringCircumference;
  const ringColor = proximityProgress > 0.8 ? "#ff4500" : "#c9a84c";

  return (
    <main
      className={`min-h-screen bg-dungeon-bg text-dungeon-parchment flex flex-col justify-between relative overflow-x-hidden select-none ${
        isFlashActive ? "bg-white" : ""
      }`}
    >
      <XPFlash amount={recentXPGain} />

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-14 inset-x-4 z-50 animate-fade-in">
          <div className="max-w-md mx-auto bg-dungeon-bg/95 border border-dungeon-gold p-3 shadow-[0_0_20px_rgba(201,168,76,0.3)] flex items-start space-x-2">
            <span className="text-dungeon-gold text-sm font-bold">◆</span>
            <p className="font-lore italic text-xs text-dungeon-parchment flex-1 leading-relaxed">
              {toastMessage}
            </p>
          </div>
        </div>
      )}

      {/* ABANDON CONFIRMATION DIALOG */}
      {showAbandonDialog && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-dungeon-bg border-2 border-dungeon-gold max-w-sm w-full p-6 text-center space-y-4 shadow-[0_0_30px_rgba(0,0,0,0.9)]">
            <span className="text-dungeon-ember text-3xl block">⚠</span>
            <h3 className="font-cinzel text-sm text-dungeon-gold font-bold tracking-widest uppercase">
              ABANDON QUEST?
            </h3>
            <p className="font-lore italic text-xs text-dungeon-parchment/80 leading-relaxed">
              "The dungeon does not forgive deserters. Are you certain?"
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  stopVoice();
                  router.push("/");
                }}
                className="py-2.5 border border-dungeon-ember/60 bg-dungeon-burn font-cinzel text-xs text-dungeon-ember hover:bg-dungeon-ember hover:text-black font-bold uppercase"
              >
                YES, FLEE
              </button>
              <button
                type="button"
                onClick={() => setShowAbandonDialog(false)}
                className="py-2.5 border border-dungeon-gold bg-dungeon-gold font-cinzel text-xs text-dungeon-bg font-bold uppercase hover:bg-transparent hover:text-dungeon-gold"
              >
                NO, REMAIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1 — TOP HUD BAR (fixed, 48px height) */}
      <header className="fixed top-0 inset-x-0 h-12 z-40 px-4 flex items-center justify-between bg-gradient-to-b from-[#0a0a0f]/95 to-transparent backdrop-blur-[2px]">
        {/* Left: SimulationBadge */}
        <div className="flex items-center space-x-2">
          <SimulationBadge isSimulated={isSimulated} />
        </div>

        {/* Center: Quest Title */}
        <h1 className="font-cinzel text-[11px] font-bold text-dungeon-gold tracking-[0.25em] uppercase truncate max-w-[180px] text-center">
          {currentQuest.title}
        </h1>

        {/* Right: Sound Wave (when speaking) + Walking figure icon & distance */}
        <div className="flex items-center space-x-2.5 font-cinzel text-[10px] text-dungeon-gold font-bold">
          {/* Ancient Voice Sound Wave Indicator */}
          <div
            className={`flex items-end space-x-0.5 h-3 transition-opacity duration-300 ${
              isSpeaking ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            title="The ancient voice is speaking"
          >
            <span className="w-0.5 bg-dungeon-gold animate-sound-bar-1" />
            <span className="w-0.5 bg-dungeon-gold animate-sound-bar-2" />
            <span className="w-0.5 bg-dungeon-gold animate-sound-bar-3" />
          </div>

          {/* Animated walking stick figure SVG */}
          <div className="w-4 h-4 flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 animate-walking-figure text-dungeon-gold"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="12" cy="5" r="2.5" />
              <line x1="12" y1="7.5" x2="12" y2="15" />
              <line x1="12" y1="10" x2="8" y2="13" />
              <line x1="12" y1="10" x2="16" y2="13" />
              <line x1="12" y1="15" x2="9" y2="21" />
              <line x1="12" y1="15" x2="15" y2="21" />
            </svg>
          </div>
          <span className="tracking-wider">
            {walkStats.distanceMeters > 0 ? `${walkStats.distanceMeters}m` : "0m"}
          </span>
        </div>
      </header>

      {/* SECTION 2 — HERO IMAGE (45vh) */}
      <div className="relative w-full h-[45vh] overflow-hidden pt-12">
        {heroImageUrl ? (
          <img
            src={heroImageUrl}
            alt={currentWaypoint.realPlaceName}
            className="w-full h-full object-cover transition-opacity duration-700"
          />
        ) : (
          <GeneratedLocationArt
            lat={currentWaypoint.coords.lat}
            lng={currentWaypoint.coords.lng}
            placeName={currentWaypoint.realPlaceName}
            placeType={placeType}
            className="w-full h-full"
          />
        )}

        {/* TOP LEFT — WAYPOINT BADGE */}
        <div className="absolute top-14 left-3 z-10">
          <div className="bg-[#0a0a0f]/90 border border-dungeon-gold px-2.5 py-1 backdrop-blur-sm">
            <span className="font-cinzel text-[10px] text-dungeon-gold font-bold tracking-widest uppercase">
              WAYPOINT {romanNumeral} / {totalRomanNumeral}
            </span>
          </div>
        </div>

        {/* TOP RIGHT — DISTANCE BADGE */}
        <div className="absolute top-14 right-3 z-10">
          <div className="bg-[#0a0a0f]/85 border border-[#c9a84c] px-3.5 py-2 flex flex-col items-center justify-center min-w-[90px] shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-sm">
            {/* Direction arrow */}
            <div className="text-2xl text-dungeon-gold font-bold leading-none mb-0.5">
              {directionArrow}
            </div>
            {/* Distance number with formatDistance */}
            <div className="font-cinzel text-2xl font-black text-gold-gradient leading-tight">
              {formatDistance(rawDistance)}
            </div>
            {/* Sub-label */}
            <span className="font-cinzel text-[8px] text-dungeon-gold/70 tracking-[0.3em] uppercase mt-0.5">
              TO DESTINATION
            </span>
          </div>
        </div>

        {/* BOTTOM GRADIENT OVERLAY (Bottom 40%) */}
        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none" />

        {/* BOTTOM LEFT (Over gradient) — PLACE NAME */}
        <div className="absolute bottom-3 left-4 z-10 max-w-[70%]">
          <h2 className="font-lore text-lg text-dungeon-parchment italic font-semibold leading-tight drop-shadow">
            {currentWaypoint.realPlaceName}
          </h2>
          <p className="font-cinzel text-[10px] text-dungeon-gold/60 tracking-[0.2em] uppercase mt-0.5">
            {placeType}
          </p>
        </div>

        {/* BOTTOM RIGHT (Over gradient) — PROXIMITY RING */}
        <div className="absolute bottom-3 right-4 z-10 flex items-center justify-center">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              {/* Background ring track */}
              <circle
                cx="24"
                cy="24"
                r={ringRadius}
                fill="none"
                stroke="#3d2b1f"
                strokeWidth="2.5"
                opacity="0.6"
              />
              {/* Animated progress ring */}
              <circle
                cx="24"
                cy="24"
                r={ringRadius}
                fill="none"
                stroke={ringColor}
                strokeWidth="2.5"
                strokeDasharray={ringCircumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <span className="absolute font-cinzel text-[8px] text-dungeon-parchment font-bold">
              {rawDistance < 1000 ? `${Math.round(rawDistance)}m` : `${(rawDistance / 1000).toFixed(1)}k`}
            </span>
          </div>
        </div>

        {/* ARRIVING STATE OVERLAY (distance < 30m) */}
        {isArrivingState && (
          <div className="absolute inset-0 bg-[#c9a84c]/10 flex items-center justify-center animate-pulse pointer-events-none">
            <div className="text-center">
              <span className="font-cinzel text-3xl font-black text-dungeon-gold tracking-[0.5em] uppercase drop-shadow-[0_0_15px_rgba(201,168,76,0.9)] animate-pulse">
                APPROACH
              </span>
              <p className="font-cinzel text-[9px] text-dungeon-parchment/80 tracking-widest mt-1">
                SANCTUM RADIUS BREACHED
              </p>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3 — LIVE MINIMAP (280px) */}
      <div className="w-full h-[280px] relative -mt-4 z-10">
        <LiveMinimap
          userLat={userLat}
          userLng={userLng}
          userHeading={userHeading}
          waypoints={currentQuest.waypoints}
          currentWaypointIndex={currentWaypointIndex}
          unlockedWaypoints={unlockedWaypoints}
          gpxTrace={gpxTrace}
        />
      </div>

      {/* SECTION 4 — BOTTOM QUEST HUD */}
      <footer className="w-full bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/98 to-transparent px-5 pt-3 pb-8 z-30 space-y-4">
        {/* ROW 1 — WAYPOINT CHAIN PROGRESS */}
        <div className="flex items-center justify-center space-x-0">
          {currentQuest.waypoints.map((wp, idx) => {
            const isCurrent = idx === currentWaypointIndex;
            const isUnlocked = unlockedWaypoints.includes(idx);
            const roman = ROMAN_NUMERALS[idx] || `${idx + 1}`;

            return (
              <React.Fragment key={`hud-wp-${idx}`}>
                {/* Waypoint Indicator */}
                <div className="relative flex items-center justify-center">
                  {isCurrent ? (
                    /* CURRENT WAYPOINT */
                    <div className="relative w-7 h-7 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-[1.5px] border-[#c9a84c] animate-rotate-border shadow-[0_0_12px_rgba(201,168,76,0.4)]" />
                      <div className="w-5 h-5 rounded-full bg-[#0a0a0f] flex items-center justify-center">
                        <span className="font-cinzel text-[9px] font-bold text-dungeon-gold">
                          {roman}
                        </span>
                      </div>
                    </div>
                  ) : isUnlocked ? (
                    /* UNLOCKED WAYPOINT */
                    <div className="relative w-6 h-6 rounded-full bg-[#c9a84c]/20 border border-[#c9a84c] flex items-center justify-center">
                      <span className="font-cinzel text-[9px] font-bold text-dungeon-gold">
                        {roman}
                      </span>
                      <span className="absolute -top-1 -right-1 text-[8px] text-[#7a9a4c] font-black leading-none">
                        ✓
                      </span>
                    </div>
                  ) : (
                    /* LOCKED WAYPOINT */
                    <div className="w-6 h-6 rounded-full bg-[#0a0a0f]/80 border border-[#c9a84c]/25 flex items-center justify-center">
                      <span className="font-cinzel text-[9px] text-dungeon-gold/30">
                        {roman}
                      </span>
                    </div>
                  )}
                </div>

                {/* Connecting Line between indicators */}
                {idx < currentQuest.waypoints.length - 1 && (
                  <div
                    className={`w-10 h-[1px] transition-colors duration-500 ${
                      unlockedWaypoints.includes(idx) ? "bg-[#c9a84c]/60" : "bg-[#c9a84c]/20"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ROW 2 — QUEST TITLE REMINDER */}
        <p className="font-lore italic text-[13px] text-dungeon-parchment/60 text-center truncate">
          "{currentQuest.title}"
        </p>

        {/* ROW 3 — ACTION FOOTER */}
        <div className="flex items-center justify-between pt-1">
          {/* LEFT: HINT BUTTON */}
          <button
            type="button"
            onClick={handleShowHint}
            className="px-2.5 py-1 bg-[#0a0a0f] border border-dungeon-gold/50 text-dungeon-gold font-cinzel text-[9px] tracking-wider uppercase hover:border-dungeon-gold hover:text-white transition-colors"
          >
            ◆ LORE HINT
          </button>

          {/* CENTER: KEEP WALKING TEXT */}
          <div className="font-cinzel text-[11px] text-dungeon-gold tracking-[0.4em] uppercase animate-pulse">
            KEEP WALKING
          </div>

          {/* RIGHT: EMERGENCY EXIT */}
          <button
            type="button"
            onClick={() => setShowAbandonDialog(true)}
            className="font-cinzel text-[9px] text-dungeon-ash opacity-50 tracking-wider uppercase hover:opacity-100 transition-opacity"
          >
            ✕ ABANDON
          </button>
        </div>
      </footer>

      {/* =========================================================================
          ENCOUNTER STATE MODAL (SLIDES UP ON PROXIMITY UNLOCK)
         ========================================================================= */}
      {isEncounterState && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 animate-fade-in backdrop-blur-sm">
          {/* TOP HALF — Hero image stays visible but darkened */}
          <div className="absolute inset-0 h-[40vh] overflow-hidden">
            {heroImageUrl ? (
              <img
                src={heroImageUrl}
                alt={currentWaypoint.realPlaceName}
                className="w-full h-full object-cover filter brightness-[0.35] contrast-125"
              />
            ) : (
              <GeneratedLocationArt
                lat={currentWaypoint.coords.lat}
                lng={currentWaypoint.coords.lng}
                placeName={currentWaypoint.realPlaceName}
                placeType={placeType}
                className="w-full h-full filter brightness-[0.4]"
              />
            )}
            <div className="absolute inset-0 bg-[#0a0a0f]/75 flex flex-col items-center justify-center text-center p-4">
              <h2 className="font-cinzel text-2xl font-black text-dungeon-gold tracking-[0.5em] uppercase drop-shadow-[0_0_20px_rgba(201,168,76,0.6)] animate-entry-title">
                YOU HAVE ARRIVED
              </h2>
              <p className="font-lore italic text-base text-dungeon-parchment mt-1">
                {currentWaypoint.realPlaceName}
              </p>
              <p className="font-cinzel text-[10px] text-dungeon-gold/70 tracking-[0.3em] uppercase mt-2">
                "{currentWaypoint.unlockCue}"
              </p>
            </div>
          </div>

          {/* BOTTOM HALF — LORE PANEL (covers 65% of screen) */}
          <div className="relative h-[65vh] w-full bg-[#0a0a0f]/97 flex flex-col justify-between overflow-hidden shadow-[0_-15px_30px_rgba(0,0,0,0.9)] animate-entry-level">
            {/* SVG noise texture for aged parchment feel */}
            <svg className="absolute w-0 h-0" aria-hidden="true">
              <defs>
                <filter id="encounter-paper-noise">
                  <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise" />
                  <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.03 0" />
                </filter>
              </defs>
            </svg>
            <div className="absolute inset-0 pointer-events-none filter-[url(#encounter-paper-noise)] opacity-50" />

            {/* Jagged torn-paper SVG top edge */}
            <svg
              className="absolute top-0 inset-x-0 w-full h-3 text-[#3d2b1f] pointer-events-none"
              preserveAspectRatio="none"
              viewBox="0 0 100 10"
            >
              <polygon points="0,0 10,7 20,2 30,8 40,3 50,7 60,1 70,6 80,2 90,8 100,0 100,10 0,10" fill="#0a0a0f" stroke="#3d2b1f" strokeWidth="0.8" />
            </svg>

            {/* SCROLLABLE LORE CONTENT CONTAINER */}
            <div className="flex-1 overflow-y-auto px-6 pt-6 pb-2 space-y-5">
              {/* SECTION A — LORE HEADER */}
              <div className="text-center space-y-1.5">
                {/* Decorative horizontal rule */}
                <div className="flex items-center justify-center space-x-2 text-dungeon-gold/50 max-w-[80%] mx-auto">
                  <div className="flex-1 h-[1px] bg-dungeon-gold/40" />
                  <span>◇</span>
                  <span className="text-sm">◆</span>
                  <span>◇</span>
                  <div className="flex-1 h-[1px] bg-dungeon-gold/40" />
                </div>
                <span className="font-cinzel text-[9px] text-dungeon-gold/60 tracking-[0.4em] uppercase block">
                  {placeType}
                </span>
              </div>

              {/* ELEVENLABS ANCIENT VOICE PLAYER */}
              <div className="bg-[#0a0a0f] border border-dungeon-gold/30 p-2.5 rounded shadow-[inset_0_0_12px_rgba(0,0,0,0.9)] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    {isSpeaking ? (
                      <div className="flex items-end space-x-0.5 h-3.5 px-1">
                        <span className="w-0.5 bg-dungeon-gold animate-sound-bar-1" />
                        <span className="w-0.5 bg-dungeon-gold animate-sound-bar-2" />
                        <span className="w-0.5 bg-dungeon-gold animate-sound-bar-3" />
                      </div>
                    ) : (
                      <span className="text-dungeon-gold text-sm">🔊</span>
                    )}
                    <div>
                      <span className="font-cinzel text-[9px] text-dungeon-gold font-bold tracking-widest uppercase block">
                        {isSpeaking
                          ? "THE ANCIENT VOICE SPEAKS"
                          : isAudioLoading
                          ? "SUMMONING THE WHISPER..."
                          : "ANCIENT NARRATION (ELEVENLABS)"}
                      </span>
                      <span className="font-lore italic text-[10px] text-dungeon-parchment/60">
                        {availableVoices.find((v) => v.id === voiceId)?.name || "Daniel"} —{" "}
                        {availableVoices.find((v) => v.id === voiceId)?.title || "The Ancient Whisperer"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {isSpeaking ? (
                      <button
                        type="button"
                        onClick={stopVoice}
                        className="px-2.5 py-1 bg-dungeon-burn border border-dungeon-ember text-dungeon-ember font-cinzel text-[8px] font-bold tracking-wider uppercase hover:bg-dungeon-ember hover:text-black transition-colors"
                      >
                        SILENCE
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isAudioLoading}
                        onClick={() => handlePlayVoice()}
                        className="px-2.5 py-1 bg-[#c9a84c]/20 border border-dungeon-gold text-dungeon-gold font-cinzel text-[8px] font-bold tracking-wider uppercase hover:bg-dungeon-gold hover:text-black transition-all shadow-[0_0_8px_rgba(201,168,76,0.3)] disabled:opacity-50"
                      >
                        {isAudioLoading ? "LOADING..." : "▶ PLAY VOICE"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Voice Character Picker */}
                <div className="flex items-center space-x-1 pt-1 border-t border-dungeon-gold/15 overflow-x-auto pb-0.5">
                  <span className="font-cinzel text-[7px] text-dungeon-gold/40 tracking-widest uppercase shrink-0 mr-1">
                    VOICE:
                  </span>
                  {availableVoices.map((v) => {
                    const isSelected = v.id === voiceId;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setVoiceId(v.id);
                          handlePlayVoice(v.id);
                        }}
                        className={`px-1.5 py-0.5 font-cinzel text-[8px] tracking-wider uppercase shrink-0 transition-colors ${
                          isSelected
                            ? "bg-dungeon-gold text-dungeon-bg font-bold shadow-[0_0_6px_rgba(201,168,76,0.6)]"
                            : "bg-[#0a0a0f] text-dungeon-parchment/60 border border-dungeon-gold/20 hover:border-dungeon-gold/50 hover:text-dungeon-parchment"
                        }`}
                        title={v.description}
                      >
                        {v.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION B — THE LORE ITSELF */}
              <div className="space-y-4">
                {/* LAYER 1 — SURFACE OBSERVATION (always visible) */}
                <div className="space-y-1">
                  <span className="font-cinzel text-[8px] text-dungeon-gold/50 tracking-widest uppercase">
                    [ SURFACE OBSERVATION ]
                  </span>
                  <p className="font-lore italic text-[15px] text-dungeon-parchment leading-relaxed">
                    {currentWaypoint.surfaceObservation || currentWaypoint.loreFragment}
                  </p>
                </div>

                {/* LAYER 2 — BURIED HISTORY (revealed with burnt manuscript effect) */}
                {currentWaypoint.buriedHistory && (
                  <div className="pt-2">
                    {!isBuriedHistoryRevealed ? (
                      /* Burnt mystery overlay */
                      <div className="relative p-4 bg-dungeon-burn border border-dungeon-ash/60 text-center space-y-2">
                        <p className="font-lore italic text-xs text-dungeon-parchment/40 filter blur-[2px] select-none">
                          In the third winter of the siege, the iron doors were marked with seal...
                        </p>
                        <button
                          type="button"
                          onClick={handleUncoverPast}
                          className="px-4 py-2 bg-[#0a0a0f] border border-dungeon-gold text-dungeon-gold font-cinzel text-[10px] tracking-widest uppercase hover:bg-dungeon-gold hover:text-black font-bold transition-all shadow-[0_0_10px_rgba(201,168,76,0.3)]"
                        >
                          ◆ UNCOVER THE PAST (+10 XP)
                        </button>
                      </div>
                    ) : (
                      /* Revealed historical lore */
                      <div className="p-3 bg-dungeon-ash/20 border-l-2 border-dungeon-gold space-y-1 animate-fade-in">
                        <span className="font-cinzel text-[8px] text-[#7a9a4c] tracking-widest uppercase font-bold">
                          [ RECOVERED TRUTH ]
                        </span>
                        <p className="font-lore italic text-[15px] text-dungeon-parchment leading-relaxed">
                          {currentWaypoint.buriedHistory}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION C — PHOTO PROMPT */}
              <div className="pt-2">
                {!currentWaypoint.userPhotoDataUrl ? (
                  /* User has NOT taken a photo yet */
                  <div
                    onClick={handleCapturePhoto}
                    className="w-full bg-[#c9a84c]/[0.08] border border-dashed border-[#c9a84c]/40 p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#c9a84c]/[0.15] transition-colors"
                  >
                    <svg className="w-6 h-6 text-dungeon-gold mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span className="font-cinzel text-[11px] text-dungeon-gold font-bold tracking-widest uppercase">
                      CAPTURE THIS MEMORY
                    </span>
                    <span className="font-cinzel text-[9px] text-dungeon-ember font-bold mt-0.5">
                      +30 XP REWARD
                    </span>
                  </div>
                ) : (
                  /* Polaroid frame when user HAS taken a photo */
                  <div className="relative inline-block mx-auto p-1.5 pb-4 bg-white shadow-[0_4px_15px_rgba(0,0,0,0.8)] -rotate-2 max-w-[200px]">
                    <img
                      src={currentWaypoint.userPhotoDataUrl}
                      alt={currentWaypoint.realPlaceName}
                      className="w-full aspect-[4/3] object-cover"
                    />
                    <div className="mt-1 text-center">
                      <span className="font-cinzel text-[9px] text-black font-bold tracking-widest uppercase">
                        MEMORY CAPTURED
                      </span>
                    </div>
                    {/* Retake button */}
                    <button
                      type="button"
                      onClick={handleCapturePhoto}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center text-[10px]"
                      title="Retake photo"
                    >
                      ↺
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION D — CONTINUE BUTTON (sticky bottom) */}
            <div className="sticky bottom-0 inset-x-0 bg-[#0a0a0f] p-4 pb-8 border-t border-dungeon-gold/30">
              <button
                type="button"
                onClick={handleContinueQuest}
                className="w-full h-14 bg-[#c9a84c]/15 border-[1.5px] border-[#c9a84c] text-dungeon-gold font-cinzel text-xs font-bold tracking-[0.3em] uppercase hover:bg-dungeon-gold hover:text-black transition-all active:scale-[0.98] shadow-[0_0_15px_rgba(201,168,76,0.2)]"
              >
                {isLastWaypoint ? "CLAIM YOUR ARTIFACT →" : "CONTINUE THE QUEST →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

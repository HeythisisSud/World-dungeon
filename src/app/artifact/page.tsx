"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuest } from "@/context/QuestContext";
import { DungeonMapSVG } from "@/components/DungeonMapSVG";
import { BurntManuscript } from "@/components/BurntManuscript";
import { WaypointPhoto } from "@/components/WaypointPhoto";
import { LevelBadge } from "@/components/LevelBadge";
import { XPFlash } from "@/components/XPFlash";
import { createManuscriptSegments } from "@/utils/manuscript";
import { downloadSvgAsPng } from "@/utils/svgToPng";
import { generateHeroCardPng } from "@/utils/heroCard";

export default function ArtifactPage() {
  const router = useRouter();
  const {
    currentQuest,
    walkStats,
    gpxTrace,
    unlockedWaypoints,
    playerLevel,
    isLevelUp,
    recentXPGain,
    questMeta,
    reset,
  } = useQuest();

  const [isExportingMap, setIsExportingMap] = useState<boolean>(false);
  const [isExportingHero, setIsExportingHero] = useState<boolean>(false);

  useEffect(() => {
    if (!currentQuest) {
      router.push("/");
    }
  }, [currentQuest, router]);

  if (!currentQuest) return null;

  const manuscriptSegments = createManuscriptSegments(currentQuest);
  // All segments revealed on artifact screen
  const revealedCount = manuscriptSegments.length;

  const handleDownloadMap = async () => {
    setIsExportingMap(true);
    try {
      await downloadSvgAsPng("dungeon-map-svg-element", "dungeon-map.png");
    } catch (err) {
      console.error("Map PNG export error:", err);
    } finally {
      setIsExportingMap(false);
    }
  };

  const handleShareHeroCard = async () => {
    setIsExportingHero(true);
    try {
      await generateHeroCardPng(currentQuest, walkStats, playerLevel);
    } catch (err) {
      console.error("Hero Card PNG export error:", err);
    } finally {
      setIsExportingHero(false);
    }
  };

  const formattedDate = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-dungeon-bg text-dungeon-parchment flex flex-col items-center justify-between p-4 sm:p-6 space-y-8 animate-fade-in relative">
      <XPFlash amount={recentXPGain} />

      {/* TOP HEADER */}
      <header className="w-full text-center space-y-3 pt-4 max-w-md">
        <span className="font-cinzel text-[10px] tracking-[0.3em] text-dungeon-gold/70 uppercase">
          [ QUEST ARTIFACT UNLOCKED ]
        </span>

        <h1 className="font-cinzel font-black text-2xl sm:text-3xl text-dungeon-gold tracking-[0.2em] leading-tight">
          {currentQuest.title}
        </h1>

        <div className="h-[1px] w-full bg-dungeon-gold/40 my-2" />
      </header>

      {/* CENTER MAP & ARTIFACT REWARD */}
      <section className="flex flex-col items-center justify-center space-y-6 w-full max-w-md text-center">
        {/* DUNGEON MAP SVG (340x340) */}
        <div className="p-2 border-2 border-dungeon-gold/80 bg-dungeon-bg shadow-2xl">
          <DungeonMapSVG quest={currentQuest} gpxTrace={gpxTrace} />
        </div>

        {/* QUEST SCROLL BURNT MANUSCRIPT */}
        <div className="w-full text-left space-y-3">
          <h2 className="font-cinzel font-bold text-sm text-dungeon-gold tracking-[0.25em] text-center uppercase">
            QUEST SCROLL
          </h2>

          <BurntManuscript segments={manuscriptSegments} revealedCount={revealedCount} />
        </div>

        {/* SCRAPBOOK FIELD JOURNAL WAYPOINT PHOTOS */}
        <div className="w-full space-y-4 pt-2">
          <h2 className="font-cinzel font-bold text-sm text-dungeon-gold tracking-[0.25em] text-center uppercase">
            FIELD JOURNAL & MEMORIES
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {currentQuest.waypoints.map((wp, idx) => (
              <div key={wp.sequence} className="space-y-2 text-left border border-dungeon-gold/30 p-3 bg-dungeon-ash/10">
                <div className="flex justify-between items-center text-xs font-cinzel text-dungeon-gold">
                  <span>WAYPOINT {wp.sequence}</span>
                  <span className="font-lore italic text-dungeon-parchment/70">{wp.realPlaceName}</span>
                </div>
                <WaypointPhoto
                  fetchedImageUrl={wp.fetchedImageUrl}
                  userPhotoDataUrl={wp.userPhotoDataUrl}
                  waypointName={wp.realPlaceName}
                  isUnlocked={true}
                  readOnly={true}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="w-full space-y-3 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownloadMap}
              disabled={isExportingMap}
              type="button"
              className="py-3 px-4 border border-dungeon-gold bg-dungeon-bg font-cinzel text-xs font-bold tracking-widest text-dungeon-gold hover:bg-dungeon-gold hover:text-dungeon-bg transition-colors border-radius-0 truncate"
            >
              {isExportingMap ? "EXPORTING..." : "DOWNLOAD MAP"}
            </button>

            <button
              onClick={handleShareHeroCard}
              disabled={isExportingHero}
              type="button"
              className="py-3 px-4 border border-dungeon-gold bg-dungeon-bg font-cinzel text-xs font-bold tracking-widest text-dungeon-gold hover:bg-dungeon-gold hover:text-dungeon-bg transition-colors border-radius-0 truncate"
            >
              {isExportingHero ? "GENERATING..." : "SHARE HERO CARD"}
            </button>
          </div>

          <button
            onClick={reset}
            type="button"
            className="w-full py-4 px-6 border-2 border-dungeon-gold bg-dungeon-gold font-cinzel text-sm font-bold tracking-[0.25em] text-dungeon-bg hover:bg-dungeon-bg hover:text-dungeon-gold transition-all active:scale-[0.98] border-radius-0 shadow-lg"
          >
            NEW QUEST
          </button>

          <button
            onClick={() => router.push("/journey")}
            type="button"
            className="w-full py-3.5 px-4 bg-transparent border border-dungeon-gold/35 hover:border-dungeon-gold/70 active:border-dungeon-gold font-cinzel text-xs font-bold text-dungeon-gold/70 hover:text-dungeon-gold tracking-[0.25em] transition-all flex items-center justify-center select-none active:scale-[0.98]"
          >
            SEE YOUR PATH →
          </button>
        </div>
      </section>

      {/* FOOTER STATS */}
      <footer className="w-full text-center space-y-4 pt-4 border-t border-dungeon-gold/20 max-w-md">
        <LevelBadge
          level={playerLevel.level}
          title={playerLevel.title}
          xp={playerLevel.xp}
          xpToNext={playerLevel.xpToNext}
          isLevelUp={isLevelUp}
        />

        {questMeta && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[9px] font-cinzel text-dungeon-gold/60 tracking-wider uppercase border border-dungeon-gold/20 py-1 px-2.5 bg-dungeon-bg/60">
            <span>◆ {questMeta.source === "live-backend" ? "LIVE REALM FORGE" : "ANCIENT ARCHIVE"}</span>
            {questMeta.modelUsed && <span>· {questMeta.modelUsed}</span>}
            {questMeta.landmarksFound && <span>· {questMeta.landmarksFound} OSM LANDMARKS</span>}
            {questMeta.generationMs && <span>· {(questMeta.generationMs / 1000).toFixed(1)}s GEN</span>}
          </div>
        )}

        <p className="font-lore text-xs text-dungeon-parchment/70 italic">
          Distance walked: {walkStats.distanceMeters}m · Waypoints: {unlockedWaypoints.length}/
          {currentQuest.waypoints.length} · {formattedDate}
        </p>
      </footer>
    </main>
  );
}

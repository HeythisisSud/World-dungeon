"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArtifactData, PlayerLevel, Quest, QuestMeta, WalkStats, Waypoint } from "@/types/quest";
import { INITIAL_PLAYER_LEVEL, calculateNewLevel } from "@/utils/xp";
import { splitLore } from "@/utils/loreSplitter";
import { fetchMapillaryImage } from "@/services/mapillary";
import { getAvailableVoiceId, prefetchQuestAudio } from "@/services/elevenlabs";

export type BackendStatus = {
  isConnected: boolean;
  status: "ok" | "degraded" | "error" | "offline";
  model?: string;
  url?: string;
};

interface QuestContextType {
  currentQuest: Quest | null;
  currentWaypointIndex: number;
  unlockedWaypoints: number[];
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (loc: { lat: number; lng: number } | null) => void;
  walkStats: WalkStats;
  gpxTrace: Array<{ lat: number; lng: number; timestamp: number }>;
  isGenerating: boolean;
  isComplete: boolean;
  playerLevel: PlayerLevel;
  isLevelUp: boolean;
  recentXPGain: number | null;
  questMeta: QuestMeta | null;
  backendStatus: BackendStatus | null;
  preGeneratedAudio: Array<{
    cueAudio: ArrayBuffer | null;
    loreAudio: ArrayBuffer | null;
  }> | null;
  audioReady: boolean;
  
  // Actions
  generateQuest: (lat: number, lng: number) => Promise<void>;
  unlockWaypoint: (index: number) => void;
  advanceToNextWaypoint: () => void;
  saveUserPhoto: (waypointIndex: number, dataUrl: string) => void;
  completeQuest: () => void;
  reset: () => void;
  addXP: (amount: number) => void;
  updateDistanceWalked: (distanceDeltaMeters: number) => void;
  recordGPXPoint: (lat: number, lng: number) => void;
  checkBackendHealth: () => Promise<void>;
}

const QuestContext = createContext<QuestContextType | undefined>(undefined);

const LOCAL_STORAGE_SESSION_KEY = "wd_session";
const LOCAL_STORAGE_PLAYER_KEY = "wd_player";

export function QuestProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [currentQuest, setCurrentQuest] = useState<Quest | null>(null);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState<number>(0);
  const [unlockedWaypoints, setUnlockedWaypoints] = useState<number[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [walkStats, setWalkStats] = useState<WalkStats>({
    distanceMeters: 0,
    startTime: null,
    endTime: null,
    waypointsUnlocked: 0,
    photosTooken: 0,
  });
  const [gpxTrace, setGpxTrace] = useState<Array<{ lat: number; lng: number; timestamp: number }>>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [playerLevel, setPlayerLevel] = useState<PlayerLevel>(INITIAL_PLAYER_LEVEL);
  const [isLevelUp, setIsLevelUp] = useState<boolean>(false);
  const [recentXPGain, setRecentXPGain] = useState<number | null>(null);
  const [questMeta, setQuestMeta] = useState<QuestMeta | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [preGeneratedAudio, setPreGeneratedAudio] = useState<Array<{
    cueAudio: ArrayBuffer | null;
    loreAudio: ArrayBuffer | null;
  }> | null>(null);
  const [audioReady, setAudioReady] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Check backend health
  const checkBackendHealth = async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setBackendStatus({
          isConnected: Boolean(data.backendConnected),
          status: data.status || "ok",
          model: data.services?.ollama?.model || data.model || "gemma2:2b",
          url: data.backendUrl || "http://localhost:3001",
        });
        return;
      }
    } catch {
      // Backend probe failed
    }

    setBackendStatus({
      isConnected: false,
      status: "offline",
      model: "gemma2:2b (archive mode)",
      url: "http://localhost:3001",
    });
  };

  // Initial health check on mount
  useEffect(() => {
    checkBackendHealth();
    // Periodically re-check health every 30s
    const timer = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(timer);
  }, []);

  // Load state from localStorage on initial render
  useEffect(() => {
    try {
      const savedPlayer = localStorage.getItem(LOCAL_STORAGE_PLAYER_KEY);
      if (savedPlayer) {
        setPlayerLevel(JSON.parse(savedPlayer));
      }

      const savedSession = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (savedSession) {
        const data = JSON.parse(savedSession);
        if (data.currentQuest) setCurrentQuest(data.currentQuest);
        if (typeof data.currentWaypointIndex === "number") setCurrentWaypointIndex(data.currentWaypointIndex);
        if (Array.isArray(data.unlockedWaypoints)) setUnlockedWaypoints(data.unlockedWaypoints);
        if (data.walkStats) {
          setWalkStats({
            ...data.walkStats,
            startTime: data.walkStats.startTime ? new Date(data.walkStats.startTime) : null,
            endTime: data.walkStats.endTime ? new Date(data.walkStats.endTime) : null,
          });
        }
        if (Array.isArray(data.gpxTrace)) setGpxTrace(data.gpxTrace);
        if (typeof data.isComplete === "boolean") setIsComplete(data.isComplete);
        if (data.questMeta) setQuestMeta(data.questMeta);
      }
    } catch (err) {
      console.error("Failed to rehydrate state from localStorage", err);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save session & player level on state changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_PLAYER_KEY, JSON.stringify(playerLevel));
    } catch (err) {
      console.error("Failed to save player level to localStorage", err);
    }
  }, [playerLevel, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      const sessionData = {
        currentQuest,
        currentWaypointIndex,
        unlockedWaypoints,
        walkStats,
        gpxTrace,
        isComplete,
        questMeta,
      };
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(sessionData));
    } catch (err) {
      console.error("Failed to save session state to localStorage", err);
    }
  }, [currentQuest, currentWaypointIndex, unlockedWaypoints, walkStats, gpxTrace, isComplete, questMeta, isHydrated]);

  const triggerXPGainNotification = (amount: number) => {
    setRecentXPGain(amount);
    setTimeout(() => {
      setRecentXPGain(null);
    }, 1600);
  };

  const addXP = (amount: number) => {
    if (amount <= 0) return;
    triggerXPGainNotification(amount);
    setPlayerLevel((prev) => {
      const { updatedPlayer, isLevelUp: levelUpTriggered } = calculateNewLevel(prev, amount);
      if (levelUpTriggered) {
        setIsLevelUp(true);
        setTimeout(() => setIsLevelUp(false), 3000);
      }
      return updatedPlayer;
    });
  };

  const generateQuest = async (lat: number, lng: number) => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-quest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });

      if (!res.ok) throw new Error("Failed to generate quest");
      const data = await res.json();
      
      const questData: Quest = data.quest || data;
      const metaData: QuestMeta | null = data.meta || null;
      setQuestMeta(metaData);

      // Enrich and populate images/lore for each waypoint in parallel
      const enrichedWaypoints = await Promise.all(
        questData.waypoints.map(async (wp: Waypoint) => {
          // 1. Split lore into surfaceObservation & buriedHistory
          const { surfaceObservation, buriedHistory } = splitLore(wp.loreFragment);

          // 2. Fetch Mapillary street-level image if available
          let mapillaryImageUrl: string | null = null;
          let mapillaryAvailable = false;
          try {
            mapillaryImageUrl = await fetchMapillaryImage(wp.coords.lat, wp.coords.lng);
            mapillaryAvailable = Boolean(mapillaryImageUrl);
          } catch {
            mapillaryAvailable = false;
          }

          // 3. Fallback image from Wikimedia if Mapillary not available
          let fetchedImageUrl = mapillaryImageUrl || wp.fetchedImageUrl || null;
          if (!fetchedImageUrl) {
            try {
              const imgRes = await fetch(
                `/api/fetch-place-image?place=${encodeURIComponent(wp.realPlaceName)}`
              );
              if (imgRes.ok) {
                const imgData = await imgRes.json();
                fetchedImageUrl = imgData.imageUrl || null;
              }
            } catch {
              // Ignore failure
            }
          }

          return {
            ...wp,
            surfaceObservation,
            buriedHistory,
            mapillaryImageUrl,
            mapillaryAvailable,
            fetchedImageUrl,
            userPhotoDataUrl: wp.userPhotoDataUrl || null,
          };
        })
      );

      const finalQuest = { ...questData, waypoints: enrichedWaypoints };
      setCurrentQuest(finalQuest);
      setCurrentWaypointIndex(0);
      setUnlockedWaypoints([]);
      setWalkStats({
        distanceMeters: 0,
        startTime: new Date(),
        endTime: null,
        waypointsUnlocked: 0,
        photosTooken: 0,
      });
      setGpxTrace([{ lat, lng, timestamp: Date.now() }]);
      setIsComplete(false);

      // Pre-generate all audio in background without blocking navigation
      const hasKey = !!(
        process.env.NEXT_PUBLIC_ELEVENLABS_KEY ||
        process.env.NEXT_PUBLIC_ELEVENLABS_KEYS
      );

      if (hasKey) {
        getAvailableVoiceId()
          .then((voiceId) => {
            prefetchQuestAudio(finalQuest.waypoints, voiceId)
              .then((audio) => {
                setPreGeneratedAudio(audio);
                setAudioReady(true);
              })
              .catch(() => {
                setAudioReady(false);
              });
          })
          .catch(() => {
            setAudioReady(false);
          });
      }

      router.push("/walk");
    } catch (error) {
      console.error("Quest generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const unlockWaypoint = (index: number) => {
    if (!unlockedWaypoints.includes(index)) {
      setUnlockedWaypoints((prev) => [...prev, index]);
      setWalkStats((prev) => ({
        ...prev,
        waypointsUnlocked: prev.waypointsUnlocked + 1,
      }));
      // Grant +20 XP per waypoint unlocked
      addXP(20);
    }
  };

  const advanceToNextWaypoint = () => {
    if (currentQuest && currentWaypointIndex < currentQuest.waypoints.length - 1) {
      setCurrentWaypointIndex((prev) => prev + 1);
    }
  };

  const saveUserPhoto = (waypointIndex: number, dataUrl: string) => {
    if (!currentQuest) return;
    const updatedWaypoints = [...currentQuest.waypoints];
    const targetWp = updatedWaypoints[waypointIndex];
    if (!targetWp) return;

    const isFirstPhotoForWaypoint = !targetWp.userPhotoDataUrl;

    updatedWaypoints[waypointIndex] = {
      ...targetWp,
      userPhotoDataUrl: dataUrl,
    };

    setCurrentQuest({ ...currentQuest, waypoints: updatedWaypoints });

    if (isFirstPhotoForWaypoint) {
      setWalkStats((prev) => ({ ...prev, photosTooken: prev.photosTooken + 1 }));
    }

    // Grant +30 XP per photo captured
    addXP(30);
  };

  const updateDistanceWalked = (distanceDeltaMeters: number) => {
    if (distanceDeltaMeters <= 0) return;
    setWalkStats((prev) => {
      const newDistance = prev.distanceMeters + distanceDeltaMeters;
      // Also update player total distance
      setPlayerLevel((pl) => ({
        ...pl,
        totalDistanceMeters: pl.totalDistanceMeters + distanceDeltaMeters,
      }));
      return { ...prev, distanceMeters: newDistance };
    });
  };

  const recordGPXPoint = (lat: number, lng: number) => {
    setGpxTrace((prev) => [...prev, { lat, lng, timestamp: Date.now() }]);
  };

  const completeQuest = () => {
    const endTime = new Date();
    setIsComplete(true);
    setWalkStats((prev) => ({ ...prev, endTime }));

    // Calculate quest completion XP bonuses
    let bonusXP = 50; // Base completion XP
    const totalWps = currentQuest?.waypoints.length || 0;
    const totalUnlocked = unlockedWaypoints.length;
    const userPhotosCount = currentQuest?.waypoints.filter((w) => w.userPhotoDataUrl).length || 0;

    if (totalUnlocked === totalWps && totalWps > 0) {
      bonusXP += 25; // All waypoints unlocked bonus
    }
    if (userPhotosCount === totalWps && totalWps > 0) {
      bonusXP += 50; // All user photos taken bonus
    }
    // Distance bonus: +1 XP per 100 meters walked
    const distanceBonus = Math.floor(walkStats.distanceMeters / 100);
    bonusXP += distanceBonus;

    addXP(bonusXP);

    setPlayerLevel((pl) => ({
      ...pl,
      totalQuestsCompleted: pl.totalQuestsCompleted + 1,
    }));

    // Record quest completion into history
    if (currentQuest) {
      let stampImageUrl: string | null = null;
      for (const waypoint of currentQuest.waypoints) {
        if (waypoint.userPhotoDataUrl) {
          stampImageUrl = waypoint.userPhotoDataUrl;
          break;
        }
      }
      if (!stampImageUrl) {
        for (const waypoint of currentQuest.waypoints) {
          if (waypoint.mapillaryImageUrl) {
            stampImageUrl = waypoint.mapillaryImageUrl;
            break;
          }
        }
      }

      const startCoords = currentQuest.waypoints[0]?.coords ?? { lat: 28.5934, lng: 77.2090 };
      const completedEntry = {
        id: String(Date.now()),
        title: currentQuest.title,
        completedAt: Date.now(),
        waypointCount: unlockedWaypoints.length || walkStats.waypointsUnlocked,
        distanceMeters: walkStats.distanceMeters,
        level: playerLevel.level,
        stampImageUrl,
        artifactName: currentQuest.artifactName,
        coords: {
          lat: startCoords.lat,
          lng: startCoords.lng,
        },
      };

      try {
        const stored = localStorage.getItem("wd_quest_history");
        const history = stored ? JSON.parse(stored) : [];
        history.push(completedEntry);
        localStorage.setItem("wd_quest_history", JSON.stringify(history));
      } catch (e) {
        console.error("Failed to save completed quest to history", e);
      }
    }

    router.push("/artifact");
  };

  const reset = () => {
    setCurrentQuest(null);
    setCurrentWaypointIndex(0);
    setUnlockedWaypoints([]);
    setWalkStats({
      distanceMeters: 0,
      startTime: null,
      endTime: null,
      waypointsUnlocked: 0,
      photosTooken: 0,
    });
    setGpxTrace([]);
    setIsComplete(false);
    setQuestMeta(null);
    setPreGeneratedAudio(null);
    setAudioReady(false);
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    router.push("/");
  };

  return (
    <QuestContext.Provider
      value={{
        currentQuest,
        currentWaypointIndex,
        unlockedWaypoints,
        userLocation,
        setUserLocation,
        walkStats,
        gpxTrace,
        isGenerating,
        isComplete,
        playerLevel,
        isLevelUp,
        recentXPGain,
        questMeta,
        backendStatus,
        preGeneratedAudio,
        audioReady,
        generateQuest,
        unlockWaypoint,
        advanceToNextWaypoint,
        saveUserPhoto,
        completeQuest,
        reset,
        addXP,
        updateDistanceWalked,
        recordGPXPoint,
        checkBackendHealth,
      }}
    >
      {children}
    </QuestContext.Provider>
  );
}

export function useQuest() {
  const context = useContext(QuestContext);
  if (!context) {
    throw new Error("useQuest must be used within a QuestProvider");
  }
  return context;
}

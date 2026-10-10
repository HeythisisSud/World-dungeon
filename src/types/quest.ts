export type LoreTier = {
  distanceMeters: number;
  label: string;
  text: string;
};

export type Waypoint = {
  sequence: number;
  realPlaceName: string;
  coords: { lat: number; lng: number };
  loreFragment: string;
  unlockCue: string;
  fetchedImageUrl: string | null;
  userPhotoDataUrl: string | null;
  // Multi-tier whisper system & street-level photography
  loreTiers?: LoreTier[];
  historicalYear?: string | number;
  audioDroneHz?: number;
  // Added after quest is received, before display
  surfaceObservation?: string;
  buriedHistory?: string;
  mapillaryImageUrl?: string | null;
  mapillaryAvailable?: boolean;
};

export type Quest = {
  title: string;
  premise: string;
  tone: "dark" | "mythic" | "eerie" | "folkloric";
  waypoints: Waypoint[];
  resolution: string;
  artifactName: string;
};

export type QuestMeta = {
  landmarksFound?: number;
  modelUsed?: string;
  generationMs?: number;
  totalMs?: number;
  enriched?: boolean;
  insufficientLandmarks?: boolean;
  source?: "live-backend" | "archive-fallback";
};

export type WalkStats = {
  distanceMeters: number;
  startTime: Date | null;
  endTime: Date | null;
  waypointsUnlocked: number;
  photosTooken: number;
};

export type ArtifactData = {
  quest: Quest;
  stats: WalkStats;
  gpxTrace: Array<{ 
    lat: number;
    lng: number;
    timestamp: number; 
  }>;
};

export type PlayerLevel = {
  level: number;
  xp: number;
  xpToNext: number;
  title: string;
  totalQuestsCompleted: number;
  totalDistanceMeters: number;
};

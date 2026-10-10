import { PlayerLevel } from "@/types/quest";

export const LEVEL_TITLES: Record<number, string> = {
  1: "The Wanderer",
  2: "The Curious",
  3: "The Initiated",
  4: "The Seeker",
  5: "The Cartographer",
  6: "The Keeper",
  7: "The Unbound",
  8: "The Ancient",
  9: "The Forsaken",
  10: "The Dungeon Master",
};

export const XP_THRESHOLDS: Record<number, number> = {
  1: 100,
  2: 250,
  3: 500,
  4: 900,
  5: 1400,
  6: 2000,
  7: 2700,
  8: 3500,
  9: 4500,
  10: 99999, // Max level cap
};

export const INITIAL_PLAYER_LEVEL: PlayerLevel = {
  level: 1,
  xp: 0,
  xpToNext: 100,
  title: LEVEL_TITLES[1],
  totalQuestsCompleted: 0,
  totalDistanceMeters: 0,
};

export function getTitleForLevel(level: number): string {
  return LEVEL_TITLES[level] || LEVEL_TITLES[10];
}

export function getXPToNextForLevel(level: number): number {
  return XP_THRESHOLDS[level] || 99999;
}

export function calculateNewLevel(
  current: PlayerLevel,
  addedXP: number
): { updatedPlayer: PlayerLevel; isLevelUp: boolean } {
  let newXP = current.xp + addedXP;
  let newLevel = current.level;
  let isLevelUp = false;

  while (newLevel < 10 && newXP >= XP_THRESHOLDS[newLevel]) {
    newLevel += 1;
    isLevelUp = true;
  }

  const updatedPlayer: PlayerLevel = {
    ...current,
    level: newLevel,
    xp: newXP,
    xpToNext: getXPToNextForLevel(newLevel),
    title: getTitleForLevel(newLevel),
  };

  return { updatedPlayer, isLevelUp };
}

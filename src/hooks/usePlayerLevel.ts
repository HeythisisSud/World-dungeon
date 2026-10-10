"use client";

import { useQuest } from "@/context/QuestContext";
import { INITIAL_PLAYER_LEVEL } from "@/utils/xp";

export function usePlayerLevel() {
  const { playerLevel, addXP, isLevelUp, recentXPGain } = useQuest();

  const resetLevel = () => {
    localStorage.removeItem("wd_player");
    window.location.reload();
  };

  return {
    playerLevel,
    addXP,
    isLevelUp,
    recentXPGain,
    resetLevel,
  };
}

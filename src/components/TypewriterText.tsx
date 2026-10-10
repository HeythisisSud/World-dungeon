"use client";

import React, { useEffect, useState } from "react";

interface TypewriterTextProps {
  text: string;
  speedMs?: number; // ms per word or character
  mode?: "word" | "character";
  className?: string;
  onComplete?: () => void;
}

export function TypewriterText({
  text,
  speedMs = 40,
  mode = "word",
  className = "",
  onComplete,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState<string>("");

  useEffect(() => {
    setDisplayedText("");
    if (!text) return;

    if (mode === "word") {
      const words = text.split(" ");
      let currentIdx = 0;

      const interval = setInterval(() => {
        currentIdx++;
        setDisplayedText(words.slice(0, currentIdx).join(" "));
        if (currentIdx >= words.length) {
          clearInterval(interval);
          if (onComplete) onComplete();
        }
      }, speedMs);

      return () => clearInterval(interval);
    } else {
      let currentIdx = 0;
      const interval = setInterval(() => {
        currentIdx++;
        setDisplayedText(text.slice(0, currentIdx));
        if (currentIdx >= text.length) {
          clearInterval(interval);
          if (onComplete) onComplete();
        }
      }, speedMs);

      return () => clearInterval(interval);
    }
  }, [text, speedMs, mode, onComplete]);

  return <span className={className}>{displayedText}</span>;
}

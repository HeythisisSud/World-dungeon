"use client";

import { useState } from "react";

export function useCamera() {
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);

  const openCamera = (): Promise<string | null> => {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.setAttribute("capture", "environment");

      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          setLastPhoto(dataUrl);
          resolve(dataUrl);
        };
        reader.onerror = () => {
          resolve(null);
        };
        reader.readAsDataURL(file);
      };

      // Trigger user file picker dialog
      input.click();
    });
  };

  return {
    openCamera,
    lastPhoto,
  };
}

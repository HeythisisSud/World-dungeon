"use client";

import React, { useEffect, useState } from "react";
import { useCamera } from "@/hooks/useCamera";
import { fetchMapillaryImage } from "@/services/mapillary";
import { GeneratedLocationArt } from "@/components/GeneratedLocationArt";

interface WaypointPhotoProps {
  fetchedImageUrl: string | null;
  userPhotoDataUrl: string | null;
  waypointName: string;
  isUnlocked: boolean;
  onPhotoTaken?: (dataUrl: string) => void;
  readOnly?: boolean;
  className?: string;
  coords?: { lat: number; lng: number };
}

export function WaypointPhoto({
  fetchedImageUrl,
  userPhotoDataUrl,
  waypointName,
  isUnlocked,
  onPhotoTaken,
  readOnly = false,
  className = "",
  coords,
}: WaypointPhotoProps) {
  const { openCamera } = useCamera();
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(fetchedImageUrl);
  const [imageSource, setImageSource] = useState<string>("archive");
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(false);

  // If user photo or Wikimedia photo exists, or fetch open Mapillary photo
  useEffect(() => {
    if (userPhotoDataUrl) {
      setActiveImageUrl(userPhotoDataUrl);
      setImageSource("user_photo");
      return;
    }

    if (fetchedImageUrl) {
      setActiveImageUrl(fetchedImageUrl);
      setImageSource("wikimedia");
      return;
    }

    // Try fetching via open community Mapillary if coordinates present
    if (coords && !activeImageUrl) {
      setIsLoadingImage(true);
      fetchMapillaryImage(coords.lat, coords.lng)
        .then((url) => {
          if (url) {
            setActiveImageUrl(url);
            setImageSource("mapillary");
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingImage(false));
    }
  }, [fetchedImageUrl, userPhotoDataUrl, coords, activeImageUrl]);

  const handleCameraClick = async () => {
    if (readOnly || !onPhotoTaken) return;
    const captured = await openCamera();
    if (captured) {
      onPhotoTaken(captured);
    }
  };

  // LOCKED STATE
  if (!isUnlocked) {
    return (
      <div className={`relative aspect-[16/9] w-full bg-dungeon-ash/30 border border-dungeon-gold/30 flex flex-col items-center justify-center p-4 text-center overflow-hidden ${className}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,168,76,0.05),transparent_70%)] pointer-events-none" />
        <span className="text-dungeon-gold text-2xl mb-1 select-none animate-pulse">◆</span>
        <span className="font-lore text-dungeon-parchment/60 text-sm italic">{waypointName}</span>
        <span className="font-cinzel text-[9px] text-dungeon-gold/40 tracking-[0.25em] mt-2 uppercase border border-dungeon-gold/20 px-2 py-0.5">
          [ SANCTUM VEILED — APPROACH WITHIN 20M ]
        </span>
      </div>
    );
  }

  // UNLOCKED STATE - User Photo Taken
  if (userPhotoDataUrl) {
    return (
      <div className={`relative aspect-[16/9] w-full border border-dungeon-gold overflow-hidden group shadow-[0_0_15px_rgba(201,168,76,0.25)] ${className}`}>
        <img
          src={userPhotoDataUrl}
          alt={waypointName}
          className="w-full h-full object-cover"
        />

        {/* Cinematic Vignette Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(10,10,15,0.75)_100%)]" />

        {/* Top Left Badge: Your Memory */}
        <div className="absolute top-2 left-2 flex items-center space-x-1.5 bg-dungeon-bg/90 border border-dungeon-gold px-2.5 py-1 backdrop-blur-sm">
          <span className="text-dungeon-gold text-xs">◆</span>
          <span className="font-cinzel text-[10px] text-dungeon-gold tracking-widest uppercase">
            YOUR MEMORY
          </span>
        </div>

        {/* Top Right Retake Button */}
        {!readOnly && onPhotoTaken && (
          <button
            onClick={handleCameraClick}
            type="button"
            className="absolute top-2 right-2 w-8 h-8 rounded-full border border-dungeon-gold bg-dungeon-bg/90 flex items-center justify-center text-dungeon-gold hover:bg-dungeon-gold hover:text-dungeon-bg transition-colors"
            title="Retake field encounter (+30 XP)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        )}

        {/* Bottom Title Bar */}
        <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-dungeon-bg via-dungeon-bg/80 to-transparent flex justify-between items-end">
          <p className="font-cinzel text-xs text-dungeon-gold tracking-wider truncate">{waypointName}</p>
          <span className="font-cinzel text-[9px] text-[#7a9a4c] uppercase tracking-wider">VERIFIED RECALL</span>
        </div>
      </div>
    );
  }

  // UNLOCKED STATE - Mapillary or Wikimedia Image
  if (activeImageUrl) {
    return (
      <div className={`relative aspect-[16/9] w-full border border-dungeon-gold/80 overflow-hidden shadow-[0_0_12px_rgba(201,168,76,0.2)] ${className}`}>
        <img
          src={activeImageUrl}
          alt={waypointName}
          className="w-full h-full object-cover filter contrast-105"
        />

        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_35%,rgba(10,10,15,0.7)_100%)]" />

        {/* Top Left Source Badge */}
        <div className="absolute top-2 left-2 flex items-center space-x-1.5 bg-dungeon-bg/85 border border-dungeon-gold/60 px-2 py-0.5">
          <span className="text-dungeon-gold text-[10px]">👁</span>
          <span className="font-cinzel text-[9px] text-dungeon-gold tracking-wider uppercase">
            {imageSource === "mapillary" ? "MAPILLARY VISION" : "SPECTRAL SIGHT"}
          </span>
        </div>

        {/* Bottom Content & Camera Button */}
        <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between bg-gradient-to-t from-dungeon-bg via-dungeon-bg/80 to-transparent">
          <p className="font-cinzel text-xs text-dungeon-gold tracking-wider truncate max-w-[70%] drop-shadow">
            {waypointName}
          </p>

          {!readOnly && onPhotoTaken && (
            <button
              onClick={handleCameraClick}
              type="button"
              className="w-12 h-12 rounded-full border-2 border-dungeon-gold bg-dungeon-bg/95 flex items-center justify-center text-dungeon-gold hover:bg-dungeon-gold hover:text-dungeon-bg transition-all active:scale-95 shadow-[0_0_10px_rgba(201,168,76,0.5)]"
              title="Photograph this encounter (+30 XP)"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  // UNLOCKED STATE - Procedural Dungeon Map Illustration (when no external photo exists)
  return (
    <div className={`relative aspect-[16/9] w-full border border-dungeon-gold/80 overflow-hidden shadow-[0_0_12px_rgba(201,168,76,0.2)] ${className}`}>
      {coords ? (
        <GeneratedLocationArt
          lat={coords.lat}
          lng={coords.lng}
          placeName={waypointName}
        />
      ) : (
        <div className="w-full h-full bg-[#0a0a0f] flex items-center justify-center">
          <span className="font-cinzel text-xs text-dungeon-gold/60">DIVINING CARTOGRAPHY...</span>
        </div>
      )}

      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_45%,rgba(10,10,15,0.7)_100%)]" />

      {/* Top Left Source Badge */}
      <div className="absolute top-2 left-2 flex items-center space-x-1.5 bg-dungeon-bg/85 border border-dungeon-gold/60 px-2 py-0.5">
        <span className="text-dungeon-gold text-[10px]">✦</span>
        <span className="font-cinzel text-[9px] text-dungeon-gold tracking-wider uppercase">
          PROCEDURAL CARTOGRAPHY
        </span>
      </div>

      {/* Bottom Content & Camera Button */}
      <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between bg-gradient-to-t from-dungeon-bg via-dungeon-bg/80 to-transparent">
        <p className="font-cinzel text-xs text-dungeon-gold tracking-wider truncate max-w-[70%] drop-shadow">
          {waypointName}
        </p>

        {!readOnly && onPhotoTaken && (
          <button
            onClick={handleCameraClick}
            type="button"
            className="w-12 h-12 rounded-full border-2 border-dungeon-gold bg-dungeon-bg/95 flex items-center justify-center text-dungeon-gold hover:bg-dungeon-gold hover:text-dungeon-bg transition-all active:scale-95 shadow-[0_0_10px_rgba(201,168,76,0.5)]"
            title="Photograph this encounter (+30 XP)"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

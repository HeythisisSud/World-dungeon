import { Quest, WalkStats, PlayerLevel } from "@/types/quest";

export function generateHeroCardPng(
  quest: Quest,
  stats: WalkStats,
  playerLevel: PlayerLevel
): Promise<void> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      resolve();
      return;
    }

    const firstWaypoint = quest.waypoints[0];
    const bgImageSrc = firstWaypoint?.userPhotoDataUrl || firstWaypoint?.fetchedImageUrl;

    const drawContent = (bgImg?: HTMLImageElement) => {
      // 1. Draw Background
      if (bgImg) {
        // Draw image covering 1080x1080
        const hRatio = canvas.width / bgImg.width;
        const vRatio = canvas.height / bgImg.height;
        const ratio = Math.max(hRatio, vRatio);
        const centerShiftX = (canvas.width - bgImg.width * ratio) / 2;
        const centerShiftY = (canvas.height - bgImg.height * ratio) / 2;

        ctx.drawImage(
          bgImg,
          0,
          0,
          bgImg.width,
          bgImg.height,
          centerShiftX,
          centerShiftY,
          bgImg.width * ratio,
          bgImg.height * ratio
        );
      } else {
        ctx.fillStyle = "#0a0a0f";
        ctx.fillRect(0, 0, 1080, 1080);
      }

      // Dark Overlay (65% opacity #0a0a0f)
      ctx.fillStyle = "rgba(10, 10, 15, 0.65)";
      ctx.fillRect(0, 0, 1080, 1080);

      // Aged Outer Gold Border
      ctx.strokeStyle = "#c9a84c";
      ctx.lineWidth = 12;
      ctx.strokeRect(30, 30, 1020, 1020);

      ctx.lineWidth = 3;
      ctx.strokeRect(48, 48, 984, 984);

      // 2. Top Third: Quest Title
      ctx.fillStyle = "#c9a84c";
      ctx.font = "bold 52px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const titleText = quest.title.toUpperCase();
      ctx.fillText(titleText, 540, 260);

      // 3. Middle: Gold Rule
      ctx.strokeStyle = "#c9a84c";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(200, 340);
      ctx.lineTo(880, 340);
      ctx.stroke();

      // 4. Premise First Sentence
      ctx.fillStyle = "#e8e0d0";
      ctx.font = "italic 36px serif";
      const firstSentence = quest.premise.split(".")[0] + ".";

      // Simple word wrapping
      const words = firstSentence.split(" ");
      let line = "";
      let y = 440;
      const maxWidth = 800;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, 540, y);
          line = words[n] + " ";
          y += 54;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 540, y);

      // 5. Bottom Strip (15% height = ~160px)
      const stripY = 918;
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(48, stripY, 984, 114);

      ctx.strokeStyle = "#c9a84c";
      ctx.lineWidth = 2;
      ctx.strokeRect(48, stripY, 984, 114);

      // Left: WORLD DUNGEON
      ctx.fillStyle = "#c9a84c";
      ctx.font = "bold 26px serif";
      ctx.textAlign = "left";
      ctx.fillText("WORLD DUNGEON", 80, stripY + 60);

      // Center: Walk Stats
      ctx.fillStyle = "#e8e0d0";
      ctx.font = "24px serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `WALKED ${stats.distanceMeters}m · WAYPOINTS ${stats.waypointsUnlocked}/${quest.waypoints.length}`,
        540,
        stripY + 60
      );

      // Right: Level Title
      ctx.fillStyle = "#c9a84c";
      ctx.font = "bold 24px serif";
      ctx.textAlign = "right";
      ctx.fillText(`LVL ${playerLevel.level} ${playerLevel.title.toUpperCase()}`, 1000, stripY + 60);

      // Trigger Download
      const titleSlug = quest.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `world-dungeon-${titleSlug}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      resolve();
    };

    if (bgImageSrc) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => drawContent(img);
      img.onerror = () => drawContent();
      img.src = bgImageSrc;
    } else {
      drawContent();
    }
  });
}

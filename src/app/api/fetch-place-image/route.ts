import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const placeName = searchParams.get("place");
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";

  if (!placeName) {
    return NextResponse.json({ imageUrl: null });
  }

  // 1. Try forwarding to backend service
  try {
    const backendRes = await fetch(
      `${backendUrl}/api/fetch-image?place=${encodeURIComponent(placeName)}`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data.success && data.imageUrl !== undefined) {
        return NextResponse.json({ imageUrl: data.imageUrl, source: "backend" });
      }
    }
  } catch {
    // Backend offline — proceed to direct fallback
  }

  // 2. Direct Wikimedia / Wikipedia lookup fallback
  try {
    // Strategy 1: Wikipedia summary API
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      placeName.replace(/\s+/g, "_")
    )}`;
    const wikiRes = await fetch(wikiUrl, {
      headers: { "User-Agent": "WorldDungeonPWA/1.0 (contact@worlddungeon.app)" },
      signal: AbortSignal.timeout(4000),
    });

    if (wikiRes.ok) {
      const summaryData = await wikiRes.json();
      if (summaryData.thumbnail?.source) {
        return NextResponse.json({ imageUrl: summaryData.thumbnail.source, source: "wikipedia" });
      }
    }

    // Strategy 2: Wikimedia Commons File API
    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(
      placeName
    )}&prop=imageinfo&iiprop=url&format=json&origin=*`;
    const commonsRes = await fetch(commonsUrl, {
      headers: { "User-Agent": "WorldDungeonPWA/1.0 (contact@worlddungeon.app)" },
      signal: AbortSignal.timeout(4000),
    });

    if (commonsRes.ok) {
      const data = await commonsRes.json();
      const pages = data.query?.pages;
      if (pages) {
        const pageKey = Object.keys(pages)[0];
        if (pageKey && pageKey !== "-1") {
          const imageInfo = pages[pageKey]?.imageinfo?.[0];
          if (imageInfo?.url) {
            return NextResponse.json({ imageUrl: imageInfo.url, source: "commons" });
          }
        }
      }
    }
  } catch (error) {
    console.error("Direct image fetch error:", error);
  }

  return NextResponse.json({ imageUrl: null });
}

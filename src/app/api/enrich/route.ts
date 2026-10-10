import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const placeName = searchParams.get("place");
  const city = searchParams.get("city") || "Delhi";
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";

  if (!placeName) {
    return NextResponse.json({ success: false, enrichment: null });
  }

  try {
    const res = await fetch(
      `${backendUrl}/api/enrich?place=${encodeURIComponent(placeName)}&city=${encodeURIComponent(city)}`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Backend offline or SerpApi not configured
  }

  return NextResponse.json({
    success: true,
    enrichment: null,
    place: placeName,
    serpApiConfigured: false,
  });
}

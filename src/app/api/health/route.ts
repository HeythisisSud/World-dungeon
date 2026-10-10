import { NextResponse } from "next/server";

export async function GET() {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";

  try {
    const res = await fetch(`${backendUrl}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(2500),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        ...data,
        backendConnected: true,
        backendUrl,
        mode: "live-backend",
      });
    }
  } catch {
    // Backend service not running — return fallback degraded status
  }

  return NextResponse.json({
    status: "degraded",
    backendConnected: false,
    backendUrl,
    services: {
      backend: {
        status: "offline",
        hint: "Start backend: cd world-dungeon-backend && npm run dev",
      },
      ollama: { status: "unavailable" },
      overpass: { status: "fallback" },
    },
    model: "gemma2:2b (archive mode)",
    mode: "archive-fallback",
    version: "1.0.0",
  });
}

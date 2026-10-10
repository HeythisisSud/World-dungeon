import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_KEY =
  process.env.NEXT_PUBLIC_ELEVENLABS_KEY ||
  process.env.NEXT_PUBLIC_ELEVENLABS_KEYS ||
  process.env.ELEVENLABS_KEY;

// Primary dark fantasy voices:
// Daniel (onwK4e9ZLuTAKqWW03F9): Deep, ancient, British dark storyteller
// Adam (pNInz6obpgDQGcFmaJgB): Deep, gravelly narrator
// Brian (nPczCjzI2devNBz1zQrb): Deep, resonant storyteller
// George (JBFqnCBsd6RMkjVDRZzb): Deep, warm narrator
const DEFAULT_VOICE_ID = "onwK4e9ZLuTAKqWW03F9"; // Daniel

export async function POST(request: NextRequest) {
  if (!ELEVENLABS_KEY) {
    return NextResponse.json(
      { error: "ElevenLabs API key is not configured in environment" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const {
      text,
      voiceId = DEFAULT_VOICE_ID,
      stability = 0.50,
      similarity_boost = 0.85,
      style = 0.30,
      modelId = "eleven_turbo_v2_5",
    } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Call ElevenLabs TTS endpoint
    let res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost,
            style,
            use_speaker_boost: true,
          },
        }),
        signal: AbortSignal.timeout(20000),
      }
    );

    // Fallback to eleven_multilingual_v2 if model not supported
    if (!res.ok && modelId !== "eleven_multilingual_v2") {
      console.warn(`[ElevenLabs] ${modelId} failed (${res.status}), retrying with eleven_multilingual_v2`);
      res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_KEY,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability,
              similarity_boost,
              style,
              use_speaker_boost: true,
            },
          }),
          signal: AbortSignal.timeout(20000),
        }
      );
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.error(`[ElevenLabs API Error ${res.status}]`, errorText);
      return NextResponse.json(
        { error: `ElevenLabs error: ${res.status}`, detail: errorText },
        { status: res.status }
      );
    }

    const audioBuffer = await res.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("[TTS Route Error]", error);
    return NextResponse.json(
      { error: (error as Error).message || "TTS synthesis failed" },
      { status: 500 }
    );
  }
}

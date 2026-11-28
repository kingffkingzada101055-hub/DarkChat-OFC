import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: "Sem texto" }, { status: 400 });

  const resp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/TX3LPaxmHKxFdv7VOQHJ/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    console.error("ElevenLabs error:", err);
    return NextResponse.json({ error: "Erro no TTS" }, { status: 500 });
  }

  const audioBuffer = await resp.arrayBuffer();
  return new NextResponse(audioBuffer, {
    headers: { "Content-Type": "audio/mpeg" },
  });
}

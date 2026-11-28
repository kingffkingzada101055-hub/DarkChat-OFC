import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Sem API key" }, { status: 500 });

  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: "Sem texto" }, { status: 400 });

  const resp = await fetch("https://api.groq.com/openai/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "playai-tts",
      input: text,
      voice: "Chico-PlayAI",
      response_format: "mp3",
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("TTS error:", err);
    return NextResponse.json({ error: "Erro no TTS" }, { status: 500 });
  }

  const audioBuffer = await resp.arrayBuffer();
  return new NextResponse(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.byteLength.toString(),
    },
  });
}

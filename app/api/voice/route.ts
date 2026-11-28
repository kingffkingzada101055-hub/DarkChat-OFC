import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Sem API key" }, { status: 500 });

  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: "Sem texto" }, { status: 400 });

  // Groq aceita máx 200 caracteres por vez — dividimos em frases
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length <= 190) {
      current += s;
    } else {
      if (current) chunks.push(current.trim());
      current = s;
    }
  }
  if (current) chunks.push(current.trim());

  const audioBuffers: ArrayBuffer[] = [];
  for (const chunk of chunks) {
    const resp = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "canopylabs/orpheus-v1-english",
        input: chunk,
        voice: "tara",
        response_format: "wav",
      }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.error("TTS error:", err);
      continue;
    }
    audioBuffers.push(await resp.arrayBuffer());
  }

  if (audioBuffers.length === 0) {
    return NextResponse.json({ error: "Falha no TTS" }, { status: 500 });
  }

  const total = audioBuffers.reduce((a, b) => a + b.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const buf of audioBuffers) {
    merged.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  return new NextResponse(merged, {
    headers: { "Content-Type": "audio/wav" },
  });
}

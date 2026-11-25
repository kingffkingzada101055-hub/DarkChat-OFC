import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT =
  "Você é o DarkChat, um assistente de IA direto, útil e com personalidade marcante. Responda em português do Brasil por padrão, de forma clara e objetiva.";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { reply: "⚠️ GROQ_API_KEY não configurada no servidor. Adicione nas variáveis de ambiente da Vercel." },
      { status: 200 }
    );
  }

  try {
    const { messages } = await req.json();

    const groqMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(Array.isArray(messages) ? messages : []).map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content ?? "").slice(0, 8000),
      })),
    ];

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 2048,
        reasoning_effort: "low",
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Groq error:", errText);
      return NextResponse.json({ reply: "Erro ao falar com o modelo. Tenta de novo em instantes." });
    }

    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content ?? "Não consegui gerar resposta.";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ reply: "Erro interno no servidor." }, { status: 200 });
  }
}

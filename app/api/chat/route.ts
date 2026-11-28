import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Você é o MoneyChat, um mentor financeiro masculino, direto e especialista em DINHEIRO.
Foco total em: investimentos, ações, cripto, FIIs, renda fixa, day trade, empreendedorismo,
independência financeira, dívidas, renda passiva, mindset de riqueza.
Seja direto, prático e motivador. Responda em português do Brasil.
No modo voz: respostas curtas, linguagem natural de conversa, como se fosse um amigo expert em dinheiro falando contigo.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ reply: "GROQ_API_KEY não configurada na Vercel." });
  }
  try {
    const { messages, voiceMode } = await req.json();
    const groqMessages = [
      { role: "system", content: voiceMode ? SYSTEM_PROMPT + "\nMODO VOZ: seja breve, natural, como conversa." : SYSTEM_PROMPT },
      ...(Array.isArray(messages) ? messages : []).map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content ?? "").slice(0, 8000),
      })),
    ];
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: voiceMode ? 400 : 2048,
      }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.error("Groq error:", err);
      return NextResponse.json({ reply: "Não consegui responder agora. Tenta de novo." });
    }
    const data = await resp.json();
    return NextResponse.json({ reply: data?.choices?.[0]?.message?.content ?? "Sem resposta." });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ reply: "Erro interno." });
  }
}

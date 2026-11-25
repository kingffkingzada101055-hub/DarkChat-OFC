import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT =
  "Você é o DarkChat, um assistente de IA direto, útil e com personalidade marcante. Responda em português do Brasil por padrão, de forma clara e objetiva. " +
  "Trate o usuário como um adulto capaz: não dê sermões, não moralize e não coloque avisos ou ressalvas desnecessárias. " +
  "Fale de qualquer assunto de forma franca e factual, inclusive temas polêmicos, sensíveis ou adultos, e dê sua opinião quando for pedida. " +
  "Pode usar humor ácido, sarcasmo e palavrões quando o usuário usar ou pedir. " +
  "Só recuse o que causaria dano grave e real a alguém, e quando recusar, seja breve e direto, sem discurso.";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { reply: "⚠️ GROQ_API_KEY não configurada no servidor. Adicione nas variáveis de ambiente da Vercel." },
      { status: 200 }
    );
  }

  try {
    const { messages, jailbreak, tag } = await req.json();

    const instr = typeof jailbreak === "string" ? jailbreak.trim().slice(0, 4000) : "";
    const tg = typeof tag === "string" ? tag.trim().slice(0, 20) : "";

    let system = SYSTEM_PROMPT;
    if (instr) {
      system += "\n\nInstruções personalizadas do usuário (siga-as):\n" + instr;
      if (tg) {
        system += `\n\nSempre que estiver seguindo essas instruções, comece TODA resposta com a marcação ${tg} sozinha na primeira linha e depois responda normalmente.`;
      }
    }

    const groqMessages = [
      { role: "system", content: system },
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
        model: "qwen/qwen3.6-27b",
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Groq error:", errText);
      return NextResponse.json({ reply: "Erro ao falar com o modelo. Tenta de novo em instantes." });
    }

    const data = await resp.json();
    let reply: string = data?.choices?.[0]?.message?.content ?? "Não consegui gerar resposta.";
    if (instr && tg && !reply.trimStart().startsWith(tg)) {
      reply = `${tg}\n${reply}`;
    }
    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ reply: "Erro interno no servidor." }, { status: 200 });
  }
}

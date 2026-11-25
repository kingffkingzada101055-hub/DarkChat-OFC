"use client";

import { useRef, useState, useEffect } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: "E aí. Eu sou o DarkChat. Manda a braba.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user", content: text } as Msg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? "Deu ruim no servidor. Confere a GROQ_API_KEY na Vercel." },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Erro de conexão. Tenta de novo." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-col h-screen scanline">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-dc-redline/60 bg-dc-surface/80 backdrop-blur sticky top-0 z-10"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}>
        <img src="/logo.png" alt="DarkChat" className="w-9 h-9 rounded-lg shadow-neon" />
        <div>
          <h1 className="font-bold text-lg tracking-wide glow-text">DARKCHAT</h1>
          <p className="text-xs text-dc-neon/70">online</p>
        </div>
      </header>

      <section className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
              m.role === "user"
                ? "ml-auto bg-dc-red/90 text-black font-medium rounded-br-sm shadow-neonsoft"
                : "mr-auto bg-dc-card border border-dc-redline/50 rounded-bl-sm"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto bg-dc-card border border-dc-redline/50 rounded-2xl rounded-bl-sm px-4 py-2 text-sm text-dc-neon/80">
            digitando…
          </div>
        )}
        <div ref={bottomRef} />
      </section>

      <footer
        className="border-t border-dc-redline/60 bg-dc-surface/90 backdrop-blur px-3 py-3 flex gap-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Manda sua mensagem..."
          className="flex-1 bg-black/60 border border-dc-redline/60 rounded-full px-4 py-2 text-sm outline-none focus:shadow-neon placeholder:text-white/30"
        />
        <button
          onClick={send}
          disabled={loading}
          className="px-5 py-2 rounded-full bg-dc-red text-black font-semibold text-sm shadow-neon active:scale-95 transition disabled:opacity-50"
        >
          Enviar
        </button>
      </footer>
    </main>
  );
}

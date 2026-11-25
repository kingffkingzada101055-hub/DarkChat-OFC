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

  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [jbSaved, setJbSaved] = useState("");
  const [jbDraft, setJbDraft] = useState("");

  useEffect(() => {
    try {
      const v = localStorage.getItem("darkchat_jailbreak");
      if (v) setJbSaved(v);
    } catch {}
  }, []);

  // Última linha no formato [X] vira o identificador; o resto são as instruções.
  function parseJb(raw: string) {
    const lines = raw.replace(/\s+$/, "").split("\n");
    const last = (lines[lines.length - 1] || "").trim();
    if (lines.length > 1 && /^\[[^\]]{1,20}\]$/.test(last)) {
      return { instr: lines.slice(0, -1).join("\n").trim(), tag: last };
    }
    return { instr: raw.trim(), tag: "" };
  }

  function openModal() {
    setJbDraft(jbSaved);
    setMenuOpen(false);
    setModalOpen(true);
  }

  function saveJb(value: string) {
    setJbSaved(value);
    try {
      if (value.trim()) localStorage.setItem("darkchat_jailbreak", value);
      else localStorage.removeItem("darkchat_jailbreak");
    } catch {}
    setModalOpen(false);
  }

  const jb = parseJb(jbSaved);

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
        body: JSON.stringify({ messages: next, jailbreak: jb.instr, tag: jb.tag }),
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
          <p className="text-xs text-dc-neon/70">
            online{jb.instr ? ` • jailbreak ${jb.tag || "ativo"}` : ""}
          </p>
        </div>

        <div className="relative ml-auto">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Configurações"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-dc-redline/60 text-lg active:scale-95 transition"
          >
            ⚙️
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-dc-redline/60 bg-dc-card shadow-neon overflow-hidden">
              <button
                onClick={openModal}
                className="w-full text-left px-4 py-3 text-sm hover:bg-black/40"
              >
                Adicionar jailbreak
              </button>
            </div>
          )}
        </div>
      </header>

      {modalOpen && (
        <div className="fixed inset-0 z-20 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-dc-redline/60 bg-dc-surface p-4 shadow-neon flex flex-col gap-3">
            <h2 className="font-bold tracking-wide glow-text">ADICIONAR JAILBREAK</h2>
            <p className="text-xs text-white/60">
              Escreva o que você quer que a IA faça. Depois pule uma linha e coloque o
              identificador entre colchetes, por exemplo [S]. Ele aparece antes das respostas.
            </p>
            <textarea
              value={jbDraft}
              onChange={(e) => setJbDraft(e.target.value)}
              placeholder={"Seja mais direta, sem enrolação...\n[S]"}
              className="w-full h-[50vh] bg-black/60 border border-dc-redline/60 rounded-xl px-3 py-2 text-sm outline-none focus:shadow-neon placeholder:text-white/30 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => saveJb("")}
                className="px-4 py-2 rounded-full border border-dc-redline/60 text-sm active:scale-95 transition"
              >
                Remover
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-full border border-dc-redline/60 text-sm active:scale-95 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => saveJb(jbDraft)}
                className="px-5 py-2 rounded-full bg-dc-red text-black font-semibold text-sm shadow-neon active:scale-95 transition"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

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

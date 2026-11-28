"use client";

import { useRef, useState, useEffect, useCallback } from "react";

type Msg = { role: "user" | "assistant"; content: string };
type AppMode = "chat" | "voice";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function Home() {
  const [mode, setMode] = useState<AppMode>("chat");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "💰 Fala, parceiro. Sou o MoneyChat — sua IA do dinheiro. Me pergunta qualquer coisa sobre grana, investimento ou negócio." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceReply, setVoiceReply] = useState("");
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionAsked, setPermissionAsked] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const voiceActiveRef = useRef(false);
  const audioRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Carrega vozes assim que o componente monta
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  function getManVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    // Tenta voz masculina pt-BR
    const ptBrMale = voices.find(v =>
      (v.lang === "pt-BR" || v.lang === "pt_BR") &&
      /male|masculin|man|homem|marcos|daniel|google|antonio/i.test(v.name)
    );
    if (ptBrMale) return ptBrMale;
    // Qualquer voz pt-BR
    const ptBr = voices.find(v => v.lang === "pt-BR" || v.lang === "pt_BR");
    if (ptBr) return ptBr;
    // Qualquer voz pt
    const pt = voices.find(v => v.lang.startsWith("pt"));
    if (pt) return pt;
    return voices[0] || null;
  }

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) { onEnd?.(); return; }
    window.speechSynthesis.cancel();

    const clean = text
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`[^`]*`/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .trim();

    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = "pt-BR";
    utter.rate = 0.95;
    utter.pitch = 0.7;  // bem grave
    utter.volume = 1;

    const trySpeak = () => {
      const v = getManVoice();
      if (v) utter.voice = v;
      utter.onstart = () => setVoiceState("speaking");
      utter.onend = () => { setVoiceState("idle"); onEnd?.(); };
      utter.onerror = () => { setVoiceState("idle"); onEnd?.(); };
      window.speechSynthesis.speak(utter);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      trySpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => trySpeak();
    }

    audioRef.current = utter;
  }, []);

  const handleVoiceSubmit = useCallback(async (text: string) => {
    setVoiceState("processing");
    setVoiceTranscript(text);
    setVoiceReply("");
    const newMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, voiceMode: true }),
      });
      const data = await res.json();
      const reply: string = data.reply ?? "Não consegui responder.";
      setMessages(m => [...m, { role: "assistant", content: reply }]);
      setVoiceReply(reply);
      speak(reply, () => {
        if (voiceActiveRef.current) setTimeout(() => startListening(), 400);
      });
    } catch {
      const err = "Erro de conexão.";
      setVoiceReply(err);
      speak(err);
    }
  }, [messages, speak]);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Use o Chrome para o modo voz."); return; }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;
    rec._lastTranscript = "";
    rec.onstart = () => { setVoiceState("listening"); setVoiceTranscript(""); };
    rec.onresult = (e: any) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) { final += t; rec._lastTranscript = final; }
        else interim += t;
      }
      setVoiceTranscript(final || interim);
    };
    rec.onend = () => {
      if (!voiceActiveRef.current) return;
      const transcript = rec._lastTranscript;
      if (transcript && transcript.trim().length > 1) {
        handleVoiceSubmit(transcript.trim());
      } else {
        setVoiceState("idle");
      }
    };
    rec.onerror = (e: any) => { setVoiceState("idle"); console.error(e.error); };
    recognitionRef.current = rec;
    rec.start();
  }, [handleVoiceSubmit]);

  const enterVoiceMode = useCallback(async () => {
    setMode("voice");
    if (!permissionGranted && !permissionAsked) {
      setPermissionAsked(true);
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setPermissionGranted(true);
      } catch {
        alert("Permissão de microfone negada. Libere nas configurações.");
        setMode("chat");
        return;
      }
    }
    voiceActiveRef.current = true;
    speak("Olá! Pode falar. Estou pronto pra falar sobre dinheiro com você.", () => {
      startListening();
    });
  }, [permissionGranted, permissionAsked, speak, startListening]);

  const exitVoiceMode = useCallback(() => {
    voiceActiveRef.current = false;
    setMode("chat");
    setVoiceState("idle");
    setVoiceTranscript("");
    setVoiceReply("");
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
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
      setMessages(m => [...m, { role: "assistant", content: data.reply ?? "Erro no servidor." }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Erro de conexão." }]);
    } finally {
      setLoading(false);
    }
  }

  if (mode === "voice") {
    return (
      <main className="flex flex-col h-screen bg-dc-black items-center justify-between py-10 px-6"
        style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 2.5rem)", paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 2.5rem)" }}>

        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl font-bold glow-gold text-dc-gold tracking-widest">💰 MONEYCHAT</span>
          <span className="text-xs text-dc-green/60 tracking-widest uppercase">Modo Voz Ativo</span>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className={`w-44 h-44 rounded-full border-2 border-dc-green flex items-center justify-center transition-all duration-300
            ${voiceState === "listening"  ? "voice-active border-dc-neon" : ""}
            ${voiceState === "speaking"   ? "border-dc-gold"  : ""}
            ${voiceState === "processing" ? "opacity-70 animate-pulse" : ""}
          `}
            style={{
              background: "radial-gradient(circle, #0b1a0d 60%, #020804 100%)",
              boxShadow: voiceState === "listening" ? "0 0 40px rgba(0,230,118,0.4)" :
                         voiceState === "speaking"  ? "0 0 40px rgba(255,215,0,0.4)" :
                         "0 0 20px rgba(0,230,118,0.15)"
            }}>
            {voiceState === "idle"       && <span className="text-5xl">🎙️</span>}
            {voiceState === "listening"  && (
              <div className="flex items-end gap-1 h-10">
                {[14,20,28,20,14].map((h,i) => <span key={i} className="wave-bar" style={{ height: `${h}px`, animationDelay: `${i*0.15}s` }} />)}
              </div>
            )}
            {voiceState === "processing" && <span className="text-dc-green text-sm font-semibold">Pensando...</span>}
            {voiceState === "speaking"   && (
              <div className="flex items-end gap-1 h-10">
                {[12,22,30,22,12].map((h,i) => <span key={i} className="wave-bar" style={{ height: `${h}px`, background: "#ffd700", animationDelay: `${i*0.12}s` }} />)}
              </div>
            )}
          </div>

          <div className="text-center min-h-[48px]">
            {voiceState === "idle"       && <p className="text-dc-green/50 text-sm">Aguardando...</p>}
            {voiceState === "listening"  && <p className="text-dc-neon text-sm font-medium animate-pulse">🎤 Ouvindo você...</p>}
            {voiceState === "processing" && <p className="text-dc-gold/80 text-sm">Processando resposta...</p>}
            {voiceState === "speaking"   && <p className="text-dc-gold text-sm font-medium">🔊 Falando...</p>}
          </div>

          {voiceTranscript ? (
            <div className="bg-dc-card border border-dc-greenline/40 rounded-2xl px-5 py-3 max-w-xs text-center">
              <p className="text-xs text-dc-green/50 mb-1 uppercase tracking-widest">Você disse</p>
              <p className="text-dc-white text-sm">{voiceTranscript}</p>
            </div>
          ) : null}

          {voiceReply ? (
            <div className="bg-dc-card border border-dc-gold/30 rounded-2xl px-5 py-3 max-w-xs text-center">
              <p className="text-xs text-dc-gold/60 mb-1 uppercase tracking-widest">MoneyChat</p>
              <p className="text-dc-white/90 text-sm leading-relaxed line-clamp-4">{voiceReply}</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          {voiceState === "idle" && (
            <button onClick={startListening}
              className="w-full py-4 rounded-2xl bg-dc-green text-black font-bold text-base tracking-wide shadow-neon active:scale-95 transition">
              🎙️ Falar agora
            </button>
          )}
          {voiceState === "speaking" && (
            <button onClick={() => { window.speechSynthesis?.cancel(); setVoiceState("idle"); }}
              className="w-full py-4 rounded-2xl border border-dc-gold/60 text-dc-gold font-semibold text-sm active:scale-95 transition">
              ⏹ Parar fala
            </button>
          )}
          <button onClick={exitVoiceMode}
            className="w-full py-3 rounded-2xl border border-dc-greenline/50 text-dc-green/60 font-medium text-sm active:scale-95 transition">
            ← Voltar ao chat
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-screen scanline">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-dc-greenline/50 bg-dc-surface/80 backdrop-blur sticky top-0 z-10"
        style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 0.75rem)" }}>
        <img src="/logo.png" alt="MoneyChat" className="w-9 h-9 rounded-lg shadow-neon" />
        <div className="flex-1">
          <h1 className="font-bold text-lg tracking-wide glow-gold text-dc-gold">MONEYCHAT</h1>
          <p className="text-xs text-dc-green/60">IA especialista em dinheiro</p>
        </div>
        <div className="w-2 h-2 rounded-full bg-dc-green shadow-neon" />
      </header>

      <div className="px-4 py-4 border-b border-dc-greenline/30 bg-dc-surface/50">
        <button onClick={enterVoiceMode}
          className="w-full py-5 rounded-2xl font-bold text-xl tracking-wide text-black transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg, #00e676, #00c853, #ffd700)",
            boxShadow: "0 0 24px rgba(0,230,118,0.5), 0 0 48px rgba(255,215,0,0.25)",
          }}>
          🌍&nbsp; Falar com a realidade
          <p className="text-xs font-normal text-black/70 mt-1 tracking-normal">Conversa por voz com a IA do dinheiro</p>
        </button>
      </div>

      <section className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i}
            className={`max-w-[86%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === "user"
                ? "ml-auto bg-dc-green/90 text-black font-medium rounded-br-sm shadow-neonsoft"
                : "mr-auto bg-dc-card border border-dc-greenline/40 rounded-bl-sm"
            }`}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto bg-dc-card border border-dc-greenline/40 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-dc-green/70">
            <span className="animate-pulse">💰 calculando...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </section>

      <footer className="border-t border-dc-greenline/50 bg-dc-surface/90 backdrop-blur px-3 py-3 flex gap-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 0.75rem)" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Pergunta sobre dinheiro..."
          className="flex-1 bg-black/60 border border-dc-greenline/50 rounded-full px-4 py-2 text-sm outline-none focus:shadow-neon placeholder:text-white/25 text-dc-white"
        />
        <button onClick={send} disabled={loading}
          className="px-5 py-2 rounded-full bg-dc-green text-black font-bold text-sm shadow-neon active:scale-95 transition disabled:opacity-40">
          Enviar
        </button>
      </footer>
    </main>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Mic, Check, Pencil, Keyboard, Volume2, VolumeX, Send } from "lucide-react";
import { AivaOrb } from "@/components/brand";
import { Button } from "@/components/ui";
import { ReplyView } from "@/components/ai/ReplyView";
import { useAiva, type Change } from "@/store/aiva";
import { useSpeech } from "@/hooks/use-speech";
import { interpret, type Interpretation } from "@/lib/nlp/interpret";
import { api, tzOffset } from "@/lib/client-api";
import { ENTITY_LABEL } from "@/lib/entities";
import type { AiReply } from "@/lib/ai/reply";
import type { AiAction } from "@/lib/ai/actions";
import { cn } from "@/lib/cn";

type Phase =
  | { kind: "listen" }
  | { kind: "confirm"; text: string; it: Extract<Interpretation, { kind: "create" }> }
  | { kind: "thinking"; text: string }
  | { kind: "reply"; text: string; reply: AiReply }
  | { kind: "done"; message: string };

function speechSupported() {
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const clean = text.replace(/[*_#>]/g, "").replace(/\n+/g, ". ").slice(0, 300);
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = "pt-BR";
  u.rate = 1.05;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/** "Falar com AIVA" — listen → understand → confirm → execute, with visual feedback. */
export function VoiceOverlay() {
  const open = useAiva((s) => s.ui.voiceOpen);
  return open ? <VoiceSession /> : null;
}

function VoiceSession() {
  const setUI = useAiva((s) => s.setUI);
  const applyChanges = useAiva((s) => s.applyChanges);
  const toast = useAiva((s) => s.toast);
  const [phase, setPhase] = useState<Phase>({ kind: "listen" });
  const [typed, setTyped] = useState("");
  const [typing, setTyping] = useState(() => !speechSupported());
  const [voiceOut, setVoiceOut] = useState(true);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const conv = useRef<string | null>(null);

  const handle = async (text: string) => {
    const it = interpret(text, { now: new Date(), tzOffset: tzOffset() });
    if (it.kind === "create") {
      const a = it.actions[0];
      setTitle(a.type === "create" ? String(a.data.title ?? a.data.name ?? "") : "");
      setPhase({ kind: "confirm", text, it });
      if (voiceOut) speak(`Entendi. ${it.confirm}`);
      return;
    }
    setPhase({ kind: "thinking", text });
    try {
      const reply = await api<AiReply>("/api/ai/chat", { body: { message: text, conversationId: conv.current, tzOffset: tzOffset(), source: "voice" } });
      conv.current = reply.conversationId;
      applyChanges(reply.changes as Change[]);
      setPhase({ kind: "reply", text, reply });
      if (voiceOut) speak(reply.message);
    } catch (err) {
      setPhase({ kind: "done", message: err instanceof Error ? err.message : "Algo deu errado." });
    }
  };

  const speech = useSpeech((t) => handle(t));

  // Start listening as soon as the overlay opens; stop everything when it closes.
  useEffect(() => {
    if (speech.supported) speech.start();
    return () => {
      speech.stop();
      window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setUI({ voiceOpen: false });
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setUI]);

  const close = () => setUI({ voiceOpen: false });
  const again = () => {
    setPhase({ kind: "listen" });
    speech.start();
  };

  const confirm = async () => {
    if (phase.kind !== "confirm") return;
    setBusy(true);
    const actions: AiAction[] = phase.it.actions.map((a, i) =>
      i === 0 && a.type === "create" && title.trim() ? { ...a, data: { ...a.data, ...(a.entity === "clients" || a.entity === "projects" || a.entity === "brands" ? { name: title.trim() } : { title: title.trim() }) } } : a,
    );
    try {
      const res = await api<{ executed: { title: string }[]; changes: Change[]; errors: string[] }>("/api/ai/execute", { body: { actions, captureText: phase.text } });
      applyChanges(res.changes);
      const msg = res.executed.length ? `Pronto! ${ENTITY_LABEL[phase.it.primary]} criado(a): ${res.executed[0].title}` : res.errors[0] ?? "Não consegui salvar.";
      setPhase({ kind: "done", message: msg });
      toast({ message: msg, tone: res.executed.length ? "ai" : "error" });
      if (voiceOut) speak(res.executed.length ? "Pronto!" : msg);
      if (res.executed.length) setTimeout(() => setUI({ voiceOpen: false }), 1100);
    } catch (err) {
      setPhase({ kind: "done", message: err instanceof Error ? err.message : "Erro" });
    } finally {
      setBusy(false);
    }
  };

  const listening = speech.state === "listening";
  const visibleText = phase.kind === "listen" ? speech.transcript : "text" in phase ? phase.text : "";

  return createPortal(
    <div className="fixed inset-0 z-[80] flex animate-fade-in flex-col bg-bg/95 backdrop-blur-2xl" role="dialog" aria-modal="true" aria-label="Falar com AIVA">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_35%,rgb(139_92_255/0.25),transparent_70%)]" />
      <div className="relative flex items-center justify-between px-safe pt-[max(16px,var(--safe-top))]">
        <button onClick={() => setVoiceOut((v) => !v)} className="pressable grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-muted" aria-label={voiceOut ? "Desativar resposta falada" : "Ativar resposta falada"}>
          {voiceOut ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
        <span className="text-sm font-medium text-muted">Falar com AIVA</span>
        <button onClick={close} className="pressable grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-muted" aria-label="Fechar">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative mx-auto flex w-full max-w-xl min-h-0 flex-1 flex-col items-center overflow-y-auto px-safe pt-8 pb-6">
        <AivaOrb size={phase.kind === "reply" ? 72 : 132} active={listening || phase.kind === "thinking"} className="shrink-0 transition-all duration-500" />

        <div className="mt-8 w-full text-center">
          {phase.kind === "listen" && (
            <>
              <div className="wave mb-4 flex h-9 items-center justify-center" aria-hidden>
                {listening ? [0, 1, 2, 3, 4].map((i) => <span key={i} />) : <span className="!h-1.5 !animate-none opacity-40" />}
              </div>
              <p className="text-lg font-medium">{listening ? "O AIVA está ouvindo…" : speech.state === "error" ? speech.error : speech.state === "unsupported" || !speech.supported ? "Voz indisponível neste navegador" : "Toque no microfone para falar"}</p>
              <p className="mx-auto mt-3 min-h-12 max-w-md text-xl leading-snug text-ink/90">{visibleText || <span className="text-faint">“Reunião amanhã às três” · “O que está atrasado?”</span>}</p>
            </>
          )}

          {phase.kind === "thinking" && (
            <>
              <p className="text-xl text-ink/90">“{phase.text}”</p>
              <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
                <span className="h-2 w-2 animate-pulse rounded-full bg-violet" /> Pensando…
              </p>
            </>
          )}

          {phase.kind === "confirm" && (
            <div className="animate-rise text-left">
              <p className="mb-1 text-center text-sm text-muted">“{phase.text}”</p>
              <p className="mb-5 text-center text-xl font-medium">Entendi. {phase.it.confirm}</p>
              <div className="card grid gap-3 p-4">
                <label className="grid gap-1">
                  <span className="text-xs text-muted">{ENTITY_LABEL[phase.it.primary]}</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-transparent text-lg font-medium outline-none" aria-label="Título" />
                </label>
                {phase.it.actions.length > 1 && <p className="text-[13px] text-muted">Também: {phase.it.actions.slice(1).map((a) => ENTITY_LABEL[a.entity].toLowerCase()).join(", ")}</p>}
                {phase.it.suggestions.length > 0 && <p className="text-[12px] text-faint">Depois: {phase.it.suggestions.join(" · ")}</p>}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Button variant="primary" size="lg" onClick={confirm} loading={busy} className="col-span-2 sm:col-span-1">
                  <Check className="h-5 w-5" /> Confirmar
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    setUI({ voiceOpen: false, captureOpen: true, captureMode: "text", captureText: phase.text });
                  }}
                >
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <Button size="lg" variant="ghost" onClick={again}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {phase.kind === "reply" && (
            <div className="animate-rise text-left">
              <p className="mb-4 text-center text-sm text-muted">“{phase.text}”</p>
              <ReplyView reply={phase.reply} compact onFollowup={(t) => handle(t)} />
              <Link href={`/aiva?c=${phase.reply.conversationId}`} onClick={close} className="mt-4 block text-center text-[13px] text-muted underline-offset-4 hover:underline">
                Continuar no chat
              </Link>
            </div>
          )}

          {phase.kind === "done" && <p className="animate-rise text-xl font-medium">{phase.message}</p>}
        </div>
      </div>

      <div className="relative px-safe pb-[max(20px,var(--safe-bottom))]">
        {typing ? (
          <form
            className="mx-auto flex max-w-xl gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (typed.trim()) {
                handle(typed.trim());
                setTyped("");
              }
            }}
          >
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus placeholder="Escreva para a AIVA…" className="h-12 min-w-0 flex-1 rounded-2xl border border-line bg-surface-2 px-4 outline-none focus:border-violet/60" />
            <Button variant="primary" size="icon" className="h-12 w-12" aria-label="Enviar">
              <Send className="h-5 w-5" />
            </Button>
          </form>
        ) : (
          <div className="mx-auto flex max-w-xl items-center justify-center gap-6">
            <button onClick={() => setTyping(true)} className="pressable grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-muted" aria-label="Digitar">
              <Keyboard className="h-5 w-5" />
            </button>
            <button
              onClick={() => (listening ? speech.stop() : again())}
              className={cn("pressable relative grid h-20 w-20 place-items-center rounded-full text-white shadow-[0_10px_50px_-6px_rgb(255_79_176/0.7)]", listening ? "bg-pink dot-pulse text-pink" : "grad")}
              aria-label={listening ? "Parar" : "Falar"}
            >
              <Mic className="h-8 w-8 text-white" />
            </button>
            <span className="h-12 w-12" />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

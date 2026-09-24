"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Send, Plus, History, Trash2, CalendarCheck, Clapperboard, Briefcase } from "lucide-react";
import { AivaOrb } from "@/components/brand";
import { HeaderIcons } from "@/components/shell/PageHeader";
import { ReplyView } from "@/components/ai/ReplyView";
import { Sheet } from "@/components/ui";
import { useAiva, type Change } from "@/store/aiva";
import { api, tzOffset } from "@/lib/client-api";
import type { AiReply } from "@/lib/ai/reply";
import { cn } from "@/lib/cn";

type Msg = { id: string; role: "user" | "assistant"; text: string; reply?: AiReply; pending?: boolean };
type Conv = { id: string; title: string; updatedAt: string };

const GROUPS = [
  { title: "Organizar", icon: CalendarCheck, prompts: ["Organize meu dia", "Quais são minhas prioridades hoje?", "O que está atrasado?", "O que faço agora?"] },
  {
    title: "Creator Studio",
    icon: Clapperboard,
    creator: true,
    prompts: ["Crie 10 ideias de TikTok", "Transforme essa ideia em roteiro", "Crie um hook mais forte", "Faça uma legenda para Instagram", "Crie 5 variações desse conteúdo", "Crie um calendário de conteúdo para os próximos 7 dias", "Analise minhas ideias"],
  },
  { title: "Negócios", icon: Briefcase, prompts: ["Quais clientes precisam de follow-up?", "Como está meu financeiro?", "Quais conteúdos preciso publicar essa semana?"] },
];

export function AivaChat() {
  const provider = useAiva((s) => s.me?.ai.provider);
  const creator = useAiva((s) => s.me?.workspace.settings.creatorMode);
  const name = useAiva((s) => s.me?.workspace.settings.displayName);
  const setUI = useAiva((s) => s.setUI);
  const applyChanges = useAiva((s) => s.applyChanges);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<Conv[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const started = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = async (text: string, conv = conversationId) => {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    setBusy(true);
    const uid = crypto.randomUUID();
    const aid = crypto.randomUUID();
    setMessages((m) => [...m, { id: uid, role: "user", text: value }, { id: aid, role: "assistant", text: "", pending: true }]);
    try {
      const reply = await api<AiReply>("/api/ai/chat", { body: { message: value, conversationId: conv, tzOffset: tzOffset() } });
      setConversationId(reply.conversationId);
      applyChanges(reply.changes as Change[]);
      setMessages((m) => m.map((x) => (x.id === aid ? { ...x, text: reply.message, reply, pending: false } : x)));
    } catch (err) {
      setMessages((m) => m.map((x) => (x.id === aid ? { ...x, text: err instanceof Error ? err.message : "Algo deu errado.", pending: false } : x)));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const load = async (id: string) => {
    try {
      const res = await api<{ messages: { id: string; role: "user" | "assistant"; content: string; actions: { executed?: AiReply["executed"]; proposals?: AiReply["proposals"]; items?: AiReply["items"]; plan?: AiReply["plan"] }[] }[] }>(`/api/ai/conversations/${id}`);
      setConversationId(id);
      setMessages(
        res.messages.map((m) => {
          const a = m.actions?.[0] ?? {};
          return {
            id: m.id,
            role: m.role,
            text: m.content,
            reply: m.role === "assistant" ? { conversationId: id, message: m.content, provider: "local", executed: a.executed ?? [], proposals: [], items: a.items, plan: a.plan, changes: [] } : undefined,
          };
        }),
      );
      setHistoryOpen(false);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const c = params.get("c");
    if (params.get("voice") === "1") setUI({ voiceOpen: true });
    window.history.replaceState(null, "", "/aiva");
    if (c) load(c);
    else if (q) send(q, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistory(await api<Conv[]>("/api/ai/chat").catch(() => []));
  };

  const newChat = () => {
    setMessages([]);
    setConversationId(null);
    inputRef.current?.focus();
  };

  return (
    <main className="relative z-[1] mx-auto flex h-dvh w-full max-w-3xl flex-col px-safe pt-[var(--safe-top)] lg:px-10">
      <header className="flex shrink-0 items-center gap-3 pt-4 pb-3 lg:pt-8">
        <AivaOrb size={36} active={busy} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold">AIVA AI</h1>
          <p className="text-[12px] text-muted">
            {provider === "claude" ? (
              <>Conectada ao Claude · conhece seu workspace</>
            ) : (
              <>
                Modo local · <span className="text-faint">conecte a API da Anthropic para respostas avançadas</span>
              </>
            )}
          </p>
        </div>
        <button onClick={newChat} className="pressable grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-muted hover:text-ink" aria-label="Nova conversa">
          <Plus className="h-[18px] w-[18px]" />
        </button>
        <button onClick={openHistory} className="pressable grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-muted hover:text-ink" aria-label="Histórico">
          <History className="h-[18px] w-[18px]" />
        </button>
        <HeaderIcons className="hidden sm:flex" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
        {messages.length === 0 ? (
          <div className="animate-rise pt-6 lg:pt-12">
            <div className="text-center">
              <AivaOrb size={72} className="mx-auto" />
              <h2 className="mt-5 text-2xl font-semibold">Como posso ajudar{name ? `, ${name}` : ""}?</h2>
              <p className="mt-1.5 text-sm text-muted">Eu conheço suas tarefas, agenda, projetos{creator ? ", conteúdos" : ""} e clientes — e posso agir por você.</p>
            </div>
            <div className="mt-8 grid gap-5">
              {GROUPS.filter((g) => !g.creator || creator).map((g) => (
                <div key={g.title}>
                  <p className="mb-2 flex items-center gap-2 px-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">
                    <g.icon className="h-3.5 w-3.5" /> {g.title}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {g.prompts.map((p) => (
                      <button key={p} onClick={() => send(p)} className="pressable rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-left text-[14px] text-ink/90 hover:bg-surface-2">
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-5 pt-2">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="ml-auto max-w-[85%] animate-rise rounded-3xl rounded-br-lg bg-surface-3 px-4 py-2.5 text-[15px]">
                  {m.text}
                </div>
              ) : (
                <div key={m.id} className="flex animate-rise gap-3">
                  <AivaOrb size={26} active={m.pending} className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    {m.pending ? (
                      <div className="flex h-7 items-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="h-2 w-2 animate-pulse rounded-full bg-violet" style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                      </div>
                    ) : m.reply ? (
                      <ReplyView reply={m.reply} onFollowup={(t) => send(t)} />
                    ) : (
                      <p className="text-[15px] text-orange">{m.text}</p>
                    )}
                  </div>
                </div>
              ),
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 pb-[calc(var(--nav-h)+var(--safe-bottom)+12px)] lg:pb-8">
        <div className="glass flex items-end gap-2 rounded-3xl p-2 pl-4 shadow-2xl">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder="Pergunte, peça ou capture algo…"
            className="max-h-40 min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2.5 text-[16px] leading-snug outline-none placeholder:text-faint"
            aria-label="Mensagem para a AIVA"
          />
          {input.trim() ? (
            <button onClick={() => send(input)} disabled={busy} className="pressable grad grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white disabled:opacity-50" aria-label="Enviar">
              <Send className="h-5 w-5" />
            </button>
          ) : (
            <button onClick={() => setUI({ voiceOpen: true })} className="pressable grad grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white" aria-label="Falar com AIVA">
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
        <p className="mt-2 hidden text-center text-[11px] text-faint lg:block">Enter envia · Shift+Enter quebra linha · ⌘J voz</p>
      </div>

      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Conversas" size="sm">
        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Nenhuma conversa ainda.</p>
        ) : (
          <div className="grid gap-1">
            {history.map((c) => (
              <div key={c.id} className={cn("flex items-center gap-2 rounded-xl hover:bg-surface-2", c.id === conversationId && "bg-surface-2")}>
                <button onClick={() => load(c.id)} className="min-w-0 flex-1 px-3 py-2.5 text-left">
                  <span className="block truncate text-sm">{c.title}</span>
                  <span className="block text-[11px] text-faint">{new Date(c.updatedAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </button>
                <button
                  onClick={async () => {
                    await api(`/api/ai/conversations/${c.id}`, { method: "DELETE" }).catch(() => null);
                    setHistory((h) => h.filter((x) => x.id !== c.id));
                    if (c.id === conversationId) newChat();
                  }}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-faint hover:text-red"
                  aria-label="Excluir conversa"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </main>
  );
}

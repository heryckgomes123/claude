"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Send, Sparkles, CheckSquare, Lightbulb, StickyNote, CalendarPlus, Clapperboard, FolderPlus, UserPlus, Wand2, Square } from "lucide-react";
import { Sheet, Chip, Button } from "@/components/ui";
import { useAiva, type Change } from "@/store/aiva";
import { api, tzOffset } from "@/lib/client-api";
import { interpret, cleanTitle, suggestHook } from "@/lib/nlp/interpret";
import { extractDateTime, cutSpans } from "@/lib/nlp/datetime";
import { fmtWhen } from "@/lib/intelligence";
import { ENTITY_LABEL, type EntityName } from "@/lib/entities";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/cn";

type Mode = "text" | "tasks" | "ideas" | "notes" | "events" | "contents" | "projects" | "clients";

const MODES: { value: Mode; label: string; icon: typeof Sparkles }[] = [
  { value: "text", label: "Auto", icon: Wand2 },
  { value: "tasks", label: "Tarefa", icon: CheckSquare },
  { value: "ideas", label: "Ideia", icon: Lightbulb },
  { value: "notes", label: "Nota", icon: StickyNote },
  { value: "events", label: "Evento", icon: CalendarPlus },
  { value: "contents", label: "Conteúdo", icon: Clapperboard },
  { value: "projects", label: "Projeto", icon: FolderPlus },
  { value: "clients", label: "Cliente", icon: UserPlus },
];

const HREF: Partial<Record<EntityName, (id: string) => string>> = {
  tasks: (id) => `/tasks?open=${id}`,
  events: (id) => `/calendar?open=${id}`,
  ideas: (id) => `/creator?tab=ideas&open=${id}`,
  contents: (id) => `/creator?open=${id}`,
  notes: (id) => `/notes?open=${id}`,
  projects: (id) => `/projects/${id}`,
  clients: (id) => `/clients?open=${id}`,
  lives: (id) => `/creator?tab=lives&open=${id}`,
  campaigns: (id) => `/creator?tab=brands&open=${id}`,
  goals: () => `/goals`,
  habits: () => `/goals`,
  transactions: () => `/finance`,
};

/** Universal Capture — "capture agora, organize depois". */
export function CaptureSheet() {
  const open = useAiva((s) => s.ui.captureOpen);
  const setUI = useAiva((s) => s.setUI);
  const close = () => setUI({ captureOpen: false, captureText: undefined });
  return (
    <Sheet open={open} onClose={close} title={<span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#c4b1ff]" /> Capturar</span>} size="md">
      <CaptureBody onClose={close} />
    </Sheet>
  );
}

function CaptureBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const initialMode = useAiva((s) => s.ui.captureMode);
  const initialText = useAiva((s) => s.ui.captureText);
  const creatorMode = useAiva((s) => s.me?.workspace.settings.creatorMode);
  const toast = useAiva((s) => s.toast);
  const applyChanges = useAiva((s) => s.applyChanges);
  const create = useAiva((s) => s.create);
  const [text, setText] = useState(initialText ?? "");
  const [mode, setMode] = useState<Mode>(((initialMode as Mode) ?? "text") satisfies Mode);
  const [busy, setBusy] = useState(false);

  const speech = useSpeech((t) => setText((prev) => (prev ? `${prev} ${t}` : t)));

  const close = onClose;

  // Live preview of how AIVA understood the text.
  const preview = useMemo(() => {
    if (!text.trim() || mode !== "text") return null;
    const it = interpret(text, { now: new Date(), tzOffset: tzOffset() });
    if (it.kind !== "create") return { label: "Pergunta para a AIVA", detail: "Vou responder no chat" };
    const a = it.actions[0];
    const data = a.type === "create" ? a.data : {};
    const when = (data.startAt ?? data.dueAt ?? data.scheduledAt) as string | undefined;
    const title = String(data.title ?? data.name ?? "");
    return {
      label: ENTITY_LABEL[it.primary],
      detail: [title, when ? fmtWhen(when, Boolean(data.hasTime ?? !data.allDay), { now: new Date(), tzOffset: tzOffset() }) : null, data.category as string | null].filter(Boolean).join(" · "),
      extra: it.actions.length > 1 ? `+ ${it.actions.slice(1).map((x) => ENTITY_LABEL[x.entity].toLowerCase()).join(", ")}` : null,
    };
  }, [text, mode]);

  const submit = async () => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      if (mode === "text") {
        const res = await api<
          | { kind: "ask" }
          | { kind: "create"; primary: EntityName; executed: { entity: EntityName; id: string; title: string }[]; changes: Change[]; suggestions: string[]; errors: string[] }
        >("/api/capture", { body: { text: value, source: "text", tzOffset: tzOffset() } });
        if (res.kind === "ask") {
          close();
          router.push(`/aiva?q=${encodeURIComponent(value)}`);
          return;
        }
        applyChanges(res.changes);
        const main = res.executed.find((e) => e.entity === res.primary) ?? res.executed[0];
        if (main) {
          const href = HREF[main.entity]?.(main.id);
          toast({
            message: `${ENTITY_LABEL[main.entity]} criad${["tasks", "ideas", "notes", "lives", "goals", "campaigns"].includes(main.entity) ? "a" : "o"}: ${main.title}`,
            tone: "ai",
            action: href ? { label: "Abrir", onClick: () => router.push(href) } : undefined,
          });
        } else if (res.errors.length) toast({ message: res.errors[0], tone: "error" });
      } else {
        await createAs(mode, value);
      }
      setText("");
      close();
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Erro ao capturar", tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const createAs = async (m: Exclude<Mode, "text">, value: string) => {
    const ctx = { now: new Date(), tzOffset: tzOffset() };
    const dt = extractDateTime(value, ctx);
    const title = cleanTitle(cutSpans(value, dt.spans)) || value;
    const at = dt.at?.toISOString() ?? null;
    let row: { id: string } | null = null;
    if (m === "tasks") row = await create("tasks", { title, dueAt: at, hasTime: dt.hasTime, status: "todo" }, { silent: true });
    if (m === "ideas") row = await create("ideas", { title, hook: suggestHook(title), status: "raw" }, { silent: true });
    if (m === "notes") row = await create("notes", { title: value.split("\n")[0].slice(0, 120), body: value }, { silent: true });
    if (m === "events") {
      const start = at ?? new Date(Math.ceil(Date.now() / 3_600_000) * 3_600_000).toISOString();
      row = await create("events", { title, startAt: start, allDay: dt.at ? !dt.hasTime : false, kind: "appointment" }, { silent: true });
    }
    if (m === "contents") row = await create("contents", { title, stage: "idea", scheduledAt: at }, { silent: true });
    if (m === "projects") row = await create("projects", { name: title, status: "active" }, { silent: true });
    if (m === "clients") row = await create("clients", { name: title, kind: "lead", stage: "new" }, { silent: true });
    if (row) {
      const href = HREF[m]?.(row.id);
      toast({ message: `${ENTITY_LABEL[m]} criado(a)`, tone: "success", action: href ? { label: "Abrir", onClick: () => router.push(href) } : undefined });
    }
  };

  const modes = MODES.filter((m) => creatorMode || m.value !== "contents");

  return (
      <div className="grid gap-3">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
          {modes.map((m) => (
            <Chip key={m.value} active={mode === m.value} onClick={() => setMode(m.value)}>
              <m.icon className="h-3.5 w-3.5" /> {m.label}
            </Chip>
          ))}
        </div>

        <div className={cn("rounded-2xl border bg-surface transition", speech.state === "listening" ? "border-pink/50" : "border-line focus-within:border-violet/60")}>
          <textarea
            data-autofocus
            value={speech.state === "listening" ? speech.transcript || text : text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={3}
            maxLength={2000}
            placeholder={mode === "text" ? "O que está na sua cabeça? Ex.: “Reunião com a Nike sexta às 14h”" : `Nova ${ENTITY_LABEL[mode as EntityName].toLowerCase()}…`}
            className="block w-full resize-none bg-transparent px-4 pt-3.5 text-[16px] text-ink outline-none placeholder:text-faint"
            aria-label="Texto da captura"
          />
          <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
            <button
              type="button"
              onClick={() => (speech.state === "listening" ? speech.stop() : speech.start())}
              className={cn("pressable flex h-10 items-center gap-2 rounded-xl px-3 text-[13px]", speech.state === "listening" ? "bg-pink/15 text-pink" : "text-muted hover:bg-surface-2 hover:text-ink")}
              aria-label={speech.state === "listening" ? "Parar ditado" : "Ditar"}
              hidden={!speech.supported}
            >
              {speech.state === "listening" ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {speech.state === "listening" ? "Ouvindo…" : "Ditar"}
            </button>
            <span className="flex-1" />
            <Button variant="primary" size="sm" onClick={submit} loading={busy} disabled={!text.trim()}>
              <Send className="h-4 w-4" /> Salvar
            </Button>
          </div>
        </div>
        {speech.error && <p className="text-[13px] text-orange">{speech.error}</p>}

        {preview ? (
          <div className="flex animate-fade-in items-center gap-3 rounded-2xl border border-violet/20 bg-violet/8 px-3.5 py-3">
            <Sparkles className="h-4 w-4 shrink-0 text-[#c4b1ff]" />
            <div className="min-w-0 flex-1 text-sm">
              <span className="font-medium text-[#d4c6ff]">{preview.label}</span>
              {preview.detail && <span className="text-muted"> · {preview.detail}</span>}
              {preview.extra && <span className="block text-[12px] text-faint">{preview.extra}</span>}
            </div>
          </div>
        ) : (
          <p className="px-1 text-[13px] text-faint">A AIVA entende datas, horários, pessoas e o tipo de item. Tudo fica também na sua Inbox para organizar depois.</p>
        )}
      </div>
  );
}

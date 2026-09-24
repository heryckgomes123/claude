"use client";

import { useState, type ReactNode } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { Button, Input, Textarea } from "@/components/ui";
import { ReplyView } from "@/components/ai/ReplyView";
import { api, tzOffset } from "@/lib/client-api";
import type { AiReply } from "@/lib/ai/reply";
import { useAiva, type Change } from "@/store/aiva";
import { cn } from "@/lib/cn";

/** Local editable copy of a prop that resets whenever the prop changes (no effect needed). */
function useSyncedState(value: string): [string, (v: string) => void] {
  const [state, setState] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setState(value);
  }
  return [state, setState];
}

/** Text input that saves on blur / Enter (no request per keystroke). */
export function CommitInput({ value, onCommit, className, placeholder, big, ...rest }: { value: string | null | undefined; onCommit: (v: string) => void; className?: string; placeholder?: string; big?: boolean } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [v, setV] = useSyncedState(value ?? "");
  const commit = () => v !== (value ?? "") && onCommit(v);
  if (big)
    return (
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        placeholder={placeholder}
        className={cn("w-full min-w-0 bg-transparent text-xl font-semibold outline-none placeholder:text-faint", className)}
        {...rest}
      />
    );
  return <Input value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()} placeholder={placeholder} className={className} {...rest} />;
}

export function CommitArea({ value, onCommit, rows = 4, placeholder, className, mono }: { value: string | null | undefined; onCommit: (v: string) => void; rows?: number; placeholder?: string; className?: string; mono?: boolean }) {
  const [v, setV] = useSyncedState(value ?? "");
  return <Textarea value={v} rows={rows} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={() => v !== (value ?? "") && onCommit(v)} className={cn("resize-y leading-relaxed", mono && "font-mono text-[13px]", className)} />;
}

export function Row({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </div>
  );
}

export function ChipRow<T extends string>({ value, options, onChange, labels, colors }: { value: T; options: readonly T[]; onChange: (v: T) => void; labels: Record<string, string>; colors?: Record<string, string> }) {
  return (
    <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 no-scrollbar">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn("pressable flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium", value === o ? "border-transparent bg-ink text-bg" : "border-line bg-surface text-muted hover:text-ink")}
        >
          {colors?.[o] && <span className="h-2 w-2 rounded-full" style={{ background: colors[o] }} />}
          {labels[o] ?? o}
        </button>
      ))}
    </div>
  );
}

export function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onDelete} className="text-red hover:bg-red/10 hover:text-red">
      <Trash2 className="h-4 w-4" /> Excluir
    </Button>
  );
}

export function Meta({ createdAt, updatedAt, extra }: { createdAt: string; updatedAt?: string; extra?: string }) {
  const f = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <p className="text-[11px] text-faint">
      Criado {f(createdAt)}
      {updatedAt && updatedAt !== createdAt ? ` · atualizado ${f(updatedAt)}` : ""}
      {extra ? ` · ${extra}` : ""}
    </p>
  );
}

/** Inline AIVA helper: runs a prompt against the real workspace and shows the reply in place. */
export function AskAiva({ prompts, className }: { prompts: { label: string; prompt: string }[]; className?: string }) {
  const [reply, setReply] = useState<AiReply | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const applyChanges = useAiva((s) => s.applyChanges);
  const toast = useAiva((s) => s.toast);
  const run = async (label: string, prompt: string) => {
    setBusy(label);
    try {
      const r = await api<AiReply>("/api/ai/chat", { body: { message: prompt, tzOffset: tzOffset(), source: "studio" } });
      applyChanges(r.changes as Change[]);
      setReply(r);
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Erro", tone: "error" });
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className={cn("grid gap-3", className)}>
      <div className="flex flex-wrap gap-2">
        {prompts.map((p) => (
          <Button key={p.label} size="sm" variant="soft" loading={busy === p.label} onClick={() => run(p.label, p.prompt)}>
            <Sparkles className="h-3.5 w-3.5" /> {p.label}
          </Button>
        ))}
      </div>
      {reply && (
        <div className="animate-rise rounded-2xl border border-violet/20 bg-violet/5 p-3.5">
          <ReplyView reply={reply} compact />
        </div>
      )}
    </div>
  );
}

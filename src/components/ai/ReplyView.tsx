"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, X, ChevronRight, CalendarClock, Sparkles, AlertTriangle, Coffee } from "lucide-react";
import type { AiReply } from "@/lib/ai/reply";
import { Markdown } from "./Markdown";
import { Button } from "@/components/ui";
import { api } from "@/lib/client-api";
import { useAiva, type Change } from "@/store/aiva";
import { fmtTime } from "@/lib/intelligence";
import { cn } from "@/lib/cn";

const TONE: Record<string, string> = { danger: "bg-red", warn: "bg-orange", info: "bg-blue", ok: "bg-green" };

export function ReplyView({ reply, onFollowup, compact }: { reply: AiReply; onFollowup?: (text: string) => void; compact?: boolean }) {
  const applyChanges = useAiva((s) => s.applyChanges);
  const toast = useAiva((s) => s.toast);
  const [resolved, setResolved] = useState<Record<string, "confirm" | "cancel">>({});
  const [busy, setBusy] = useState<string | null>(null);

  const decide = async (id: string, decision: "confirm" | "cancel") => {
    setBusy(id);
    try {
      const res = await api<{ executed: unknown[]; changes: Change[]; errors: string[] }>(`/api/ai/proposals/${id}`, { body: { decision } });
      applyChanges(res.changes);
      setResolved((r) => ({ ...r, [id]: decision }));
      if (decision === "confirm") toast({ message: res.errors.length ? `Aplicado com avisos: ${res.errors[0]}` : `Feito — ${res.executed.length} ${res.executed.length === 1 ? "alteração" : "alterações"}`, tone: res.errors.length ? "error" : "ai" });
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Erro", tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid min-w-0 gap-3">
      {reply.message && <Markdown text={reply.message} />}

      {reply.executed.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {reply.executed.map((e, i) => (
            <span key={i} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-green/12 px-2 py-1 text-[12px] text-green">
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{e.code.replace(/_/g, " ").toLowerCase()} · {e.title}</span>
            </span>
          ))}
        </div>
      )}

      {reply.plan && reply.plan.length > 0 && (
        <div className="card divide-y divide-line overflow-hidden p-0">
          {reply.plan.map((b, i) => (
            <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="w-12 shrink-0 font-mono text-[12px] text-muted">{fmtTime(b.start, new Date().getTimezoneOffset())}</span>
              <span className={cn("h-7 w-1 shrink-0 rounded-full", b.kind === "event" ? "bg-blue" : b.kind === "break" ? "bg-surface-3" : "grad")} />
              {b.kind === "break" ? <Coffee className="h-4 w-4 text-faint" /> : b.kind === "event" ? <CalendarClock className="h-4 w-4 text-blue" /> : null}
              <span className={cn("min-w-0 flex-1 truncate text-sm", b.kind === "break" && "text-faint")}>{b.title}</span>
            </div>
          ))}
        </div>
      )}

      {reply.items && reply.items.length > 0 && (
        <div className="card divide-y divide-line overflow-hidden p-0">
          {reply.items.slice(0, compact ? 5 : 12).map((it) => (
            <Link key={`${it.entity}:${it.id}`} href={it.href} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-surface-2">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE[it.tone ?? ""] ?? "bg-violet")} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{it.title}</span>
                {it.meta && <span className="block truncate text-[12px] text-muted">{it.meta}</span>}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-faint" />
            </Link>
          ))}
        </div>
      )}

      {reply.proposals.map((p) => {
        const state = resolved[p.id];
        return (
          <div key={p.id} className={cn("rounded-2xl border p-3.5", p.destructive ? "border-red/30 bg-red/5" : "grad-soft border-violet/25")}>
            <div className="mb-3 flex items-start gap-2 text-sm">
              {p.destructive ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red" /> : <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#c4b1ff]" />}
              <span className="min-w-0 flex-1">{p.label}</span>
            </div>
            {state ? (
              <p className="text-[13px] text-muted">{state === "confirm" ? "✓ Aplicado" : "Cancelado"}</p>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant={p.destructive ? "danger" : "primary"} loading={busy === p.id} onClick={() => decide(p.id, "confirm")}>
                  <Check className="h-4 w-4" /> Confirmar
                </Button>
                <Button size="sm" variant="ghost" disabled={busy === p.id} onClick={() => decide(p.id, "cancel")}>
                  <X className="h-4 w-4" /> Cancelar
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {reply.errors && reply.errors.length > 0 && <p className="text-[12px] text-orange">{reply.errors.join(" · ")}</p>}

      {onFollowup && reply.followups && reply.followups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {reply.followups.map((f) => (
            <button key={f} onClick={() => onFollowup(f)} className="pressable rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] text-muted hover:text-ink">
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

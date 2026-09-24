"use client";

import { useState } from "react";
import { Plus, X, GripVertical } from "lucide-react";
import { Checkbox, Input, Select } from "@/components/ui";
import type { ChecklistItem } from "@/lib/types";
import { newId } from "@/lib/id";
import { useList } from "@/store/aiva";
import { cn } from "@/lib/cn";

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO → value for <input type="datetime-local"> / "date" in the device timezone. */
export function toLocalInput(iso: string | null | undefined, withTime = true) {
  if (!iso) return "";
  const d = new Date(iso);
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return withTime ? `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
}

export function fromLocalInput(v: string, withTime = true): string | null {
  if (!v) return null;
  if (!withTime) {
    const [y, m, d] = v.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0).toISOString();
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function DateTimeField({ value, hasTime, onChange, allowTimeToggle = true }: { value: string | null; hasTime: boolean; onChange: (iso: string | null, hasTime: boolean) => void; allowTimeToggle?: boolean }) {
  return (
    <div className="flex min-w-0 gap-2">
      <Input
        type={hasTime ? "datetime-local" : "date"}
        value={toLocalInput(value, hasTime)}
        onChange={(e) => onChange(fromLocalInput(e.target.value, hasTime), hasTime)}
        className="min-w-0 flex-1 [color-scheme:dark]"
      />
      {allowTimeToggle && (
        <button
          type="button"
          onClick={() => {
            const next = !hasTime;
            if (!value) return onChange(null, next);
            const d = new Date(value);
            if (!next) d.setHours(12, 0, 0, 0);
            else d.setHours(9, 0, 0, 0);
            onChange(d.toISOString(), next);
          }}
          className={cn("pressable h-11 shrink-0 rounded-xl border px-3 text-[13px]", hasTime ? "border-violet/40 bg-violet/15 text-ink" : "border-line bg-surface text-muted")}
        >
          {hasTime ? "Com hora" : "Dia todo"}
        </button>
      )}
      {value && (
        <button type="button" onClick={() => onChange(null, false)} className="pressable grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface text-faint hover:text-ink" aria-label="Limpar data">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function ChecklistEditor({ items, onChange, placeholder = "Adicionar item" }: { items: ChecklistItem[]; onChange: (items: ChecklistItem[]) => void; placeholder?: string }) {
  const [text, setText] = useState("");
  const add = () => {
    const t = text.trim();
    if (!t) return;
    onChange([...items, { id: newId(), text: t, done: false }]);
    setText("");
  };
  const done = items.filter((i) => i.done).length;
  return (
    <div className="grid gap-1.5">
      {items.length > 0 && <p className="text-[12px] text-faint">{done}/{items.length} concluídos</p>}
      {items.map((it) => (
        <div key={it.id} className="group flex min-h-11 items-center gap-2.5 rounded-xl bg-surface px-2.5">
          <GripVertical className="h-4 w-4 shrink-0 text-faint/50" />
          <Checkbox checked={it.done} onChange={(v) => onChange(items.map((x) => (x.id === it.id ? { ...x, done: v } : x)))} size={20} />
          <input
            value={it.text}
            onChange={(e) => onChange(items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)))}
            className={cn("min-w-0 flex-1 bg-transparent py-2 text-sm outline-none", it.done && "text-faint line-through")}
            aria-label="Item"
          />
          <button type="button" onClick={() => onChange(items.filter((x) => x.id !== it.id))} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-faint opacity-60 hover:bg-surface-3 hover:text-ink group-hover:opacity-100" aria-label="Remover item">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder={placeholder} className="min-w-0 flex-1" />
        <button type="button" onClick={add} className="pressable grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted hover:text-ink" aria-label="Adicionar">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ProjectSelect({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const projects = useList("projects").filter((p) => p.status !== "archived" || p.id === value);
  return (
    <Select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">Sem projeto</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.emoji ? `${p.emoji} ` : ""}
          {p.name}
        </option>
      ))}
    </Select>
  );
}

export function ClientSelect({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const clients = useList("clients");
  return (
    <Select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">Nenhum</option>
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
          {c.company ? ` · ${c.company}` : ""}
        </option>
      ))}
    </Select>
  );
}

export function CampaignSelect({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const campaigns = useList("campaigns");
  return (
    <Select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">Nenhuma</option>
      {campaigns.map((c) => (
        <option key={c.id} value={c.id}>
          {c.title}
        </option>
      ))}
    </Select>
  );
}

export const PRIORITY_LABEL: Record<string, string> = { none: "Sem prioridade", low: "Baixa", medium: "Média", high: "Alta", urgent: "Urgente" };
export const PRIORITY_TONE: Record<string, "default" | "blue" | "yellow" | "orange" | "red"> = { none: "default", low: "blue", medium: "yellow", high: "orange", urgent: "red" };
export const STATUS_LABEL: Record<string, string> = { inbox: "Inbox", todo: "A fazer", doing: "Em andamento", waiting: "Aguardando", done: "Concluído" };
export const PLATFORM_LABEL: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", shorts: "Shorts", reels: "Reels", twitch: "Twitch", linkedin: "LinkedIn", kwai: "Kwai", x: "X", other: "Outra" };
export const FORMAT_LABEL: Record<string, string> = { reel: "Reel", short: "Short", video: "Vídeo", post: "Post", carousel: "Carrossel", story: "Story", live: "Live", thread: "Thread" };
export const CAMPAIGN_STAGE_LABEL: Record<string, string> = {
  contact: "Contato",
  interested: "Interessada",
  proposal: "Proposta",
  negotiation: "Negociação",
  approved: "Aprovada",
  production: "Produção",
  delivery: "Entrega",
  payment: "Pagamento",
  done: "Concluída",
  lost: "Perdida",
};
export const CLIENT_STAGE_LABEL: Record<string, string> = { new: "Novo", contacted: "Contatado", proposal: "Proposta", negotiation: "Negociação", won: "Fechado", lost: "Perdido" };
export const EVENT_KIND_LABEL: Record<string, string> = { meeting: "Reunião", appointment: "Compromisso", recording: "Gravação", live: "Live", publish: "Publicação", deadline: "Prazo", personal: "Pessoal" };
export const EVENT_KIND_COLOR: Record<string, string> = { meeting: "#3d8bff", appointment: "#8b5cff", recording: "#ff4fb0", live: "#ff5c7a", publish: "#3ddc97", deadline: "#ffa24c", personal: "#38d6f5" };

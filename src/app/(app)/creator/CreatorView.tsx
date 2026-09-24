"use client";

import { currentSearch, replaceUrl } from "@/lib/nav";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clapperboard, Lightbulb, CalendarDays, Radio, Megaphone, Wand2, BarChart3, Plus, Star, FileText, Send, Sparkles, Link2 } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/PageHeader";
import { Board } from "@/components/Board";
import { Button, Chip, EmptyState, Badge, Sheet, Field, Input, Select, Card, SectionTitle, Progress } from "@/components/ui";
import { ReplyView } from "@/components/ai/ReplyView";
import { StatTile, BarChart, RankBars } from "@/components/charts";
import { useAiva, useList, type Change } from "@/store/aiva";
import { useClock } from "@/hooks/use-clock";
import { useSettings } from "@/hooks/use-snapshot";
import { api, tzOffset } from "@/lib/client-api";
import type { AiReply } from "@/lib/ai/reply";
import { STAGE_LABEL, fmtWhen, fmtDay, brl } from "@/lib/intelligence";
import { CONTENT_STAGE, CAMPAIGN_STAGE, type EntityName } from "@/lib/entities";
import { PLATFORM_LABEL, FORMAT_LABEL, CAMPAIGN_STAGE_LABEL } from "@/components/detail/fields";
import { cn } from "@/lib/cn";

type Tab = "pipeline" | "ideas" | "calendar" | "lives" | "brands" | "studio" | "analytics";
const TABS: { value: Tab; label: string; icon: typeof Clapperboard }[] = [
  { value: "pipeline", label: "Pipeline", icon: Clapperboard },
  { value: "ideas", label: "Ideias", icon: Lightbulb },
  { value: "calendar", label: "Calendário", icon: CalendarDays },
  { value: "lives", label: "Lives", icon: Radio },
  { value: "brands", label: "Marcas", icon: Megaphone },
  { value: "studio", label: "Studio", icon: Wand2 },
  { value: "analytics", label: "Analytics", icon: BarChart3 },
];

const STAGE_COLOR: Record<string, string> = {
  idea: "#6f6d86",
  script: "#3d8bff",
  recording: "#ff4fb0",
  editing: "#8b5cff",
  review: "#ffa24c",
  scheduled: "#38d6f5",
  published: "#3ddc97",
  analyzed: "#a3a1b8",
};

export function CreatorView() {
  const settings = useSettings();
  const setUI = useAiva((s) => s.setUI);
  const saveSettings = useAiva((s) => s.saveSettings);
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = params.get("tab") as Tab | null;
    return t && TABS.some((x) => x.value === t) ? t : "pipeline";
  });

  useEffect(() => {
    const p = currentSearch();
    const t = p.get("tab");
    const open = p.get("open");
    if (open) {
      const entity: EntityName = t === "ideas" ? "ideas" : t === "lives" ? "lives" : t === "brands" ? "campaigns" : "contents";
      setUI({ detail: { entity, id: open } });
      p.delete("open");
      replaceUrl(`/creator${p.toString() ? `?${p}` : ""}`);
    }
  }, [setUI]);

  if (!settings.creatorMode) {
    return (
      <Page>
        <PageHeader title="Creator" />
        <EmptyState
          icon={<Clapperboard className="h-5 w-5" />}
          title="Ative o Creator Mode"
          text="Ideias, roteiros, pipeline de conteúdo, calendário editorial, lives, marcas e métricas — integrados ao seu segundo cérebro."
          action={<Button variant="primary" onClick={() => saveSettings({ creatorMode: true })}>Ativar Creator Mode</Button>}
        />
      </Page>
    );
  }

  return (
    <Page wide>
      <PageHeader title="Creator" subtitle={(settings.platforms ?? []).map((p) => PLATFORM_LABEL[p] ?? p).join(" · ") || "Seu estúdio de conteúdo"} />
      <div className="-mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 no-scrollbar lg:mx-0 lg:px-0">
        {TABS.map((t) => (
          <Chip
            key={t.value}
            active={tab === t.value}
            onClick={() => {
              setTab(t.value);
              replaceUrl(`/creator?tab=${t.value}`);
            }}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </Chip>
        ))}
      </div>
      {tab === "pipeline" && <Pipeline />}
      {tab === "ideas" && <IdeaVault />}
      {tab === "calendar" && <EditorialCalendar />}
      {tab === "lives" && <LiveCenter />}
      {tab === "brands" && <Brands />}
      {tab === "studio" && <Studio />}
      {tab === "analytics" && <CreatorAnalytics />}
    </Page>
  );
}

/* ------------------------------------------------------------------ */

function Pipeline() {
  const contents = useList("contents");
  const campaigns = useList("campaigns");
  const create = useAiva((s) => s.create);
  const update = useAiva((s) => s.update);
  const setUI = useAiva((s) => s.setUI);
  const clock = useClock();
  const [platform, setPlatform] = useState("");
  const platforms = Array.from(new Set(contents.map((c) => c.platform).filter(Boolean))) as string[];
  const list = contents.filter((c) => !platform || c.platform === platform);
  return (
    <>
      {platforms.length > 1 && (
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 no-scrollbar lg:mx-0 lg:px-0">
          <Chip active={!platform} onClick={() => setPlatform("")}>Todas</Chip>
          {platforms.map((p) => (
            <Chip key={p} active={platform === p} onClick={() => setPlatform(p)}>{PLATFORM_LABEL[p] ?? p}</Chip>
          ))}
        </div>
      )}
      <Board
        columns={CONTENT_STAGE.map((s) => ({ id: s, title: STAGE_LABEL[s], color: STAGE_COLOR[s] }))}
        items={list}
        columnOf={(c) => c.stage}
        onMove={(c, stage) => update("contents", c.id, { stage })}
        onAdd={async (stage) => {
          const row = await create("contents", { title: "Novo conteúdo", stage, platform: platform || null }, { silent: true });
          if (row) setUI({ detail: { entity: "contents", id: row.id } });
        }}
        renderCard={(c) => {
          const camp = campaigns.find((k) => k.id === c.campaignId);
          return (
            <button onClick={() => setUI({ detail: { entity: "contents", id: c.id } })} className="card block w-full bg-bg-2 p-3 text-left hover:bg-surface-2">
              <p className="text-sm leading-snug">{c.title}</p>
              {c.hook && <p className="mt-1 line-clamp-2 text-[12px] text-muted">“{c.hook}”</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.platform && <Badge tone="violet">{PLATFORM_LABEL[c.platform] ?? c.platform}</Badge>}
                {c.format && <Badge>{FORMAT_LABEL[c.format] ?? c.format}</Badge>}
                {c.scheduledAt && <Badge tone="blue">{fmtWhen(c.scheduledAt, true, clock)}</Badge>}
                {c.script && <Badge tone="green"><FileText className="h-3 w-3" /> roteiro</Badge>}
                {camp && <Badge tone="orange"><Link2 className="h-3 w-3" /> {camp.title}</Badge>}
              </div>
            </button>
          );
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */

function IdeaVault() {
  const ideas = useList("ideas");
  const create = useAiva((s) => s.create);
  const setUI = useAiva((s) => s.setUI);
  const router = useRouter();
  const [status, setStatus] = useState("open");
  const list = ideas
    .filter((i) => (status === "open" ? !["used", "discarded"].includes(i.status) : i.status === status))
    .sort((a, b) => b.potential - a.potential || b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="-mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
          {[
            ["open", "Abertas"],
            ["approved", "Aprovadas"],
            ["used", "Usadas"],
            ["discarded", "Descartadas"],
          ].map(([v, l]) => (
            <Chip key={v} active={status === v} onClick={() => setStatus(v)}>{l}</Chip>
          ))}
        </div>
        <Button size="sm" variant="soft" onClick={() => router.push(`/aiva?q=${encodeURIComponent("Crie 10 ideias de conteúdo")}`)}>
          <Sparkles className="h-4 w-4" /> Gerar ideias
        </Button>
        <Button size="sm" variant="primary" onClick={async () => {
          const row = await create("ideas", { title: "Nova ideia", status: "raw" }, { silent: true });
          if (row) setUI({ detail: { entity: "ideas", id: row.id } });
        }}>
          <Plus className="h-4 w-4" /> Ideia
        </Button>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Lightbulb className="h-5 w-5" />} title="Idea Vault vazio" text="Diga “tive uma ideia de vídeo sobre…” para a AIVA, ou peça ideias no Studio." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((i) => (
            <button key={i.id} onClick={() => setUI({ detail: { entity: "ideas", id: i.id } })} className="card flex flex-col gap-2 p-4 text-left hover:bg-surface-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn("h-3.5 w-3.5", n <= i.potential ? "fill-yellow text-yellow" : "text-faint/40")} />)}</span>
                {i.platform && <Badge tone="violet">{PLATFORM_LABEL[i.platform] ?? i.platform}</Badge>}
              </div>
              <p className="font-medium leading-snug">{i.title}</p>
              {i.hook && <p className="line-clamp-2 text-[13px] text-muted">“{i.hook}”</p>}
              <p className="mt-auto pt-1 text-[11px] text-faint">{i.category ?? "Sem categoria"} · {i.status === "raw" ? "bruta" : i.status}</p>
            </button>
          ))}
        </div>
      )}
      <p className="mt-6 text-center text-[12px] text-faint">IDEIA → HOOK → ROTEIRO → GRAVAÇÃO → EDIÇÃO → PUBLICAÇÃO → ANÁLISE</p>
    </>
  );
}

/* ------------------------------------------------------------------ */

function EditorialCalendar() {
  const contents = useList("contents");
  const setUI = useAiva((s) => s.setUI);
  const update = useAiva((s) => s.update);
  const clock = useClock();
  const router = useRouter();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(clock.now.getFullYear(), clock.now.getMonth(), clock.now.getDate() + i);
    return d;
  });
  const unscheduled = contents.filter((c) => !c.scheduledAt && !["published", "analyzed"].includes(c.stage));
  const sameDay = (iso: string, d: Date) => {
    const x = new Date(iso);
    return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate();
  };
  const schedule = (id: string, d: Date) => {
    const at = new Date(d);
    at.setHours(18, 0, 0, 0);
    const c = contents.find((x) => x.id === id);
    update("contents", id, { scheduledAt: at.toISOString(), ...(c && c.stage === "review" ? { stage: "scheduled" } : {}) });
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-2">
        {days.map((d) => {
          const list = contents.filter((c) => c.scheduledAt && sameDay(c.scheduledAt, d));
          return (
            <div key={d.toISOString()} className="card flex gap-3 p-3" onDragOver={(e) => e.preventDefault()} onDrop={(e) => schedule(e.dataTransfer.getData("text/plain"), d)}>
              <div className="w-12 shrink-0 text-center">
                <p className="text-[10px] uppercase text-faint">{d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</p>
                <p className="text-lg font-semibold">{d.getDate()}</p>
              </div>
              <div className="grid min-w-0 flex-1 content-center gap-1.5">
                {list.length === 0 && <p className="text-[13px] text-faint">Sem publicação</p>}
                {list.map((c) => (
                  <button key={c.id} onClick={() => setUI({ detail: { entity: "contents", id: c.id } })} className="flex min-w-0 items-center gap-2 rounded-xl bg-surface-2 px-2.5 py-2 text-left">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STAGE_COLOR[c.stage] }} />
                    <span className="min-w-0 flex-1 truncate text-sm">{c.title}</span>
                    <span className="shrink-0 text-[11px] text-muted">{new Date(c.scheduledAt!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} {c.platform ? `· ${PLATFORM_LABEL[c.platform] ?? c.platform}` : ""}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid content-start gap-3">
        <SectionTitle title="Sem data" count={unscheduled.length} />
        {unscheduled.length === 0 && <p className="text-sm text-faint">Tudo agendado.</p>}
        {unscheduled.map((c) => (
          <div key={c.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)} className="card flex items-center gap-2 p-3">
            <button onClick={() => setUI({ detail: { entity: "contents", id: c.id } })} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm">{c.title}</p>
              <p className="text-[11px] text-muted">{STAGE_LABEL[c.stage]}</p>
            </button>
            <Select className="h-9 w-28 text-[13px]" value="" onChange={(e) => e.target.value && schedule(c.id, days[Number(e.target.value)])} aria-label="Agendar para">
              <option value="">Agendar</option>
              {days.map((d, i) => <option key={i} value={i}>{fmtDay(d.toISOString(), clock)}</option>)}
            </Select>
          </div>
        ))}
        <Button variant="soft" onClick={() => router.push(`/aiva?q=${encodeURIComponent("Crie um calendário de conteúdo para os próximos 7 dias")}`)}>
          <Sparkles className="h-4 w-4" /> Planejar 7 dias com AIVA
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LiveCenter() {
  const lives = useList("lives");
  const create = useAiva((s) => s.create);
  const setUI = useAiva((s) => s.setUI);
  const settings = useSettings();
  const clock = useClock();
  const upcoming = lives.filter((l) => l.status !== "done").sort((a, b) => (a.startAt ?? "9").localeCompare(b.startAt ?? "9"));
  const past = lives.filter((l) => l.status === "done");
  const add = async () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(20, 0, 0, 0);
    const row = await create("lives", { title: "Nova live", startAt: d.toISOString(), platform: settings.platforms?.find((p) => ["twitch", "youtube", "tiktok", "instagram"].includes(p)) ?? null, status: "planned" }, { silent: true });
    if (row) setUI({ detail: { entity: "lives", id: row.id } });
  };
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" size="sm" onClick={add}><Plus className="h-4 w-4" /> Nova live</Button>
      </div>
      {lives.length === 0 ? (
        <EmptyState icon={<Radio className="h-5 w-5" />} title="Nenhuma live planejada" text="Planeje pauta, convidados, checklist de equipamentos e metas — e depois transforme os melhores momentos em cortes." />
      ) : (
        <div className="grid gap-6">
          {upcoming.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {upcoming.map((l) => {
                const done = l.checklist.filter((c) => c.done).length;
                return (
                  <button key={l.id} onClick={() => setUI({ detail: { entity: "lives", id: l.id } })} className="card grid gap-3 p-4 text-left hover:bg-surface-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("relative h-2.5 w-2.5 rounded-full", l.status === "live" ? "dot-pulse bg-red text-red" : "bg-red/60")} />
                      <span className="text-[12px] text-muted">{l.startAt ? fmtWhen(l.startAt, true, clock) : "Sem data"}{l.platform ? ` · ${PLATFORM_LABEL[l.platform] ?? l.platform}` : ""}</span>
                    </div>
                    <p className="font-medium">{l.title}</p>
                    <div>
                      <p className="mb-1 text-[12px] text-muted">Checklist {done}/{l.checklist.length}{!l.agenda ? " · sem pauta" : ""}</p>
                      <Progress value={l.checklist.length ? (done / l.checklist.length) * 100 : 0} tone={done === l.checklist.length ? "green" : "grad"} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {past.length > 0 && (
            <section>
              <SectionTitle title="Lives realizadas" count={past.length} />
              <div className="card divide-y divide-line p-1">
                {past.map((l) => (
                  <button key={l.id} onClick={() => setUI({ detail: { entity: "lives", id: l.id } })} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
                    <span className="min-w-0 flex-1 truncate text-sm">{l.title}</span>
                    {l.metrics.peakViewers != null && <Badge>pico {l.metrics.peakViewers}</Badge>}
                    {l.startAt && <span className="text-[12px] text-muted">{fmtDay(l.startAt, clock)}</span>}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      <p className="mt-6 text-center text-[12px] text-faint">LIVE → MÉTRICAS → MELHORES MOMENTOS → CLIPES → CONTEÚDOS</p>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Brands() {
  const campaigns = useList("campaigns");
  const brands = useList("brands");
  const create = useAiva((s) => s.create);
  const update = useAiva((s) => s.update);
  const setUI = useAiva((s) => s.setUI);
  const clock = useClock();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ brand: "", newBrand: "", title: "", value: "", due: "" });
  const pipeline = CAMPAIGN_STAGE.filter((s) => s !== "lost");
  const active = campaigns.filter((c) => c.stage !== "lost");
  const totalOpen = active.filter((c) => !c.paid).reduce((a, c) => a + (c.value ?? 0), 0);

  const submit = async () => {
    let brandId = form.brand || null;
    if (!brandId && form.newBrand.trim()) {
      const b = await create("brands", { name: form.newBrand.trim() }, { silent: true });
      brandId = b?.id ?? null;
    }
    const brandName = brands.find((b) => b.id === brandId)?.name ?? form.newBrand.trim();
    const row = await create("campaigns", {
      title: form.title.trim() || `Campanha ${brandName || "nova"}`,
      brandId,
      value: form.value ? Number(form.value) : null,
      dueAt: form.due ? new Date(`${form.due}T12:00`).toISOString() : null,
      stage: "contact",
    }, { silent: true });
    setOpen(false);
    setForm({ brand: "", newBrand: "", title: "", value: "", due: "" });
    if (row) setUI({ detail: { entity: "campaigns", id: row.id } });
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-sm text-muted">{active.length} campanhas · {brl(totalOpen)} em aberto · {brands.length} marcas</p>
        <Button variant="primary" size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Campanha</Button>
      </div>
      <Board
        columns={pipeline.map((s) => ({ id: s, title: CAMPAIGN_STAGE_LABEL[s], color: s === "done" ? "#3ddc97" : s === "payment" ? "#ffd55c" : "#8b5cff" }))}
        items={active}
        columnOf={(c) => c.stage}
        onMove={(c, stage) => update("campaigns", c.id, { stage })}
        renderCard={(c) => {
          const brand = brands.find((b) => b.id === c.brandId);
          const done = c.deliverables.filter((d) => d.done).length;
          return (
            <button onClick={() => setUI({ detail: { entity: "campaigns", id: c.id } })} className="card block w-full bg-bg-2 p-3 text-left hover:bg-surface-2">
              <p className="text-[12px] text-muted">{brand?.name ?? "Sem marca"}</p>
              <p className="text-sm font-medium leading-snug">{c.title}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.value != null && <Badge tone={c.paid ? "green" : "yellow"}>{brl(c.value)}</Badge>}
                {c.dueAt && <Badge tone={new Date(c.dueAt) < clock.now && !["done", "payment"].includes(c.stage) ? "red" : "default"}>{fmtDay(c.dueAt, clock)}</Badge>}
                {c.deliverables.length > 0 && <Badge>{done}/{c.deliverables.length} entregues</Badge>}
              </div>
            </button>
          );
        }}
      />
      <p className="mt-2 text-center text-[12px] text-faint">MARCA → CONTATO → PROPOSTA → NEGOCIAÇÃO → APROVADA → PRODUÇÃO → ENTREGA → PAGAMENTO</p>

      <Sheet open={open} onClose={() => setOpen(false)} title="Nova campanha" size="sm" footer={<Button variant="primary" className="w-full" onClick={submit} disabled={!form.brand && !form.newBrand.trim()}>Criar campanha</Button>}>
        <div className="grid gap-4">
          <Field label="Marca">
            <Select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}>
              <option value="">+ Nova marca</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          {!form.brand && (
            <Field label="Nome da marca">
              <Input value={form.newBrand} onChange={(e) => setForm({ ...form, newBrand: e.target.value })} placeholder="Ex.: Nike" data-autofocus />
            </Field>
          )}
          <Field label="Título (opcional)">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Lançamento tênis X" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <Input type="number" inputMode="decimal" min={0} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </Field>
            <Field label="Prazo">
              <Input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} className="[color-scheme:dark]" />
            </Field>
          </div>
        </div>
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------------ */

const STUDIO_PROMPTS = [
  "Crie 10 ideias de TikTok",
  "Transforme essa ideia em roteiro",
  "Crie um hook mais forte",
  "Faça uma legenda para Instagram",
  "Crie 5 variações desse conteúdo",
  "Crie um calendário de conteúdo para os próximos 7 dias",
  "Analise minhas ideias e diga quais estão mais alinhadas com meu objetivo",
];

function Studio() {
  const provider = useAiva((s) => s.me?.ai.provider);
  const applyChanges = useAiva((s) => s.applyChanges);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [thread, setThread] = useState<{ q: string; reply: AiReply }[]>([]);
  const [conv, setConv] = useState<string | null>(null);
  const run = async (q: string) => {
    if (!q.trim() || busy) return;
    setBusy(true);
    setInput("");
    try {
      const reply = await api<AiReply>("/api/ai/chat", { body: { message: q, conversationId: conv, tzOffset: tzOffset(), source: "studio" } });
      setConv(reply.conversationId);
      applyChanges(reply.changes as Change[]);
      setThread((t) => [{ q, reply }, ...t]);
    } catch (err) {
      setThread((t) => [{ q, reply: { conversationId: "", message: err instanceof Error ? err.message : "Erro", provider: "local", executed: [], proposals: [], changes: [] } }, ...t]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <Card className="grad-soft border-violet/20 p-5">
        <p className="flex items-center gap-2 font-medium"><Wand2 className="h-4 w-4 text-[#c4b1ff]" /> AI Content Studio</p>
        <p className="mt-1 text-sm text-muted">A AIVA trabalha em cima das suas ideias, conteúdos, nicho e metas. {provider === "local" && <span className="text-faint">(modo local — templates; conecte a API da Anthropic para criação personalizada)</span>}</p>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); run(input); }}>
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Peça qualquer coisa de conteúdo…" className="min-w-0 flex-1" />
          <Button variant="primary" size="icon" loading={busy} aria-label="Enviar"><Send className="h-4 w-4" /></Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {STUDIO_PROMPTS.map((p) => (
            <button key={p} disabled={busy} onClick={() => run(p)} className="pressable rounded-full border border-line bg-bg-2/60 px-3 py-1.5 text-[13px] text-muted hover:text-ink disabled:opacity-50">{p}</button>
          ))}
        </div>
      </Card>
      {thread.map((t, i) => (
        <div key={i} className="card animate-rise p-4">
          <p className="mb-3 text-[13px] font-medium text-muted">{t.q}</p>
          <ReplyView reply={t.reply} onFollowup={run} />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CreatorAnalytics() {
  const contents = useList("contents");
  const lives = useList("lives");
  const campaigns = useList("campaigns");
  const txs = useList("transactions");
  const clock = useClock();
  const published = contents.filter((c) => c.publishedAt);
  const monthStart = new Date(clock.now.getFullYear(), clock.now.getMonth(), 1).getTime();
  const thisMonth = published.filter((c) => new Date(c.publishedAt!).getTime() >= monthStart);
  const sum = (k: "views" | "reach" | "likes" | "comments" | "shares" | "saves" | "followers") => published.reduce((a, c) => a + (c.metrics?.[k] ?? 0), 0);
  const views = sum("views");
  const interactions = sum("likes") + sum("comments") + sum("shares") + sum("saves");
  const withMetrics = published.filter((c) => c.metrics?.views);
  const engagement = withMetrics.length ? (withMetrics.reduce((a, c) => a + ((c.metrics.likes ?? 0) + (c.metrics.comments ?? 0) + (c.metrics.shares ?? 0) + (c.metrics.saves ?? 0)), 0) / withMetrics.reduce((a, c) => a + (c.metrics.views ?? 0), 0)) * 100 : null;
  const revenue = txs.filter((t) => t.kind === "income" && t.status === "done" && ["campaign", "publi"].includes(t.category)).reduce((a, t) => a + t.amount, 0);

  // Published per week, last 8 weeks
  const weeks = (() => {
    const out: { label: string; value: number }[] = [];
    const startThisWeek = new Date(clock.now.getFullYear(), clock.now.getMonth(), clock.now.getDate() - ((clock.now.getDay() + 6) % 7));
    for (let i = 7; i >= 0; i--) {
      const s = new Date(startThisWeek.getFullYear(), startThisWeek.getMonth(), startThisWeek.getDate() - i * 7);
      const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7);
      out.push({ label: `${s.getDate()}/${s.getMonth() + 1}`, value: published.filter((c) => { const t = new Date(c.publishedAt!); return t >= s && t < e; }).length });
    }
    return out;
  })();

  const topViews = [...withMetrics].sort((a, b) => (b.metrics.views ?? 0) - (a.metrics.views ?? 0)).slice(0, 8);
  const byPlatform = Object.entries(
    published.reduce<Record<string, number>>((acc, c) => {
      const p = PLATFORM_LABEL[c.platform ?? "other"] ?? c.platform ?? "Outra";
      acc[p] = (acc[p] ?? 0) + (c.metrics?.views ?? 0);
      return acc;
    }, {}),
  ).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  const fmtK = (v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : v.toLocaleString("pt-BR"));

  if (!published.length && !lives.some((l) => l.status === "done")) {
    return <EmptyState icon={<BarChart3 className="h-5 w-5" />} title="Ainda sem dados publicados" text="Quando um conteúdo for marcado como Publicado, registre views, curtidas e seguidores no próprio conteúdo. As métricas aparecem aqui — nada é inventado." />;
  }

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Publicados no mês" value={thisMonth.length} hint={`${published.length} no total`} />
        <StatTile label="Visualizações" value={fmtK(views)} hint={`${withMetrics.length} com métricas`} />
        <StatTile label="Engajamento" value={engagement != null ? `${engagement.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—"} hint={`${fmtK(interactions)} interações`} />
        <StatTile label="Seguidores ganhos" value={fmtK(sum("followers"))} />
        <StatTile label="Lives realizadas" value={lives.filter((l) => l.status === "done").length} hint={`pico máx. ${Math.max(0, ...lives.map((l) => l.metrics.peakViewers ?? 0))}`} />
        <StatTile label="Campanhas ativas" value={campaigns.filter((c) => !["done", "lost"].includes(c.stage)).length} />
        <StatTile label="Receita de publis" value={brl(revenue)} tone="green" />
        <StatTile label="Alcance" value={fmtK(sum("reach"))} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Publicações por semana" />
          <BarChart title="Publicações por semana" data={weeks} />
        </Card>
        <Card className="p-5">
          <SectionTitle title="Views por plataforma" />
          {byPlatform.some((p) => p.value) ? <RankBars data={byPlatform} format={fmtK} /> : <p className="text-sm text-faint">Registre views nos conteúdos publicados.</p>}
        </Card>
      </div>
      {topViews.length > 0 && (
        <Card className="p-5">
          <SectionTitle title="Top conteúdos por views" />
          <RankBars data={topViews.map((c) => ({ label: c.title, value: c.metrics.views ?? 0 }))} format={fmtK} />
        </Card>
      )}
    </div>
  );
}

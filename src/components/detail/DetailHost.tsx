"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, Link2, Film, Scissors, Plus, ArrowRight, CalendarPlus } from "lucide-react";
import { Sheet, Select, Toggle, Button, Checkbox, Badge, Input } from "@/components/ui";
import { useAiva, useList } from "@/store/aiva";
import type { EntityName } from "@/lib/entities";
import { TASK_STATUS, PRIORITY, EVENT_KIND, CONTENT_STAGE, PLATFORMS, FORMATS, CAMPAIGN_STAGE, CLIENT_KIND, CLIENT_STAGE, IDEA_STATUS, LIVE_STATUS } from "@/lib/entities";
import { STAGE_LABEL, brl } from "@/lib/intelligence";
import { suggestHook } from "@/lib/nlp/interpret";
import { newId } from "@/lib/id";
import { cn } from "@/lib/cn";
import {
  DateTimeField,
  ChecklistEditor,
  ProjectSelect,
  ClientSelect,
  CampaignSelect,
  PRIORITY_LABEL,
  STATUS_LABEL,
  PLATFORM_LABEL,
  FORMAT_LABEL,
  CAMPAIGN_STAGE_LABEL,
  CLIENT_STAGE_LABEL,
  EVENT_KIND_LABEL,
  EVENT_KIND_COLOR,
  toLocalInput,
  fromLocalInput,
} from "./fields";
import { CommitInput, CommitArea, Row, ChipRow, DeleteButton, Meta, AskAiva } from "./common";

/** Hosts the single open detail sheet for whatever entity the user tapped, anywhere in the app. */
export function DetailHost() {
  const detail = useAiva((s) => s.ui.detail);
  const setUI = useAiva((s) => s.setUI);
  const close = () => setUI({ detail: null });
  const open = !!detail;
  const e = detail?.entity;
  const id = detail?.id ?? "";
  return (
    <>
      {e === "tasks" && <TaskSheet id={id} open={open} onClose={close} />}
      {e === "events" && <EventSheet id={id} open={open} onClose={close} />}
      {e === "contents" && <ContentSheet id={id} open={open} onClose={close} />}
      {e === "ideas" && <IdeaSheet id={id} open={open} onClose={close} />}
      {e === "lives" && <LiveSheet id={id} open={open} onClose={close} />}
      {e === "campaigns" && <CampaignSheet id={id} open={open} onClose={close} />}
      {e === "clients" && <ClientSheet id={id} open={open} onClose={close} />}
      {e === "notes" && <NoteSheet id={id} open={open} onClose={close} />}
    </>
  );
}

export function useOpenDetail() {
  const setUI = useAiva((s) => s.setUI);
  return (entity: EntityName, id: string) => setUI({ detail: { entity, id } });
}

type SheetProps = { id: string; open: boolean; onClose: () => void };

function Missing({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Item não encontrado" size="sm">
      <p className="text-sm text-muted">Este item foi excluído ou ainda está sincronizando.</p>
    </Sheet>
  );
}

/* ================================================================== */
/* Task                                                                */
/* ================================================================== */

function TaskSheet({ id, open, onClose }: SheetProps) {
  const task = useList("tasks").find((t) => t.id === id);
  const tasks = useList("tasks");
  const contents = useList("contents");
  const creator = useAiva((s) => s.me?.workspace.settings.creatorMode);
  const update = useAiva((s) => s.update);
  const remove = useAiva((s) => s.remove);
  if (!task) return <Missing open={open} onClose={onClose} />;
  const save = (patch: Record<string, unknown>) => update("tasks", task.id, patch);
  const content = contents.find((c) => c.id === task.contentId);
  const deps = task.dependsOn.map((d) => tasks.find((t) => t.id === d)).filter(Boolean);
  const blocked = deps.some((d) => d!.status !== "done");

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-3">
          <Checkbox checked={task.status === "done"} onChange={(v) => save({ status: v ? "done" : "todo" })} size={26} />
          <CommitInput big value={task.title} onCommit={(v) => v.trim() && save({ title: v.trim() })} aria-label="Título" className={cn(task.status === "done" && "text-muted line-through")} />
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-2">
          <DeleteButton
            onDelete={() => {
              onClose();
              remove("tasks", task.id, { label: "Tarefa" });
            }}
          />
          <Button variant="primary" size="sm" onClick={onClose}>
            Pronto
          </Button>
        </div>
      }
    >
      <div className="grid gap-5">
        {blocked && <p className="rounded-xl bg-orange/10 px-3 py-2 text-[13px] text-orange">Bloqueada: depende de {deps.filter((d) => d!.status !== "done").map((d) => d!.title).join(", ")}.</p>}
        <Row label="Status">
          <ChipRow value={task.status as (typeof TASK_STATUS)[number]} options={TASK_STATUS} labels={STATUS_LABEL} onChange={(v) => save({ status: v })} />
        </Row>
        <Row label="Prioridade">
          <ChipRow value={task.priority as (typeof PRIORITY)[number]} options={PRIORITY} labels={PRIORITY_LABEL} onChange={(v) => save({ priority: v })} colors={{ low: "#3d8bff", medium: "#ffd55c", high: "#ffa24c", urgent: "#ff5c7a" }} />
        </Row>
        <Row label="Prazo">
          <DateTimeField value={task.dueAt} hasTime={task.hasTime} onChange={(dueAt, hasTime) => save({ dueAt, hasTime })} />
        </Row>
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Repetir">
            <Select value={task.recurrence ?? ""} onChange={(e) => save({ recurrence: e.target.value || null })}>
              <option value="">Não repetir</option>
              <option value="daily">Todo dia</option>
              <option value="weekly">Toda semana</option>
              <option value="monthly">Todo mês</option>
            </Select>
          </Row>
          <Row label="Categoria">
            <CommitInput value={task.category} onCommit={(v) => save({ category: v.trim() || null })} placeholder="Ex.: Cliente, Pessoal" />
          </Row>
          <Row label="Projeto">
            <ProjectSelect value={task.projectId} onChange={(v) => save({ projectId: v })} />
          </Row>
          <Row label="Cliente">
            <ClientSelect value={task.clientId} onChange={(v) => save({ clientId: v })} />
          </Row>
          {creator && (
            <Row label="Campanha">
              <CampaignSelect value={task.campaignId} onChange={(v) => save({ campaignId: v })} />
            </Row>
          )}
          <Row label="Etiquetas">
            <CommitInput value={task.tags.join(", ")} onCommit={(v) => save({ tags: v.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 30) })} placeholder="separe por vírgula" />
          </Row>
        </div>
        {content && (
          <Link href={`/creator?open=${content.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm hover:bg-surface-2">
            <Film className="h-4 w-4 text-pink" /> <span className="min-w-0 flex-1 truncate">{content.title}</span> <Badge tone="pink">{STAGE_LABEL[content.stage]}</Badge>
          </Link>
        )}
        <Row label="Descrição">
          <CommitArea value={task.description} onCommit={(v) => save({ description: v || null })} rows={3} placeholder="Detalhes, links, contexto…" />
        </Row>
        <Row label="Checklist">
          <ChecklistEditor items={task.checklist} onChange={(checklist) => save({ checklist })} placeholder="Adicionar subtarefa" />
        </Row>
        <Row label="Depende de">
          <div className="grid gap-1.5">
            {deps.map((d) => (
              <div key={d!.id} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm">
                <span className={cn("min-w-0 flex-1 truncate", d!.status === "done" && "text-faint line-through")}>{d!.title}</span>
                <button className="text-[12px] text-faint hover:text-ink" onClick={() => save({ dependsOn: task.dependsOn.filter((x) => x !== d!.id) })}>
                  remover
                </button>
              </div>
            ))}
            <Select value="" onChange={(e) => e.target.value && save({ dependsOn: [...task.dependsOn, e.target.value] })}>
              <option value="">+ Adicionar dependência</option>
              {tasks
                .filter((t) => t.id !== task.id && !task.dependsOn.includes(t.id) && t.status !== "done")
                .slice(0, 100)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </Select>
          </div>
        </Row>
        <AskAiva prompts={[{ label: "Quebrar em subtarefas", prompt: `Quebre a tarefa "${task.title}" em subtarefas e salve no checklist dela (id ${task.id}).` }]} />
        <Meta createdAt={task.createdAt} updatedAt={task.updatedAt} extra={task.completedAt ? `concluída ${new Date(task.completedAt).toLocaleDateString("pt-BR")}` : undefined} />
      </div>
    </Sheet>
  );
}

/* ================================================================== */
/* Event                                                               */
/* ================================================================== */

function EventSheet({ id, open, onClose }: SheetProps) {
  const ev = useList("events").find((x) => x.id === id);
  const contents = useList("contents");
  const update = useAiva((s) => s.update);
  const remove = useAiva((s) => s.remove);
  if (!ev) return <Missing open={open} onClose={onClose} />;
  const save = (patch: Record<string, unknown>) => update("events", ev.id, patch);
  const content = contents.find((c) => c.id === ev.contentId);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="md"
      title={
        <div className="flex items-center gap-3">
          <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: EVENT_KIND_COLOR[ev.kind] }} />
          <CommitInput big value={ev.title} onCommit={(v) => v.trim() && save({ title: v.trim() })} aria-label="Título" />
        </div>
      }
      footer={
        <div className="flex items-center justify-between">
          <DeleteButton
            onDelete={() => {
              onClose();
              remove("events", ev.id, { label: "Evento" });
            }}
          />
          <Button variant="primary" size="sm" onClick={onClose}>
            Pronto
          </Button>
        </div>
      }
    >
      <div className="grid gap-5">
        <Row label="Tipo">
          <ChipRow value={ev.kind as (typeof EVENT_KIND)[number]} options={EVENT_KIND} labels={EVENT_KIND_LABEL} colors={EVENT_KIND_COLOR} onChange={(v) => save({ kind: v })} />
        </Row>
        <div className="flex items-center justify-between rounded-xl bg-surface px-3.5 py-2.5">
          <span className="text-sm">Dia inteiro</span>
          <Toggle checked={ev.allDay} onChange={(v) => save({ allDay: v })} label="Dia inteiro" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Início">
            <Input type={ev.allDay ? "date" : "datetime-local"} value={toLocalInput(ev.startAt, !ev.allDay)} onChange={(e) => {
              const v = fromLocalInput(e.target.value, !ev.allDay);
              if (v) save({ startAt: v });
            }} className="[color-scheme:dark]" />
          </Row>
          {!ev.allDay && (
            <Row label="Fim">
              <Input type="datetime-local" value={toLocalInput(ev.endAt)} onChange={(e) => save({ endAt: fromLocalInput(e.target.value) })} className="[color-scheme:dark]" />
            </Row>
          )}
          <Row label="Local / link">
            <CommitInput value={ev.location} onCommit={(v) => save({ location: v || null })} placeholder="Endereço ou link da chamada" />
          </Row>
          <Row label="Lembrete">
            <Select value={ev.reminderMinutes ?? ""} onChange={(e) => save({ reminderMinutes: e.target.value === "" ? null : Number(e.target.value) })}>
              <option value="">Sem lembrete</option>
              {[5, 10, 15, 30, 60, 120, 1440].map((m) => (
                <option key={m} value={m}>
                  {m < 60 ? `${m} min antes` : m < 1440 ? `${m / 60} h antes` : "1 dia antes"}
                </option>
              ))}
            </Select>
          </Row>
          <Row label="Projeto">
            <ProjectSelect value={ev.projectId} onChange={(v) => save({ projectId: v })} />
          </Row>
          <Row label="Cliente">
            <ClientSelect value={ev.clientId} onChange={(v) => save({ clientId: v })} />
          </Row>
        </div>
        {content && (
          <Link href={`/creator?open=${content.id}`} onClick={onClose} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm hover:bg-surface-2">
            <Film className="h-4 w-4 text-pink" /> <span className="min-w-0 flex-1 truncate">{content.title}</span> <Badge tone="pink">{STAGE_LABEL[content.stage]}</Badge>
          </Link>
        )}
        <Row label="Notas">
          <CommitArea value={ev.description} onCommit={(v) => save({ description: v || null })} rows={3} placeholder="Pauta, contexto, participantes…" />
        </Row>
        <Meta createdAt={ev.createdAt} updatedAt={ev.updatedAt} />
      </div>
    </Sheet>
  );
}

/* ================================================================== */
/* Content                                                             */
/* ================================================================== */

function ContentSheet({ id, open, onClose }: SheetProps) {
  const c = useList("contents").find((x) => x.id === id);
  const events = useList("events");
  const campaigns = useList("campaigns");
  const create = useAiva((s) => s.create);
  const update = useAiva((s) => s.update);
  const remove = useAiva((s) => s.remove);
  if (!c) return <Missing open={open} onClose={onClose} />;
  const save = (patch: Record<string, unknown>) => update("contents", c.id, patch);
  const linkedEvents = events.filter((e) => e.contentId === c.id);
  const campaign = campaigns.find((x) => x.id === c.campaignId);
  const published = c.stage === "published" || c.stage === "analyzed";
  const m = c.metrics ?? {};
  const setMetric = (k: string, v: string) => save({ metrics: { ...m, [k]: v === "" ? undefined : Math.max(0, Number(v)) } });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title={<CommitInput big value={c.title} onCommit={(v) => v.trim() && save({ title: v.trim() })} aria-label="Título" />}
      footer={
        <div className="flex items-center justify-between">
          <DeleteButton
            onDelete={() => {
              onClose();
              remove("contents", c.id, { label: "Conteúdo" });
            }}
          />
          <Button variant="primary" size="sm" onClick={onClose}>
            Pronto
          </Button>
        </div>
      }
    >
      <div className="grid gap-5">
        <Row label="Pipeline">
          <ChipRow value={c.stage as (typeof CONTENT_STAGE)[number]} options={CONTENT_STAGE} labels={STAGE_LABEL} onChange={(v) => save({ stage: v })} />
        </Row>
        <div className="grid gap-4 sm:grid-cols-3">
          <Row label="Plataforma">
            <Select value={c.platform ?? ""} onChange={(e) => save({ platform: e.target.value || null })}>
              <option value="">—</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABEL[p]}
                </option>
              ))}
            </Select>
          </Row>
          <Row label="Formato">
            <Select value={c.format ?? ""} onChange={(e) => save({ format: e.target.value || null })}>
              <option value="">—</option>
              {FORMATS.map((p) => (
                <option key={p} value={p}>
                  {FORMAT_LABEL[p]}
                </option>
              ))}
            </Select>
          </Row>
          <Row label="Campanha">
            <CampaignSelect value={c.campaignId} onChange={(v) => save({ campaignId: v })} />
          </Row>
        </div>
        <Row label="Publicação agendada">
          <DateTimeField value={c.scheduledAt} hasTime onChange={(v) => save({ scheduledAt: v })} allowTimeToggle={false} />
        </Row>
        {campaign && (
          <Link href={`/creator?tab=brands&open=${campaign.id}`} onClick={onClose} className="flex items-center gap-2 rounded-xl bg-violet/10 px-3 py-2 text-[13px] text-[#cbb9ff]">
            <Link2 className="h-4 w-4" /> Parte da {campaign.title}
          </Link>
        )}
        <Row label="Hook">
          <CommitInput value={c.hook} onCommit={(v) => save({ hook: v || null })} placeholder="Os primeiros 3 segundos…" />
        </Row>
        <Row label="Roteiro">
          <CommitArea value={c.script} onCommit={(v) => save({ script: v || null, ...(v && c.stage === "idea" ? { stage: "script" } : {}) })} rows={8} placeholder="Escreva ou peça para a AIVA gerar." />
        </Row>
        <Row label="Legenda">
          <CommitArea value={c.caption} onCommit={(v) => save({ caption: v || null })} rows={3} />
        </Row>
        <AskAiva
          prompts={[
            { label: "Gerar roteiro", prompt: `Crie um roteiro para o conteúdo "${c.title}" e salve no conteúdo (id ${c.id}).` },
            { label: "Hook mais forte", prompt: `Crie hooks mais fortes para o conteúdo "${c.title}".` },
            { label: "Legenda", prompt: `Faça uma legenda para ${c.platform ?? "Instagram"} para o conteúdo "${c.title}".` },
            { label: "5 variações", prompt: `Crie 5 variações do conteúdo "${c.title}".` },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          {linkedEvents.map((e) => (
            <Badge key={e.id} tone="violet">
              {EVENT_KIND_LABEL[e.kind]} · {new Date(e.startAt).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </Badge>
          ))}
          {!linkedEvents.some((e) => e.kind === "recording") && !published && (
            <Button
              size="sm"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                d.setHours(10, 0, 0, 0);
                create("events", { title: `Gravação: ${c.title}`, startAt: d.toISOString(), kind: "recording", contentId: c.id });
              }}
            >
              <CalendarPlus className="h-4 w-4" /> Agendar gravação
            </Button>
          )}
        </div>
        {(published || c.url) && (
          <>
            <Row label="Link publicado">
              <CommitInput value={c.url} onCommit={(v) => save({ url: v || null })} placeholder="https://" />
            </Row>
            <Row label="Métricas">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["views", "Views"],
                  ["reach", "Alcance"],
                  ["likes", "Curtidas"],
                  ["comments", "Comentários"],
                  ["shares", "Compart."],
                  ["followers", "Seguidores +"],
                ].map(([k, label]) => (
                  <label key={k} className="grid gap-1 rounded-xl bg-surface p-2">
                    <span className="text-[11px] text-faint">{label}</span>
                    <input type="number" inputMode="numeric" min={0} defaultValue={(m as Record<string, number | undefined>)[k] ?? ""} onBlur={(e) => setMetric(k, e.target.value)} className="w-full min-w-0 bg-transparent text-sm outline-none" />
                  </label>
                ))}
              </div>
            </Row>
          </>
        )}
        <Meta createdAt={c.createdAt} updatedAt={c.updatedAt} extra={c.publishedAt ? `publicado ${new Date(c.publishedAt).toLocaleDateString("pt-BR")}` : undefined} />
      </div>
    </Sheet>
  );
}

/* ================================================================== */
/* Idea                                                                */
/* ================================================================== */

function IdeaSheet({ id, open, onClose }: SheetProps) {
  const idea = useList("ideas").find((x) => x.id === id);
  const update = useAiva((s) => s.update);
  const create = useAiva((s) => s.create);
  const remove = useAiva((s) => s.remove);
  const setUI = useAiva((s) => s.setUI);
  if (!idea) return <Missing open={open} onClose={onClose} />;
  const save = (patch: Record<string, unknown>) => update("ideas", idea.id, patch);
  const toContent = async () => {
    const row = await create("contents", { title: idea.title, hook: idea.hook, platform: idea.platform, format: idea.format, stage: "idea", ideaId: idea.id }, { silent: true });
    if (row) {
      await update("ideas", idea.id, { status: "used", contentId: row.id });
      setUI({ detail: { entity: "contents", id: row.id } });
    }
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="md"
      title={<CommitInput big value={idea.title} onCommit={(v) => v.trim() && save({ title: v.trim() })} aria-label="Título" />}
      footer={
        <div className="flex items-center justify-between gap-2">
          <DeleteButton
            onDelete={() => {
              onClose();
              remove("ideas", idea.id, { label: "Ideia" });
            }}
          />
          {idea.contentId ? (
            <Button size="sm" onClick={() => setUI({ detail: { entity: "contents", id: idea.contentId! } })}>
              Ver conteúdo <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={toContent}>
              <Film className="h-4 w-4" /> Virar conteúdo
            </Button>
          )}
        </div>
      }
    >
      <div className="grid gap-5">
        <Row label="Potencial">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => save({ potential: n })} className="pressable p-1" aria-label={`Potencial ${n}`}>
                <Star className={cn("h-6 w-6", n <= idea.potential ? "fill-yellow text-yellow" : "text-faint")} />
              </button>
            ))}
          </div>
        </Row>
        <Row label="Status">
          <ChipRow value={idea.status as (typeof IDEA_STATUS)[number]} options={IDEA_STATUS} labels={{ raw: "Bruta", developing: "Desenvolvendo", approved: "Aprovada", used: "Usada", discarded: "Descartada" }} onChange={(v) => save({ status: v })} />
        </Row>
        <Row label="Hook">
          <div className="flex gap-2">
            <CommitInput value={idea.hook} onCommit={(v) => save({ hook: v || null })} placeholder="Frase de abertura" className="min-w-0 flex-1" />
            <Button size="icon" onClick={() => save({ hook: suggestHook(idea.title, Date.now() % 97) })} aria-label="Sugerir hook">
              <SparkIcon />
            </Button>
          </div>
        </Row>
        <div className="grid gap-4 sm:grid-cols-3">
          <Row label="Plataforma">
            <Select value={idea.platform ?? ""} onChange={(e) => save({ platform: e.target.value || null })}>
              <option value="">—</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABEL[p]}
                </option>
              ))}
            </Select>
          </Row>
          <Row label="Formato">
            <Select value={idea.format ?? ""} onChange={(e) => save({ format: e.target.value || null })}>
              <option value="">—</option>
              {FORMATS.map((p) => (
                <option key={p} value={p}>
                  {FORMAT_LABEL[p]}
                </option>
              ))}
            </Select>
          </Row>
          <Row label="Categoria">
            <CommitInput value={idea.category} onCommit={(v) => save({ category: v || null })} />
          </Row>
        </div>
        <Row label="Descrição">
          <CommitArea value={idea.description} onCommit={(v) => save({ description: v || null })} rows={3} />
        </Row>
        <Row label="Referência">
          <CommitInput value={idea.reference} onCommit={(v) => save({ reference: v || null })} placeholder="Link ou @ de referência" />
        </Row>
        <AskAiva prompts={[{ label: "Transformar em roteiro", prompt: `Transforme a ideia "${idea.title}" em roteiro` }, { label: "Hooks mais fortes", prompt: `Crie hooks mais fortes para "${idea.title}"` }]} />
        <Meta createdAt={idea.createdAt} updatedAt={idea.updatedAt} />
      </div>
    </Sheet>
  );
}

function SparkIcon() {
  return <span className="grad-text text-lg leading-none">✦</span>;
}

/* ================================================================== */
/* Live                                                                */
/* ================================================================== */

function LiveSheet({ id, open, onClose }: SheetProps) {
  const live = useList("lives").find((x) => x.id === id);
  const update = useAiva((s) => s.update);
  const create = useAiva((s) => s.create);
  const remove = useAiva((s) => s.remove);
  const toast = useAiva((s) => s.toast);
  if (!live) return <Missing open={open} onClose={onClose} />;
  const save = (patch: Record<string, unknown>) => update("lives", live.id, patch);
  const done = live.checklist.filter((c) => c.done).length;
  const m = live.metrics ?? {};
  const makeClips = async () => {
    const lines = (live.highlights ?? "").split("\n").map((l) => l.replace(/^[-•\d.)\s]+/, "").trim()).filter(Boolean).slice(0, 10);
    if (!lines.length) return toast({ message: "Anote os melhores momentos (um por linha) primeiro.", tone: "error" });
    for (const l of lines) await create("contents", { title: `Corte: ${l}`, stage: "editing", platform: "tiktok", format: "short" }, { silent: true });
    toast({ message: `${lines.length} cortes criados no pipeline (Edição)`, tone: "ai" });
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-3">
          <span className={cn("relative h-3 w-3 shrink-0 rounded-full", live.status === "live" ? "dot-pulse bg-red text-red" : live.status === "done" ? "bg-faint" : "bg-red/60")} />
          <CommitInput big value={live.title} onCommit={(v) => v.trim() && save({ title: v.trim() })} aria-label="Título" />
        </div>
      }
      footer={
        <div className="flex items-center justify-between">
          <DeleteButton
            onDelete={() => {
              onClose();
              remove("lives", live.id, { label: "Live" });
            }}
          />
          <Button variant="primary" size="sm" onClick={onClose}>
            Pronto
          </Button>
        </div>
      }
    >
      <div className="grid gap-5">
        <Row label="Status">
          <ChipRow value={live.status as (typeof LIVE_STATUS)[number]} options={LIVE_STATUS} labels={{ planned: "Planejada", live: "Ao vivo", done: "Encerrada" }} onChange={(v) => save({ status: v })} />
        </Row>
        <div className="grid gap-4 sm:grid-cols-3">
          <Row label="Data e hora" className="sm:col-span-2">
            <DateTimeField value={live.startAt} hasTime allowTimeToggle={false} onChange={(v) => save({ startAt: v })} />
          </Row>
          <Row label="Duração (min)">
            <Input type="number" inputMode="numeric" min={5} max={1440} defaultValue={live.durationMin} onBlur={(e) => save({ durationMin: Math.max(5, Number(e.target.value) || 60) })} />
          </Row>
          <Row label="Plataforma">
            <Select value={live.platform ?? ""} onChange={(e) => save({ platform: e.target.value || null })}>
              <option value="">—</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABEL[p]}
                </option>
              ))}
            </Select>
          </Row>
          <Row label="Tema" className="sm:col-span-2">
            <CommitInput value={live.topic} onCommit={(v) => save({ topic: v || null })} />
          </Row>
        </div>
        <Row label={`Checklist · ${done}/${live.checklist.length}`}>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {live.checklist.map((it) => (
              <button
                key={it.id}
                onClick={() => save({ checklist: live.checklist.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)) })}
                className={cn("pressable flex h-11 items-center gap-2 rounded-xl border px-3 text-left text-sm", it.done ? "border-green/30 bg-green/10 text-green" : "border-line bg-surface")}
              >
                <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-md border", it.done ? "border-transparent bg-green text-bg" : "border-line-2")}>{it.done && "✓"}</span>
                <span className="truncate">{it.text}</span>
              </button>
            ))}
            <button onClick={() => save({ checklist: [...live.checklist, { id: newId(), text: "Novo item", done: false }] })} className="pressable flex h-11 items-center gap-2 rounded-xl border border-dashed border-line px-3 text-sm text-muted">
              <Plus className="h-4 w-4" /> Item
            </button>
          </div>
        </Row>
        <Row label="Pauta">
          <CommitArea value={live.agenda} onCommit={(v) => save({ agenda: v || null })} rows={4} placeholder={"1. Abertura\n2. Tema principal\n3. Perguntas\n4. CTA"} />
        </Row>
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Convidados">
            <CommitInput value={live.guests} onCommit={(v) => save({ guests: v || null })} />
          </Row>
          <Row label="Metas">
            <CommitInput value={live.goals} onCommit={(v) => save({ goals: v || null })} placeholder="Ex.: 500 pessoas ao vivo" />
          </Row>
        </div>
        {live.status === "done" && (
          <>
            <Row label="Métricas">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["peakViewers", "Pico"],
                  ["avgViewers", "Média"],
                  ["newFollowers", "Novos seguidores"],
                  ["revenue", "Receita (R$)"],
                ].map(([k, label]) => (
                  <label key={k} className="grid gap-1 rounded-xl bg-surface p-2">
                    <span className="text-[11px] text-faint">{label}</span>
                    <input type="number" inputMode="numeric" min={0} defaultValue={(m as Record<string, number | undefined>)[k] ?? ""} onBlur={(e) => save({ metrics: { ...m, [k]: e.target.value === "" ? undefined : Number(e.target.value) } })} className="w-full min-w-0 bg-transparent text-sm outline-none" />
                  </label>
                ))}
              </div>
            </Row>
            <Row label="Melhores momentos (um por linha)">
              <CommitArea value={live.highlights} onCommit={(v) => save({ highlights: v || null })} rows={4} placeholder={"12:40 — reação ao comentário\n45:10 — explicação da ferramenta"} />
            </Row>
            <Button onClick={makeClips} variant="soft">
              <Scissors className="h-4 w-4" /> Transformar momentos em cortes
            </Button>
          </>
        )}
        <Meta createdAt={live.createdAt} updatedAt={live.updatedAt} />
      </div>
    </Sheet>
  );
}

/* ================================================================== */
/* Campaign                                                            */
/* ================================================================== */

function CampaignSheet({ id, open, onClose }: SheetProps) {
  const camp = useList("campaigns").find((x) => x.id === id);
  const brands = useList("brands");
  const contents = useList("contents");
  const txs = useList("transactions");
  const update = useAiva((s) => s.update);
  const create = useAiva((s) => s.create);
  const remove = useAiva((s) => s.remove);
  const setUI = useAiva((s) => s.setUI);
  if (!camp) return <Missing open={open} onClose={onClose} />;
  const save = (patch: Record<string, unknown>) => update("campaigns", camp.id, patch);
  const linked = contents.filter((c) => c.campaignId === camp.id);
  const tx = txs.filter((t) => t.campaignId === camp.id);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title={<CommitInput big value={camp.title} onCommit={(v) => v.trim() && save({ title: v.trim() })} aria-label="Título" />}
      footer={
        <div className="flex items-center justify-between">
          <DeleteButton
            onDelete={() => {
              onClose();
              remove("campaigns", camp.id, { label: "Campanha" });
            }}
          />
          <Button variant="primary" size="sm" onClick={onClose}>
            Pronto
          </Button>
        </div>
      }
    >
      <div className="grid gap-5">
        <Row label="Pipeline">
          <ChipRow value={camp.stage as (typeof CAMPAIGN_STAGE)[number]} options={CAMPAIGN_STAGE} labels={CAMPAIGN_STAGE_LABEL} onChange={(v) => save({ stage: v })} />
        </Row>
        <div className="grid gap-4 sm:grid-cols-3">
          <Row label="Marca">
            <Select
              value={camp.brandId ?? ""}
              onChange={async (e) => {
                if (e.target.value === "__new") {
                  const name = window.prompt("Nome da marca");
                  if (name?.trim()) {
                    const b = await create("brands", { name: name.trim() }, { silent: true });
                    if (b) save({ brandId: b.id });
                  }
                } else save({ brandId: e.target.value || null });
              }}
            >
              <option value="">—</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
              <option value="__new">+ Nova marca</option>
            </Select>
          </Row>
          <Row label="Valor (R$)">
            <Input type="number" inputMode="decimal" min={0} defaultValue={camp.value ?? ""} key={camp.value ?? "v"} onBlur={(e) => save({ value: e.target.value === "" ? null : Number(e.target.value) })} />
          </Row>
          <Row label="Prazo">
            <DateTimeField value={camp.dueAt} hasTime={false} allowTimeToggle={false} onChange={(v) => save({ dueAt: v })} />
          </Row>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between rounded-xl bg-surface px-3.5 py-2.5">
            <span className="text-sm">Aprovada pela marca</span>
            <Toggle checked={camp.approved} onChange={(v) => save({ approved: v })} label="Aprovada" />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-surface px-3.5 py-2.5">
            <span className="text-sm">Pagamento recebido</span>
            <Toggle checked={camp.paid} onChange={(v) => save({ paid: v, ...(v && camp.stage === "payment" ? { stage: "done" } : {}) })} label="Paga" />
          </div>
        </div>
        <Row label="Entregáveis">
          <ChecklistEditor items={camp.deliverables} onChange={(deliverables) => save({ deliverables })} placeholder="Ex.: 1 Reel + 3 stories" />
        </Row>
        <Row label="Conteúdos da campanha">
          <div className="grid gap-1.5">
            {linked.map((c) => (
              <button key={c.id} onClick={() => setUI({ detail: { entity: "contents", id: c.id } })} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5 text-left text-sm hover:bg-surface-2">
                <Film className="h-4 w-4 shrink-0 text-pink" /> <span className="min-w-0 flex-1 truncate">{c.title}</span> <Badge tone="pink">{STAGE_LABEL[c.stage]}</Badge>
              </button>
            ))}
            <Button
              size="sm"
              onClick={async () => {
                const row = await create("contents", { title: `${camp.title} — conteúdo ${linked.length + 1}`, stage: "idea", campaignId: camp.id }, { silent: true });
                if (row) setUI({ detail: { entity: "contents", id: row.id } });
              }}
            >
              <Plus className="h-4 w-4" /> Criar conteúdo
            </Button>
          </div>
        </Row>
        {tx.length > 0 && (
          <Row label="Financeiro">
            {tx.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5 text-sm">
                <span>{t.title}</span>
                <Badge tone={t.status === "done" ? "green" : "yellow"}>
                  {brl(t.amount)} · {t.status === "done" ? "recebido" : "a receber"}
                </Badge>
              </div>
            ))}
          </Row>
        )}
        <Row label="Briefing">
          <CommitArea value={camp.briefing} onCommit={(v) => save({ briefing: v || null })} rows={5} placeholder="Cole aqui o briefing da marca" />
        </Row>
        <Row label="Contrato (link)">
          <CommitInput value={camp.contractUrl} onCommit={(v) => save({ contractUrl: v || null })} placeholder="https://" />
        </Row>
        <AskAiva prompts={[{ label: "O que falta entregar?", prompt: `O que falta para eu entregar a ${camp.title}?` }]} />
        <Meta createdAt={camp.createdAt} updatedAt={camp.updatedAt} />
      </div>
    </Sheet>
  );
}

/* ================================================================== */
/* Client                                                              */
/* ================================================================== */

function ClientSheet({ id, open, onClose }: SheetProps) {
  const client = useList("clients").find((x) => x.id === id);
  const tasks = useList("tasks");
  const projects = useList("projects");
  const update = useAiva((s) => s.update);
  const create = useAiva((s) => s.create);
  const remove = useAiva((s) => s.remove);
  const setUI = useAiva((s) => s.setUI);
  if (!client) return <Missing open={open} onClose={onClose} />;
  const save = (patch: Record<string, unknown>) => update("clients", client.id, patch);
  const related = tasks.filter((t) => t.clientId === client.id);
  const relProjects = projects.filter((p) => p.clientId === client.id);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="md"
      title={<CommitInput big value={client.name} onCommit={(v) => v.trim() && save({ name: v.trim() })} aria-label="Nome" />}
      footer={
        <div className="flex items-center justify-between">
          <DeleteButton
            onDelete={() => {
              onClose();
              remove("clients", client.id, { label: "Contato" });
            }}
          />
          <Button variant="primary" size="sm" onClick={onClose}>
            Pronto
          </Button>
        </div>
      }
    >
      <div className="grid gap-5">
        <Row label="Tipo">
          <ChipRow value={client.kind as (typeof CLIENT_KIND)[number]} options={CLIENT_KIND} labels={{ lead: "Lead", client: "Cliente", brand: "Marca", contact: "Contato" }} onChange={(v) => save({ kind: v })} />
        </Row>
        <Row label="Etapa">
          <ChipRow value={client.stage as (typeof CLIENT_STAGE)[number]} options={CLIENT_STAGE} labels={CLIENT_STAGE_LABEL} onChange={(v) => save({ stage: v })} />
        </Row>
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Empresa">
            <CommitInput value={client.company} onCommit={(v) => save({ company: v || null })} />
          </Row>
          <Row label="Valor potencial (R$)">
            <Input type="number" inputMode="decimal" min={0} defaultValue={client.value ?? ""} onBlur={(e) => save({ value: e.target.value === "" ? null : Number(e.target.value) })} />
          </Row>
          <Row label="E-mail">
            <CommitInput type="email" value={client.email} onCommit={(v) => save({ email: v || null })} />
          </Row>
          <Row label="Telefone">
            <CommitInput type="tel" value={client.phone} onCommit={(v) => save({ phone: v || null })} />
          </Row>
        </div>
        <Row label="Próximo follow-up">
          <div className="grid gap-2">
            <DateTimeField value={client.nextFollowUpAt} hasTime={false} allowTimeToggle={false} onChange={(v) => save({ nextFollowUpAt: v })} />
            <div className="flex flex-wrap gap-2">
              {[
                ["Amanhã", 1],
                ["Em 3 dias", 3],
                ["Em 1 semana", 7],
              ].map(([label, days]) => (
                <button
                  key={label}
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + Number(days));
                    d.setHours(12, 0, 0, 0);
                    save({ nextFollowUpAt: d.toISOString(), ...(client.stage === "new" ? { stage: "contacted" } : {}) });
                  }}
                  className="pressable h-8 rounded-full border border-line bg-surface px-3 text-[12px] text-muted hover:text-ink"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Row>
        <Row label="Notas">
          <CommitArea value={client.notes} onCommit={(v) => save({ notes: v || null })} rows={4} placeholder="Histórico, preferências, combinados…" />
        </Row>
        {(related.length > 0 || relProjects.length > 0) && (
          <Row label="Relacionados">
            <div className="grid gap-1.5">
              {relProjects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} onClick={onClose} className="rounded-xl bg-surface px-3 py-2.5 text-sm hover:bg-surface-2">
                  📁 {p.name}
                </Link>
              ))}
              {related.map((t) => (
                <button key={t.id} onClick={() => setUI({ detail: { entity: "tasks", id: t.id } })} className={cn("rounded-xl bg-surface px-3 py-2.5 text-left text-sm hover:bg-surface-2", t.status === "done" && "text-faint line-through")}>
                  {t.title}
                </button>
              ))}
            </div>
          </Row>
        )}
        <Button size="sm" onClick={() => create("tasks", { title: `Follow-up com ${client.name}`, clientId: client.id, status: "todo", dueAt: new Date().toISOString(), category: "Cliente" })}>
          <Plus className="h-4 w-4" /> Tarefa de follow-up hoje
        </Button>
        <Meta createdAt={client.createdAt} updatedAt={client.updatedAt} />
      </div>
    </Sheet>
  );
}

/* ================================================================== */
/* Note                                                                */
/* ================================================================== */

function NoteSheet({ id, open, onClose }: SheetProps) {
  const note = useList("notes").find((x) => x.id === id);
  const update = useAiva((s) => s.update);
  const remove = useAiva((s) => s.remove);
  const router = useRouter();
  if (!note) return <Missing open={open} onClose={onClose} />;
  const save = (patch: Record<string, unknown>) => update("notes", note.id, patch);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title={<CommitInput big value={note.title} onCommit={(v) => v.trim() && save({ title: v.trim() })} aria-label="Título" />}
      footer={
        <div className="flex items-center justify-between">
          <DeleteButton
            onDelete={() => {
              onClose();
              remove("notes", note.id, { label: "Nota" });
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => router.push(`/aiva?q=${encodeURIComponent(`Resuma a nota "${note.title}"`)}`)}>
              Resumir com AIVA
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              Pronto
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={note.kind} onChange={(e) => save({ kind: e.target.value })} className="h-9 w-auto text-sm">
            <option value="note">Nota</option>
            <option value="link">Link</option>
            <option value="reference">Referência</option>
            <option value="list">Lista</option>
            <option value="message">Mensagem</option>
          </Select>
          <div className="w-48">
            <ProjectSelect value={note.projectId} onChange={(v) => save({ projectId: v })} />
          </div>
          <button onClick={() => save({ pinned: !note.pinned })} className={cn("pressable h-9 rounded-xl border px-3 text-sm", note.pinned ? "border-yellow/40 bg-yellow/10 text-yellow" : "border-line text-muted")}>
            {note.pinned ? "★ Fixada" : "☆ Fixar"}
          </button>
        </div>
        {(note.kind === "link" || note.url) && (
          <div className="flex gap-2">
            <CommitInput value={note.url} onCommit={(v) => save({ url: v || null })} placeholder="https://" className="min-w-0 flex-1" />
            {note.url && (
              <a href={note.url} target="_blank" rel="noopener noreferrer" className="pressable grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted hover:text-ink" aria-label="Abrir link">
                <Link2 className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
        <CommitArea value={note.body} onCommit={(v) => save({ body: v || null })} rows={14} placeholder="Escreva livremente…" className="min-h-64 border-transparent bg-transparent px-0 text-[15px] focus:bg-transparent" />
        <Meta createdAt={note.createdAt} updatedAt={note.updatedAt} />
      </div>
    </Sheet>
  );
}

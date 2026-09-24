"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, CalendarDays, StickyNote, Users, Wallet, Target, History, MoreHorizontal, Trash2, Archive, CheckCircle2, PauseCircle, Sparkles } from "lucide-react";
import { Page, HeaderIcons } from "@/components/shell/PageHeader";
import { Button, Card, EmptyState, Progress, Segmented, Menu, Select, Badge, SectionTitle } from "@/components/ui";
import { TaskRow } from "@/components/items/TaskRow";
import { Board } from "@/components/Board";
import { CommitInput, CommitArea } from "@/components/detail/common";
import { DateTimeField, ClientSelect } from "@/components/detail/fields";
import { useAiva, useList } from "@/store/aiva";
import { useClock } from "@/hooks/use-clock";
import { brl, fmtWhen, isOverdue } from "@/lib/intelligence";
import { cn } from "@/lib/cn";

const COLUMNS = [
  { id: "todo", title: "A fazer", color: "#3d8bff" },
  { id: "doing", title: "Em andamento", color: "#8b5cff" },
  { id: "waiting", title: "Aguardando", color: "#ffa24c" },
  { id: "done", title: "Concluído", color: "#3ddc97" },
];

export function ProjectDetail({ id }: { id: string }) {
  const project = useList("projects").find((p) => p.id === id);
  const allTasks = useList("tasks");
  const events = useList("events");
  const notes = useList("notes");
  const txs = useList("transactions");
  const goals = useList("goals");
  const clients = useList("clients");
  const contents = useList("contents");
  const update = useAiva((s) => s.update);
  const create = useAiva((s) => s.create);
  const remove = useAiva((s) => s.remove);
  const setUI = useAiva((s) => s.setUI);
  const clock = useClock();
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "tasks" | "timeline" | "notes">("overview");
  const [quick, setQuick] = useState("");

  const tasks = useMemo(() => allTasks.filter((t) => t.projectId === id), [allTasks, id]);
  if (!project) {
    return (
      <Page>
        <div className="pt-10">
          <EmptyState title="Projeto não encontrado" action={<Link href="/projects" className="text-sm underline">Voltar aos projetos</Link>} />
        </div>
      </Page>
    );
  }
  const save = (patch: Record<string, unknown>) => update("projects", project.id, patch);
  const done = tasks.filter((t) => t.status === "done").length;
  const late = tasks.filter((t) => isOverdue(t, clock));
  const pEvents = events.filter((e) => e.projectId === id).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const pNotes = notes.filter((n) => n.projectId === id);
  const pTx = txs.filter((t) => t.projectId === id);
  const pContents = contents.filter((c) => c.projectId === id);
  const client = clients.find((c) => c.id === project.clientId);
  const goal = goals.find((g) => g.id === project.goalId);
  const income = pTx.filter((t) => t.kind === "income").reduce((a, b) => a + b.amount, 0);
  const expense = pTx.filter((t) => t.kind === "expense").reduce((a, b) => a + b.amount, 0);
  const nextTask = tasks.filter((t) => t.status !== "done").sort((a, b) => (a.dueAt ?? "9").localeCompare(b.dueAt ?? "9"))[0];

  const timeline = [
    ...tasks.filter((t) => t.dueAt).map((t) => ({ at: t.dueAt!, title: t.title, kind: "Tarefa", done: t.status === "done", onClick: () => setUI({ detail: { entity: "tasks", id: t.id } }) })),
    ...pEvents.map((e) => ({ at: e.startAt, title: e.title, kind: "Evento", done: new Date(e.startAt) < clock.now, onClick: () => setUI({ detail: { entity: "events", id: e.id } }) })),
    ...(project.dueAt ? [{ at: project.dueAt, title: "Entrega do projeto", kind: "Prazo", done: project.status === "done", onClick: () => {} }] : []),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const addTask = async () => {
    if (!quick.trim()) return;
    await create("tasks", { title: quick.trim(), projectId: id, status: "todo" }, { silent: true });
    setQuick("");
  };

  return (
    <Page wide>
      <header className="flex items-center gap-2 pt-4 lg:pt-8">
        <Link href="/projects" className="pressable grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-muted" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="flex-1" />
        <Menu
          trigger={
            <button className="pressable grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-muted" aria-label="Ações do projeto">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          }
          items={[
            { label: "Marcar como concluído", icon: <CheckCircle2 className="h-4 w-4" />, onClick: () => save({ status: "done" }) },
            { label: "Pausar", icon: <PauseCircle className="h-4 w-4" />, onClick: () => save({ status: "paused" }) },
            { label: "Arquivar", icon: <Archive className="h-4 w-4" />, onClick: () => save({ status: "archived" }) },
            {
              label: "Excluir projeto",
              icon: <Trash2 className="h-4 w-4" />,
              danger: true,
              onClick: () => {
                remove("projects", project.id, { label: "Projeto" });
                router.push("/projects");
              },
            },
          ]}
        />
        <HeaderIcons />
      </header>

      <div className="mt-4 flex items-start gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-surface-2 text-3xl">{project.emoji ?? "📁"}</span>
        <div className="min-w-0 flex-1">
          <CommitInput big value={project.name} onCommit={(v) => v.trim() && save({ name: v.trim() })} className="text-[26px]" aria-label="Nome do projeto" />
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted">
            {project.status !== "active" && <Badge tone="yellow">{project.status === "done" ? "Concluído" : project.status === "paused" ? "Pausado" : "Arquivado"}</Badge>}
            <span>
              {done}/{tasks.length} tarefas
            </span>
            {late.length > 0 && <Badge tone="red">{late.length} atrasadas</Badge>}
            {client && <Badge tone="blue">{client.name}</Badge>}
          </div>
        </div>
      </div>
      <Progress value={tasks.length ? (done / tasks.length) * 100 : 0} className="mt-4" />

      <Segmented
        className="mt-5 w-full overflow-x-auto sm:w-auto"
        value={tab}
        onChange={setTab}
        options={[
          { value: "overview", label: "Visão geral" },
          { value: "tasks", label: "Tarefas" },
          { value: "timeline", label: "Timeline" },
          { value: "notes", label: "Notas" },
        ]}
      />

      {tab === "overview" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="grid content-start gap-6">
            {nextTask && (
              <Card className="grad-soft border-violet/20">
                <p className="text-[12px] font-semibold tracking-[0.16em] text-muted">PRÓXIMO PASSO</p>
                <button onClick={() => setUI({ detail: { entity: "tasks", id: nextTask.id } })} className="mt-2 text-left text-lg font-medium hover:underline">
                  {nextTask.title}
                </button>
                {nextTask.dueAt && <p className="text-[13px] text-muted">{fmtWhen(nextTask.dueAt, nextTask.hasTime, clock)}</p>}
              </Card>
            )}
            <section>
              <SectionTitle title="Sobre" />
              <CommitArea value={project.description} onCommit={(v) => save({ description: v || null })} rows={3} placeholder="Objetivo, escopo, links importantes…" />
            </section>
            <section>
              <SectionTitle title="Tarefas abertas" count={tasks.filter((t) => t.status !== "done").length} action={<button onClick={() => setTab("tasks")} className="text-[13px] text-muted hover:text-ink">Ver quadro</button>} />
              <QuickAdd value={quick} onChange={setQuick} onAdd={addTask} />
              <div className="card mt-2 p-1">
                {tasks.filter((t) => t.status !== "done").slice(0, 8).map((t) => <TaskRow key={t.id} task={t} clock={clock} showProject={false} />)}
                {!tasks.some((t) => t.status !== "done") && <p className="px-3 py-4 text-sm text-faint">Nenhuma tarefa aberta.</p>}
              </div>
            </section>
          </div>
          <div className="grid content-start gap-4">
            <Card className="grid gap-3">
              <p className="flex items-center gap-2 text-sm font-medium"><Target className="h-4 w-4 text-violet" /> Prazo & pessoas</p>
              <DateTimeField value={project.dueAt} hasTime={false} allowTimeToggle={false} onChange={(v) => save({ dueAt: v })} />
              <ClientSelect value={project.clientId} onChange={(v) => save({ clientId: v })} />
              <Select value={project.goalId ?? ""} onChange={(e) => save({ goalId: e.target.value || null })}>
                <option value="">Sem meta vinculada</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </Select>
              {goal && <p className="text-[12px] text-muted">Contribui para: {goal.title}</p>}
            </Card>
            <Card className="grid gap-2">
              <p className="flex items-center gap-2 text-sm font-medium"><CalendarDays className="h-4 w-4 text-blue" /> Agenda</p>
              {pEvents.filter((e) => new Date(e.startAt) >= clock.now).slice(0, 4).map((e) => (
                <button key={e.id} onClick={() => setUI({ detail: { entity: "events", id: e.id } })} className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 text-left text-sm hover:bg-surface-2">
                  <span className="truncate">{e.title}</span>
                  <span className="shrink-0 text-[12px] text-muted">{fmtWhen(e.startAt, !e.allDay, clock)}</span>
                </button>
              ))}
              <Button size="sm" variant="ghost" onClick={async () => {
                const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0);
                const row = await create("events", { title: `Reunião · ${project.name}`, startAt: d.toISOString(), kind: "meeting", projectId: id }, { silent: true });
                if (row) setUI({ detail: { entity: "events", id: row.id } });
              }}><Plus className="h-4 w-4" /> Agendar</Button>
            </Card>
            <Card className="grid gap-2">
              <p className="flex items-center gap-2 text-sm font-medium"><Wallet className="h-4 w-4 text-green" /> Financeiro</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-surface p-2"><p className="text-[11px] text-faint">Receita</p><p className="text-sm text-green">{brl(income)}</p></div>
                <div className="rounded-xl bg-surface p-2"><p className="text-[11px] text-faint">Custos</p><p className="text-sm text-red">{brl(expense)}</p></div>
                <div className="rounded-xl bg-surface p-2"><p className="text-[11px] text-faint">Resultado</p><p className="text-sm">{brl(income - expense)}</p></div>
              </div>
              <Link href={`/finance?project=${id}`} className="text-center text-[12px] text-muted hover:text-ink">Lançar no financeiro</Link>
            </Card>
            {(client || pContents.length > 0) && (
              <Card className="grid gap-2">
                <p className="flex items-center gap-2 text-sm font-medium"><Users className="h-4 w-4 text-cyan" /> Conectado</p>
                {client && <button onClick={() => setUI({ detail: { entity: "clients", id: client.id } })} className="rounded-xl bg-surface px-3 py-2 text-left text-sm">👤 {client.name}</button>}
                {pContents.map((c) => <button key={c.id} onClick={() => setUI({ detail: { entity: "contents", id: c.id } })} className="rounded-xl bg-surface px-3 py-2 text-left text-sm">🎬 {c.title}</button>)}
              </Card>
            )}
            <Link href={`/aiva?q=${encodeURIComponent(`Analise o projeto "${project.name}" e diga o que falta e os riscos`)}`} className="card flex items-center gap-3 p-4 hover:bg-surface-2">
              <Sparkles className="h-4 w-4 text-[#c4b1ff]" /> <span className="text-sm">Pedir análise do projeto à AIVA</span>
            </Link>
          </div>
        </div>
      )}

      {tab === "tasks" && (
        <div className="mt-6">
          <QuickAdd value={quick} onChange={setQuick} onAdd={addTask} />
          <div className="mt-4">
            <Board
              columns={COLUMNS}
              items={tasks.filter((t) => t.status !== "inbox")}
              columnOf={(t) => t.status}
              onMove={(t, status) => update("tasks", t.id, { status })}
              renderCard={(t) => (
                <button onClick={() => setUI({ detail: { entity: "tasks", id: t.id } })} className="card block w-full bg-bg-2 p-3 text-left hover:bg-surface-2">
                  <p className={cn("text-sm", t.status === "done" && "text-faint line-through")}>{t.title}</p>
                  {t.dueAt && <p className={cn("mt-1 text-[12px]", isOverdue(t, clock) ? "text-red" : "text-muted")}>{fmtWhen(t.dueAt, t.hasTime, clock)}</p>}
                </button>
              )}
            />
          </div>
        </div>
      )}

      {tab === "timeline" && (
        <div className="mt-6">
          {timeline.length === 0 ? (
            <EmptyState icon={<History className="h-5 w-5" />} title="Sem datas ainda" text="Tarefas com prazo, eventos e a entrega do projeto aparecem aqui em ordem." />
          ) : (
            <ol className="relative ml-3 border-l border-line">
              {timeline.map((t, i) => (
                <li key={i} className="relative mb-4 ml-5">
                  <span className={cn("absolute top-1.5 -left-[27px] h-3 w-3 rounded-full border-2 border-bg", t.done ? "bg-green" : t.kind === "Prazo" ? "bg-orange" : "bg-violet")} />
                  <button onClick={t.onClick} className="text-left">
                    <p className="text-[12px] text-muted">{fmtWhen(t.at, true, clock)} · {t.kind}</p>
                    <p className={cn("text-[15px]", t.done && "text-faint line-through")}>{t.title}</p>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {tab === "notes" && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button onClick={async () => {
            const row = await create("notes", { title: "Nova nota", projectId: id }, { silent: true });
            if (row) setUI({ detail: { entity: "notes", id: row.id } });
          }} className="pressable flex min-h-28 items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-sm text-muted hover:text-ink">
            <Plus className="h-4 w-4" /> Nova nota
          </button>
          {pNotes.map((n) => (
            <button key={n.id} onClick={() => setUI({ detail: { entity: "notes", id: n.id } })} className="card min-h-28 p-4 text-left hover:bg-surface-2">
              <p className="flex items-center gap-2 font-medium"><StickyNote className="h-4 w-4 text-green" /> {n.title}</p>
              <p className="mt-1 line-clamp-3 text-[13px] text-muted">{n.body}</p>
            </button>
          ))}
        </div>
      )}
    </Page>
  );
}

function QuickAdd({ value, onChange, onAdd }: { value: string; onChange: (v: string) => void; onAdd: () => void }) {
  return (
    <div className="card flex items-center gap-2 p-1.5 pl-3.5">
      <Plus className="h-4 w-4 shrink-0 text-faint" />
      <input value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onAdd()} placeholder="Adicionar tarefa ao projeto…" className="h-10 min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint" aria-label="Nova tarefa do projeto" />
    </div>
  );
}

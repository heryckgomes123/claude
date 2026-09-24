"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocalStorage } from "@/hooks/use-client-value";
import { List, Columns3, CheckSquare, Plus } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/PageHeader";
import { Segmented, Chip, EmptyState, Badge, Select } from "@/components/ui";
import { Board } from "@/components/Board";
import { TaskRow } from "@/components/items/TaskRow";
import { useAiva, useList } from "@/store/aiva";
import { useClock } from "@/hooks/use-clock";
import { useOpenParam } from "@/hooks/use-open-param";
import { dayRange, isOverdue, fmtWhen } from "@/lib/intelligence";
import { extractDateTime, cutSpans } from "@/lib/nlp/datetime";
import { cleanTitle, detectCategory } from "@/lib/nlp/interpret";
import { norm } from "@/lib/nlp/datetime";
import { PRIORITY_LABEL, PRIORITY_TONE } from "@/components/detail/fields";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/cn";

type Filter = "today" | "week" | "overdue" | "inbox" | "all" | "done";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "7 dias" },
  { value: "overdue", label: "Atrasadas" },
  { value: "inbox", label: "Inbox" },
  { value: "all", label: "Todas" },
  { value: "done", label: "Concluídas" },
];

const COLUMNS = [
  { id: "inbox", title: "Inbox", color: "#6f6d86" },
  { id: "todo", title: "A fazer", color: "#3d8bff" },
  { id: "doing", title: "Em andamento", color: "#8b5cff" },
  { id: "waiting", title: "Aguardando", color: "#ffa24c" },
  { id: "done", title: "Concluído", color: "#3ddc97" },
];

const PW: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1, none: 0 };

export function TasksView() {
  const tasks = useList("tasks");
  const projects = useList("projects");
  const create = useAiva((s) => s.create);
  const update = useAiva((s) => s.update);
  const setUI = useAiva((s) => s.setUI);
  const clock = useClock();
  const params = useSearchParams();
  const [view, setView] = useLocalStorage<"list" | "board">("aiva:tasks-view", "list");
  const [filter, setFilter] = useState<Filter>(() => {
    const p = params.get("view");
    if (p && FILTERS.some((f) => f.value === p)) return p as Filter;
    return tasks.some((t) => t.status !== "done" && t.dueAt) ? "today" : "all";
  });
  const [project, setProject] = useState<string>("");
  const [quick, setQuick] = useState("");
  useOpenParam("tasks");


  const scoped = useMemo(() => (project ? tasks.filter((t) => t.projectId === project) : tasks), [tasks, project]);

  const filtered = useMemo(() => {
    const today = dayRange(clock);
    const weekEnd = today.start + 7 * 86_400_000;
    const due = (t: Task) => (t.dueAt ? new Date(t.dueAt).getTime() : NaN);
    const open = scoped.filter((t) => t.status !== "done");
    switch (filter) {
      case "today":
        return open.filter((t) => isOverdue(t, clock) || (due(t) >= today.start && due(t) < today.end) || t.status === "doing");
      case "week":
        return open.filter((t) => due(t) < weekEnd);
      case "overdue":
        return open.filter((t) => isOverdue(t, clock));
      case "inbox":
        return open.filter((t) => t.status === "inbox");
      case "done":
        return scoped.filter((t) => t.status === "done").sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
      default:
        return open;
    }
  }, [scoped, filter, clock]);

  const groups = useMemo(() => {
    if (filter === "done") return [{ key: "done", title: "Concluídas", items: filtered.slice(0, 200) }];
    const today = dayRange(clock);
    const tomorrow = dayRange(clock, 1);
    const weekEnd = today.start + 7 * 86_400_000;
    const buckets: Record<string, Task[]> = { overdue: [], today: [], tomorrow: [], week: [], later: [], none: [] };
    for (const t of filtered) {
      const d = t.dueAt ? new Date(t.dueAt).getTime() : null;
      if (isOverdue(t, clock)) buckets.overdue.push(t);
      else if (d == null) buckets.none.push(t);
      else if (d < today.end) buckets.today.push(t);
      else if (d < tomorrow.end) buckets.tomorrow.push(t);
      else if (d < weekEnd) buckets.week.push(t);
      else buckets.later.push(t);
    }
    const sort = (a: Task, b: Task) => PW[b.priority] - PW[a.priority] || (a.dueAt ?? "9").localeCompare(b.dueAt ?? "9");
    return [
      { key: "overdue", title: "Atrasadas", items: buckets.overdue.sort(sort) },
      { key: "today", title: "Hoje", items: buckets.today.sort(sort) },
      { key: "tomorrow", title: "Amanhã", items: buckets.tomorrow.sort(sort) },
      { key: "week", title: "Esta semana", items: buckets.week.sort(sort) },
      { key: "later", title: "Depois", items: buckets.later.sort(sort) },
      { key: "none", title: "Sem data", items: buckets.none.sort(sort) },
    ].filter((g) => g.items.length);
  }, [filtered, filter, clock]);

  const addQuick = async () => {
    const v = quick.trim();
    if (!v) return;
    const ctx = { now: new Date(), tzOffset: clock.tzOffset };
    const dt = extractDateTime(v, ctx);
    const title = cleanTitle(cutSpans(v, dt.spans)) || v;
    const n = norm(v);
    setQuick("");
    await create(
      "tasks",
      {
        title,
        dueAt: dt.at?.toISOString() ?? (filter === "today" ? new Date().toISOString() : null),
        hasTime: dt.hasTime,
        status: filter === "inbox" ? "inbox" : "todo",
        priority: /\burgente\b/.test(n) ? "urgent" : /\bimportante\b/.test(n) ? "high" : "none",
        category: detectCategory(n) ?? null,
        projectId: project || null,
      },
      { silent: true },
    );
  };

  const counts = {
    overdue: scoped.filter((t) => isOverdue(t, clock)).length,
    inbox: scoped.filter((t) => t.status === "inbox").length,
  };

  return (
    <Page wide>
      <PageHeader
        title="Tarefas"
        subtitle={`${tasks.filter((t) => t.status !== "done").length} abertas`}
        actions={
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "list", label: <List className="h-4 w-4" aria-label="Lista" /> },
              { value: "board", label: <Columns3 className="h-4 w-4" aria-label="Kanban" /> },
            ]}
          />
        }
      />

      <div className="card mb-4 flex items-center gap-2 p-1.5 pl-3.5">
        <Plus className="h-4 w-4 shrink-0 text-faint" />
        <input
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addQuick()}
          placeholder="Adicionar tarefa… “enviar proposta sexta 10h urgente”"
          className="h-10 min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
          aria-label="Nova tarefa"
        />
        {quick && (
          <button onClick={addQuick} className="pressable grad h-10 shrink-0 rounded-xl px-4 text-sm font-medium text-white">
            Adicionar
          </button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {view === "list" && (
          <div className="-mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
            {FILTERS.map((f) => (
              <Chip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
                {f.label}
                {f.value === "overdue" && counts.overdue > 0 && <span className="text-red">{counts.overdue}</span>}
                {f.value === "inbox" && counts.inbox > 0 && <span className="opacity-70">{counts.inbox}</span>}
              </Chip>
            ))}
          </div>
        )}
        <Select value={project} onChange={(e) => setProject(e.target.value)} className="h-9 w-full text-sm sm:w-56" aria-label="Filtrar por projeto">
          <option value="">Todos os projetos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.emoji ?? "📁"} {p.name}
            </option>
          ))}
        </Select>
      </div>

      {view === "list" ? (
        groups.length === 0 ? (
          <EmptyState icon={<CheckSquare className="h-5 w-5" />} title={filter === "done" ? "Nada concluído ainda" : "Nada por aqui"} text="Adicione uma tarefa acima ou capture pelo botão +." />
        ) : (
          <div className="grid gap-6">
            {groups.map((g) => (
              <section key={g.key}>
                <h2 className={cn("mb-1.5 px-1 text-[13px] font-semibold uppercase tracking-[0.14em]", g.key === "overdue" ? "text-red" : "text-muted")}>
                  {g.title} <span className="text-faint">{g.items.length}</span>
                </h2>
                <div className="card p-1">
                  {g.items.map((t) => (
                    <TaskRow key={t.id} task={t} clock={clock} showProject={!project} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )
      ) : (
        <Board
          columns={COLUMNS}
          items={scoped.filter((t) => t.status !== "done" || (t.completedAt && clock.now.getTime() - new Date(t.completedAt).getTime() < 7 * 86_400_000))}
          columnOf={(t) => t.status}
          onMove={(t, status) => update("tasks", t.id, { status })}
          onAdd={async (status) => {
            const row = await create("tasks", { title: "Nova tarefa", status, projectId: project || null }, { silent: true });
            if (row) setUI({ detail: { entity: "tasks", id: row.id } });
          }}
          renderCard={(t) => (
            <button onClick={() => setUI({ detail: { entity: "tasks", id: t.id } })} className="card pressable block w-full bg-bg-2 p-3 text-left hover:bg-surface-2">
              <p className={cn("text-sm leading-snug", t.status === "done" && "text-faint line-through")}>{t.title}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {t.priority !== "none" && <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>}
                {t.dueAt && <Badge tone={isOverdue(t, clock) ? "red" : "default"}>{fmtWhen(t.dueAt, t.hasTime, clock)}</Badge>}
                {t.checklist.length > 0 && (
                  <Badge>
                    {t.checklist.filter((c) => c.done).length}/{t.checklist.length}
                  </Badge>
                )}
              </div>
            </button>
          )}
        />
      )}
    </Page>
  );
}

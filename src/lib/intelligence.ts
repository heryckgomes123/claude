import type { Snapshot, Task, CalEvent, Content, Live, Campaign, Client, WorkspaceSettings } from "./types";
import { wallParts, fromWall } from "./nlp/datetime";

/**
 * AIVA intelligence: pure functions over the workspace snapshot.
 * Used by the Home (Today / Next action / Briefing / Review), the local AI engine,
 * the notification generator, and as context for Claude. Never invents data.
 */

export type Clock = { now: Date; tzOffset: number };

export type ItemRef = {
  entity: "tasks" | "events" | "contents" | "lives" | "campaigns" | "clients" | "captures" | "ideas" | "transactions";
  id: string;
  title: string;
  meta?: string;
  at?: string | null;
  href: string;
  tone?: "danger" | "warn" | "info" | "ok";
};

export type NextAction = {
  title: string;
  reason: string;
  href: string;
  cta: string;
  ref?: ItemRef;
};

const PRIORITY_WEIGHT: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1, none: 0 };

export function dayRange(clock: Clock, offsetDays = 0) {
  const p = wallParts(clock.now, clock.tzOffset);
  const start = fromWall(p.y, p.m, p.d + offsetDays, 0, 0, clock.tzOffset);
  const end = fromWall(p.y, p.m, p.d + offsetDays + 1, 0, 0, clock.tzOffset);
  return { start: start.getTime(), end: end.getTime() };
}

const t = (s: string | null | undefined) => (s ? new Date(s).getTime() : NaN);

export function fmtTime(iso: string | null | undefined, tzOffset: number) {
  if (!iso) return "";
  const p = wallParts(new Date(iso), tzOffset);
  return `${String(p.h).padStart(2, "0")}:${String(p.min).padStart(2, "0")}`;
}

export function fmtDay(iso: string | null | undefined, clock: Clock) {
  if (!iso) return "";
  const ms = t(iso);
  for (const [off, label] of [
    [-1, "ontem"],
    [0, "hoje"],
    [1, "amanhã"],
  ] as const) {
    const r = dayRange(clock, off);
    if (ms >= r.start && ms < r.end) return label;
  }
  const p = wallParts(new Date(iso), clock.tzOffset);
  const names = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const diff = (ms - clock.now.getTime()) / 86_400_000;
  if (diff > 0 && diff < 6) return names[p.dow];
  return `${String(p.d).padStart(2, "0")}/${String(p.m + 1).padStart(2, "0")}`;
}

export function fmtWhen(iso: string | null | undefined, hasTime: boolean, clock: Clock) {
  if (!iso) return "";
  const d = fmtDay(iso, clock);
  return hasTime ? `${d} · ${fmtTime(iso, clock.tzOffset)}` : d;
}

export const isOpenTask = (task: Task) => task.status !== "done";

export function isOverdue(task: Task, clock: Clock) {
  if (!isOpenTask(task) || !task.dueAt) return false;
  const due = t(task.dueAt);
  if (task.hasTime) return due < clock.now.getTime() - 15 * 60_000;
  return due < dayRange(clock).start;
}

export function isDueToday(task: Task, clock: Clock) {
  if (!task.dueAt) return false;
  const r = dayRange(clock);
  const due = t(task.dueAt);
  return due >= r.start && due < r.end;
}

function taskRef(task: Task, clock: Clock, tone?: ItemRef["tone"]): ItemRef {
  return {
    entity: "tasks",
    id: task.id,
    title: task.title,
    meta: [task.dueAt ? fmtWhen(task.dueAt, task.hasTime, clock) : null, task.category].filter(Boolean).join(" · "),
    at: task.dueAt,
    href: `/tasks?open=${task.id}`,
    tone,
  };
}

function eventRef(e: CalEvent, clock: Clock, tone?: ItemRef["tone"]): ItemRef {
  return {
    entity: "events",
    id: e.id,
    title: e.title,
    meta: e.allDay ? fmtDay(e.startAt, clock) : fmtWhen(e.startAt, true, clock),
    at: e.startAt,
    href: `/calendar?open=${e.id}`,
    tone,
  };
}

function liveRef(l: Live, clock: Clock, tone?: ItemRef["tone"]): ItemRef {
  const done = l.checklist.filter((c) => c.done).length;
  return {
    entity: "lives",
    id: l.id,
    title: l.title,
    meta: [l.startAt ? fmtWhen(l.startAt, true, clock) : null, `checklist ${done}/${l.checklist.length}`].filter(Boolean).join(" · "),
    at: l.startAt,
    href: `/creator?tab=lives&open=${l.id}`,
    tone,
  };
}

function contentRef(c: Content, clock: Clock, tone?: ItemRef["tone"]): ItemRef {
  return {
    entity: "contents",
    id: c.id,
    title: c.title,
    meta: [c.platform, c.scheduledAt ? fmtWhen(c.scheduledAt, true, clock) : null, STAGE_LABEL[c.stage]].filter(Boolean).join(" · "),
    at: c.scheduledAt,
    href: `/creator?open=${c.id}`,
    tone,
  };
}

export const STAGE_LABEL: Record<string, string> = {
  idea: "Ideia",
  script: "Roteiro",
  recording: "Gravação",
  editing: "Edição",
  review: "Revisão",
  scheduled: "Agendado",
  published: "Publicado",
  analyzed: "Analisado",
};

/* ------------------------------------------------------------------ */
/* Today                                                               */
/* ------------------------------------------------------------------ */

export type TodayView = {
  now: ItemRef[];
  today: ItemRef[];
  next: ItemRef[];
  overdue: ItemRef[];
  nextAction: NextAction | null;
  counts: {
    priorities: number;
    tasksToday: number;
    overdue: number;
    events: number;
    contents: number;
    lives: number;
    inbox: number;
    doneToday: number;
  };
};

export function buildToday(s: Snapshot, clock: Clock): TodayView {
  const nowMs = clock.now.getTime();
  const today = dayRange(clock);
  const horizon = nowMs + 60 * 60_000;

  const open = s.tasks.filter(isOpenTask);
  const overdueTasks = open.filter((x) => isOverdue(x, clock));
  const todayTasks = open.filter((x) => isDueToday(x, clock) && !isOverdue(x, clock));
  const doing = open.filter((x) => x.status === "doing" && !isDueToday(x, clock) && !isOverdue(x, clock));

  const eventsToday = s.events.filter((e) => {
    const st = t(e.startAt);
    return st >= today.start && st < today.end;
  });
  const happening = eventsToday.filter((e) => {
    const st = t(e.startAt);
    const en = e.endAt ? t(e.endAt) : st + 60 * 60_000;
    return !e.allDay && ((st <= nowMs && en > nowMs) || (st > nowMs && st <= horizon));
  });
  const livesSoon = s.lives.filter((l) => l.status !== "done" && l.startAt && t(l.startAt) >= nowMs - 3 * 3600_000 && t(l.startAt) <= nowMs + 3 * 3600_000);

  const nowTasks = todayTasks.filter(
    (x) => x.priority === "urgent" || (x.hasTime && t(x.dueAt) <= horizon && t(x.dueAt) >= nowMs - 15 * 60_000),
  );
  const nowIds = new Set(nowTasks.map((x) => x.id));

  const sortTasks = (a: Task, b: Task) =>
    PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || (t(a.dueAt) || Infinity) - (t(b.dueAt) || Infinity);

  const nowItems: ItemRef[] = [
    ...livesSoon.map((l) => liveRef(l, clock, "danger")),
    ...happening.map((e) => eventRef(e, clock, "danger")),
    ...nowTasks.sort(sortTasks).map((x) => taskRef(x, clock, "danger")),
  ];

  const todayItems: ItemRef[] = [
    ...todayTasks.filter((x) => !nowIds.has(x.id)).sort(sortTasks).map((x) => taskRef(x, clock, "warn")),
    ...doing.slice(0, 3).map((x) => taskRef(x, clock, "warn")),
  ];

  const upcomingEvents = s.events
    .filter((e) => t(e.startAt) > horizon && t(e.startAt) < today.end + 2 * 86_400_000)
    .sort((a, b) => t(a.startAt) - t(b.startAt))
    .slice(0, 6)
    .map((e) => eventRef(e, clock, "info"));
  const upcomingContent = s.contents
    .filter((c) => c.scheduledAt && c.stage !== "published" && c.stage !== "analyzed" && t(c.scheduledAt) > nowMs && t(c.scheduledAt) < today.end + 2 * 86_400_000)
    .filter((c) => !s.events.some((e) => e.contentId === c.id))
    .map((c) => contentRef(c, clock, "info"));
  const nextItems = [...upcomingEvents, ...upcomingContent].sort((a, b) => t(a.at) - t(b.at)).slice(0, 6);

  const overdueItems: ItemRef[] = [
    ...overdueTasks.sort(sortTasks).map((x) => taskRef(x, clock, "danger")),
    ...s.campaigns
      .filter((c) => c.dueAt && t(c.dueAt) < today.start && !["done", "lost", "payment"].includes(c.stage))
      .map((c) => ({ entity: "campaigns" as const, id: c.id, title: c.title, meta: `prazo ${fmtDay(c.dueAt, clock)}`, at: c.dueAt, href: `/creator?tab=brands&open=${c.id}`, tone: "danger" as const })),
  ];

  const contentsToday = s.contents.filter((c) => c.scheduledAt && t(c.scheduledAt) >= today.start && t(c.scheduledAt) < today.end).length +
    eventsToday.filter((e) => e.kind === "recording" || e.kind === "publish").length;

  const doneToday = s.tasks.filter((x) => x.completedAt && t(x.completedAt) >= today.start).length;

  return {
    now: nowItems,
    today: todayItems,
    next: nextItems,
    overdue: overdueItems,
    nextAction: pickNextAction(s, clock, { overdueTasks, todayTasks, nowTasks, happening, livesSoon }),
    counts: {
      priorities: todayTasks.filter((x) => PRIORITY_WEIGHT[x.priority] >= 3).length + overdueTasks.filter((x) => PRIORITY_WEIGHT[x.priority] >= 3).length,
      tasksToday: todayTasks.length,
      overdue: overdueItems.length,
      events: eventsToday.filter((e) => e.kind !== "live").length,
      contents: contentsToday,
      lives: s.lives.filter((l) => l.startAt && t(l.startAt) >= today.start && t(l.startAt) < today.end).length,
      inbox: s.captures.filter((c) => c.status === "pending").length + s.tasks.filter((x) => x.status === "inbox").length,
      doneToday,
    },
  };
}

function pickNextAction(
  s: Snapshot,
  clock: Clock,
  x: { overdueTasks: Task[]; todayTasks: Task[]; nowTasks: Task[]; happening: CalEvent[]; livesSoon: Live[] },
): NextAction | null {
  const nowMs = clock.now.getTime();
  const byPriority = (a: Task, b: Task) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || (t(a.dueAt) || 0) - (t(b.dueAt) || 0);

  const live = x.livesSoon.find((l) => l.checklist.some((c) => !c.done) && t(l.startAt) > nowMs);
  if (live) {
    const mins = Math.round((t(live.startAt) - nowMs) / 60_000);
    return {
      title: `Preparar a live "${live.title}"`,
      reason: `Começa em ${mins < 60 ? `${mins} min` : `${Math.round(mins / 60)}h`} e o checklist ainda não está completo.`,
      href: `/creator?tab=lives&open=${live.id}`,
      cta: "Abrir checklist",
      ref: liveRef(live, clock),
    };
  }
  const meeting = x.happening.find((e) => t(e.startAt) > nowMs);
  if (meeting) {
    const mins = Math.round((t(meeting.startAt) - nowMs) / 60_000);
    return { title: `Preparar: ${meeting.title}`, reason: `Começa em ${mins} min.`, href: `/calendar?open=${meeting.id}`, cta: "Ver compromisso", ref: eventRef(meeting, clock) };
  }
  const urgentOverdue = [...x.overdueTasks].sort(byPriority)[0];
  if (urgentOverdue && PRIORITY_WEIGHT[urgentOverdue.priority] >= 3) {
    return { title: urgentOverdue.title, reason: "Está atrasada e é prioridade alta.", href: `/tasks?open=${urgentOverdue.id}`, cta: "Fazer agora", ref: taskRef(urgentOverdue, clock) };
  }
  const nowTask = [...x.nowTasks].sort(byPriority)[0];
  if (nowTask) return { title: nowTask.title, reason: nowTask.priority === "urgent" ? "Marcada como urgente para hoje." : "Está no horário.", href: `/tasks?open=${nowTask.id}`, cta: "Começar", ref: taskRef(nowTask, clock) };

  // Campaign deliverables due soon
  const camp = s.campaigns
    .filter((c) => c.dueAt && !["done", "lost", "payment"].includes(c.stage) && t(c.dueAt) - nowMs < 4 * 86_400_000 && c.deliverables.some((d) => !d.done))
    .sort((a, b) => t(a.dueAt) - t(b.dueAt))[0];
  if (camp) {
    const next = camp.deliverables.find((d) => !d.done)!;
    return { title: next.text, reason: `Entregável da ${camp.title}, prazo ${fmtDay(camp.dueAt, clock)}.`, href: `/creator?tab=brands&open=${camp.id}`, cta: "Abrir campanha" };
  }
  const todayTop = [...x.todayTasks].sort(byPriority)[0];
  if (todayTop) return { title: todayTop.title, reason: "É a tarefa mais importante de hoje.", href: `/tasks?open=${todayTop.id}`, cta: "Começar", ref: taskRef(todayTop, clock) };
  const overdue = [...x.overdueTasks].sort(byPriority)[0];
  if (overdue) return { title: overdue.title, reason: "Está atrasada — resolva ou reagende.", href: `/tasks?open=${overdue.id}`, cta: "Resolver", ref: taskRef(overdue, clock) };
  const doing = s.tasks.find((k) => k.status === "doing");
  if (doing) return { title: doing.title, reason: "Você já começou — termine antes de abrir outra frente.", href: `/tasks?open=${doing.id}`, cta: "Continuar", ref: taskRef(doing, clock) };

  // Content pipeline: move the most advanced piece forward
  const order = ["review", "editing", "recording", "script", "idea"];
  for (const stage of order) {
    const c = s.contents.find((k) => k.stage === stage);
    if (c) {
      const verbs: Record<string, string> = { review: "Revisar e agendar", editing: "Finalizar edição de", recording: "Gravar", script: "Escrever roteiro de", idea: "Desenvolver" };
      return { title: `${verbs[stage]} "${c.title}"`, reason: "Próximo passo no seu pipeline de conteúdo.", href: `/creator?open=${c.id}`, cta: "Abrir conteúdo", ref: contentRef(c, clock) };
    }
  }
  const pendingCaptures = s.captures.filter((c) => c.status === "pending").length + s.tasks.filter((k) => k.status === "inbox").length;
  if (pendingCaptures) return { title: "Organizar sua inbox", reason: `${pendingCaptures} ${pendingCaptures === 1 ? "item capturado espera" : "itens capturados esperam"} organização.`, href: "/inbox", cta: "Organizar" };
  const anyTask = s.tasks.filter((k) => k.status === "todo").sort(byPriority)[0];
  if (anyTask) return { title: anyTask.title, reason: "Sem nada urgente — avance no que importa.", href: `/tasks?open=${anyTask.id}`, cta: "Começar", ref: taskRef(anyTask, clock) };
  return null;
}

/* ------------------------------------------------------------------ */
/* Proactive suggestions                                               */
/* ------------------------------------------------------------------ */

export type Suggestion = {
  id: string; // stable key for dismissal
  text: string;
  cta: string;
  href?: string;
  /** Prompt to send to AIVA when the CTA is used. */
  prompt?: string;
  tone: "info" | "warn" | "danger";
};

export function buildSuggestions(s: Snapshot, clock: Clock): Suggestion[] {
  const out: Suggestion[] = [];
  const nowMs = clock.now.getTime();
  const tomorrow = dayRange(clock, 1);
  const today = dayRange(clock);

  for (const e of s.events) {
    if (e.kind !== "recording") continue;
    const st = t(e.startAt);
    if (st < today.start || st >= tomorrow.end) continue;
    const content = e.contentId ? s.contents.find((c) => c.id === e.contentId) : undefined;
    if (!content || !content.script) {
      out.push({
        id: `script:${e.id}`,
        text: `Você tem uma gravação ${st >= tomorrow.start ? "amanhã" : "hoje"} ("${e.title.replace(/^Gravação:\s*/, "")}"), mas ainda não existe roteiro. Quer que eu crie um?`,
        cta: "Criar roteiro",
        prompt: `Crie um roteiro para ${content ? `o conteúdo "${content.title}"` : `"${e.title}"`}`,
        tone: "warn",
      });
    }
  }

  for (const c of s.campaigns) {
    if (!c.dueAt || ["done", "lost", "payment"].includes(c.stage)) continue;
    const due = t(c.dueAt);
    const missing = c.deliverables.filter((d) => !d.done).length;
    if (missing && due > nowMs && due - nowMs < 5 * 86_400_000) {
      out.push({
        id: `campaign:${c.id}:${missing}`,
        text: `${c.title} vence ${fmtDay(c.dueAt, clock)} e ainda ${missing === 1 ? "falta 1 entregável" : `faltam ${missing} entregáveis`}.`,
        cta: "Ver campanha",
        href: `/creator?tab=brands&open=${c.id}`,
        tone: "danger",
      });
    }
  }

  for (const l of s.lives) {
    if (l.status === "done" || !l.startAt) continue;
    const st = t(l.startAt);
    if (st >= today.start && st < today.end && st > nowMs) {
      out.push({
        id: `live:${l.id}`,
        text: `Você marcou uma live para hoje às ${fmtTime(l.startAt, clock.tzOffset)}. Quer abrir o checklist?`,
        cta: "Abrir checklist",
        href: `/creator?tab=lives&open=${l.id}`,
        tone: "info",
      });
    }
  }

  const followups = s.clients.filter((c) => c.nextFollowUpAt && t(c.nextFollowUpAt) < today.end && c.stage !== "lost");
  if (followups.length) {
    out.push({
      id: `followups:${followups.map((f) => f.id).join(",")}`,
      text: followups.length === 1 ? `${followups[0].name} está esperando seu follow-up.` : `${followups.length} clientes precisam de follow-up hoje.`,
      cta: "Ver clientes",
      href: "/clients?filter=followup",
      tone: "warn",
    });
  }

  const inbox = s.captures.filter((c) => c.status === "pending").length;
  if (inbox >= 5) out.push({ id: `inbox:${inbox}`, text: `Sua inbox tem ${inbox} capturas. Quer que eu organize?`, cta: "Organizar", prompt: "Organize minha inbox", tone: "info" });

  const pendingIncome = s.transactions.filter((x) => x.kind === "income" && x.status === "pending" && x.dueAt && t(x.dueAt) < today.start);
  if (pendingIncome.length) {
    const total = pendingIncome.reduce((a, b) => a + b.amount, 0);
    out.push({ id: `income:${pendingIncome.length}`, text: `${pendingIncome.length} ${pendingIncome.length === 1 ? "pagamento está atrasado" : "pagamentos estão atrasados"} (${brl(total)}).`, cta: "Ver financeiro", href: "/finance", tone: "warn" });
  }
  return out.slice(0, 4);
}

export function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: v % 1 ? 2 : 0 });
}

/* ------------------------------------------------------------------ */
/* Briefing & review                                                   */
/* ------------------------------------------------------------------ */

export function greeting(clock: Clock) {
  const h = wallParts(clock.now, clock.tzOffset).h;
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function focusOfDay(s: Snapshot, clock: Clock): string | null {
  const nowMs = clock.now.getTime();
  const camp = s.campaigns
    .filter((c) => c.dueAt && !["done", "lost"].includes(c.stage) && t(c.dueAt) > nowMs - 86_400_000)
    .sort((a, b) => t(a.dueAt) - t(b.dueAt))[0];
  if (camp && t(camp.dueAt) - nowMs < 7 * 86_400_000) return `Finalizar ${camp.title}`;
  const proj = s.projects
    .filter((p) => p.status === "active" && p.dueAt)
    .sort((a, b) => t(a.dueAt) - t(b.dueAt))[0];
  if (proj && t(proj.dueAt) - nowMs < 14 * 86_400_000) return `Avançar no projeto ${proj.name}`;
  const top = s.tasks.filter((x) => isOpenTask(x) && (x.priority === "urgent" || x.priority === "high")).sort((a, b) => (t(a.dueAt) || Infinity) - (t(b.dueAt) || Infinity))[0];
  if (top) return top.title;
  const goal = s.goals.find((g) => g.status === "active");
  return goal ? goal.title : null;
}

export function dailyReview(s: Snapshot, clock: Clock) {
  const today = dayRange(clock);
  const tomorrow = dayRange(clock, 1);
  const done = s.tasks.filter((x) => x.completedAt && t(x.completedAt) >= today.start && t(x.completedAt) < today.end);
  const pending = s.tasks.filter((x) => isOpenTask(x) && isDueToday(x, clock));
  const overdue = s.tasks.filter((x) => isOverdue(x, clock) && !isDueToday(x, clock));
  const published = s.contents.filter((c) => c.publishedAt && t(c.publishedAt) >= today.start && t(c.publishedAt) < today.end);
  const tomorrowTasks = s.tasks.filter((x) => isOpenTask(x) && x.dueAt && t(x.dueAt) >= tomorrow.start && t(x.dueAt) < tomorrow.end);
  const tomorrowEvents = s.events.filter((e) => t(e.startAt) >= tomorrow.start && t(e.startAt) < tomorrow.end);
  const tomorrowPriorities = tomorrowTasks.filter((x) => PRIORITY_WEIGHT[x.priority] >= 2).length || Math.min(tomorrowTasks.length, 3);
  return { done, pending, overdue, published, tomorrowTasks, tomorrowEvents, tomorrowPriorities };
}

/* ------------------------------------------------------------------ */
/* Planning                                                            */
/* ------------------------------------------------------------------ */

export type PlanBlock = { start: string; end: string; title: string; kind: "event" | "task" | "break"; taskId?: string; eventId?: string };

/**
 * Builds a realistic plan for the day: fixed events stay put; open tasks
 * (overdue → urgent → high → due today) fill the free gaps in 45-minute blocks.
 */
export function planDay(s: Snapshot, clock: Clock, settings: WorkspaceSettings, offsetDays = 0): PlanBlock[] {
  const p = wallParts(clock.now, clock.tzOffset);
  const dayStart = fromWall(p.y, p.m, p.d + offsetDays, settings.dayStart ?? 8, 0, clock.tzOffset).getTime();
  const dayEnd = fromWall(p.y, p.m, p.d + offsetDays, settings.dayEnd ?? 19, 0, clock.tzOffset).getTime();
  let cursor = Math.max(dayStart, offsetDays === 0 ? roundUp(clock.now.getTime(), 15) : dayStart);

  const range = dayRange(clock, offsetDays);
  const fixed = s.events
    .filter((e) => !e.allDay && t(e.startAt) >= range.start && t(e.startAt) < range.end)
    .map((e) => ({ start: t(e.startAt), end: e.endAt ? t(e.endAt) : t(e.startAt) + 60 * 60_000, e }))
    .sort((a, b) => a.start - b.start);

  const queue = s.tasks
    .filter((x) => isOpenTask(x) && x.status !== "waiting" && (isOverdue(x, clock) || !x.dueAt || t(x.dueAt) < range.end))
    .filter((x) => !(x.hasTime && x.dueAt && t(x.dueAt) >= range.start && t(x.dueAt) < range.end))
    .sort((a, b) => {
      const oa = isOverdue(a, clock) ? 1 : 0;
      const ob = isOverdue(b, clock) ? 1 : 0;
      return ob - oa || PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || (t(a.dueAt) || Infinity) - (t(b.dueAt) || Infinity);
    })
    .slice(0, 8);

  const blocks: PlanBlock[] = fixed.map(({ start, end, e }) => ({ start: iso(start), end: iso(end), title: e.title, kind: "event", eventId: e.id }));
  // Timed tasks already scheduled for that day are fixed points too.
  for (const x of s.tasks) {
    if (isOpenTask(x) && x.hasTime && x.dueAt && t(x.dueAt) >= range.start && t(x.dueAt) < range.end) {
      blocks.push({ start: x.dueAt, end: iso(t(x.dueAt) + 30 * 60_000), title: x.title, kind: "task", taskId: x.id });
      fixed.push({ start: t(x.dueAt), end: t(x.dueAt) + 30 * 60_000, e: null as unknown as CalEvent });
    }
  }
  fixed.sort((a, b) => a.start - b.start);

  let worked = 0;
  for (const task of queue) {
    const len = (task.priority === "low" || task.priority === "none" ? 30 : 45) * 60_000;
    // Find next gap
    let placed = false;
    while (cursor + len <= dayEnd) {
      const clash = fixed.find((f) => cursor < f.end && cursor + len > f.start);
      if (!clash) {
        blocks.push({ start: iso(cursor), end: iso(cursor + len), title: task.title, kind: "task", taskId: task.id });
        fixed.push({ start: cursor, end: cursor + len, e: null as unknown as CalEvent });
        cursor += len;
        worked += len;
        if (worked >= 120 * 60_000) {
          blocks.push({ start: iso(cursor), end: iso(cursor + 15 * 60_000), title: "Pausa", kind: "break" });
          cursor += 15 * 60_000;
          worked = 0;
        }
        placed = true;
        break;
      }
      cursor = clash.end;
    }
    if (!placed) break;
  }
  return blocks.sort((a, b) => t(a.start) - t(b.start));
}

const roundUp = (ms: number, minutes: number) => Math.ceil(ms / (minutes * 60_000)) * minutes * 60_000;
const iso = (ms: number) => new Date(ms).toISOString();

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export function contentsThisWeek(s: Snapshot, clock: Clock): Content[] {
  const start = dayRange(clock).start;
  const end = start + 7 * 86_400_000;
  return s.contents
    .filter((c) => c.stage !== "published" && c.stage !== "analyzed" && c.scheduledAt && t(c.scheduledAt) >= start - 86_400_000 && t(c.scheduledAt) < end)
    .sort((a, b) => t(a.scheduledAt) - t(b.scheduledAt));
}

export function followUps(s: Snapshot, clock: Clock): Client[] {
  const end = dayRange(clock).end;
  const stale = clock.now.getTime() - 14 * 86_400_000;
  return s.clients
    .filter((c) => c.stage !== "lost" && c.stage !== "won" && ((c.nextFollowUpAt && t(c.nextFollowUpAt) < end) || (!c.nextFollowUpAt && t(c.updatedAt) < stale)))
    .sort((a, b) => (t(a.nextFollowUpAt) || 0) - (t(b.nextFollowUpAt) || 0));
}

export function campaignStatus(s: Snapshot, c: Campaign, clock: Clock) {
  const contents = s.contents.filter((k) => k.campaignId === c.id);
  const tasks = s.tasks.filter((k) => k.campaignId === c.id);
  const missingDeliverables = c.deliverables.filter((d) => !d.done);
  const openTasks = tasks.filter(isOpenTask);
  const unpublished = contents.filter((k) => k.stage !== "published" && k.stage !== "analyzed");
  const tx = s.transactions.filter((k) => k.campaignId === c.id);
  const brand = s.brands.find((b) => b.id === c.brandId);
  return { campaign: c, brand, contents, tasks, missingDeliverables, openTasks, unpublished, tx, due: c.dueAt ? fmtDay(c.dueAt, clock) : null };
}

export function financeSummary(s: Snapshot, clock: Clock) {
  const p = wallParts(clock.now, clock.tzOffset);
  const monthStart = fromWall(p.y, p.m, 1, 0, 0, clock.tzOffset).getTime();
  const monthEnd = fromWall(p.y, p.m + 1, 1, 0, 0, clock.tzOffset).getTime();
  const inMonth = (x: { dueAt: string | null; paidAt: string | null; createdAt: string }) => {
    const ref = t(x.paidAt) || t(x.dueAt) || t(x.createdAt);
    return ref >= monthStart && ref < monthEnd;
  };
  const month = s.transactions.filter(inMonth);
  const received = month.filter((x) => x.kind === "income" && x.status === "done").reduce((a, b) => a + b.amount, 0);
  const expected = month.filter((x) => x.kind === "income").reduce((a, b) => a + b.amount, 0);
  const receivable = s.transactions.filter((x) => x.kind === "income" && x.status === "pending").reduce((a, b) => a + b.amount, 0);
  const expenses = month.filter((x) => x.kind === "expense").reduce((a, b) => a + b.amount, 0);
  return { received, expected, receivable, expenses, result: received - month.filter((x) => x.kind === "expense" && x.status === "done").reduce((a, b) => a + b.amount, 0) };
}

/** Simple ranked search across the workspace (used by global search and the AI). */
export function searchAll(s: Snapshot, q: string, limit = 30) {
  const terms = normalize(q)
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
  if (!terms.length) return [];
  type Hit = { entity: string; id: string; title: string; subtitle: string; href: string; score: number };
  const hits: Hit[] = [];
  const add = (entity: string, id: string, title: string, subtitle: string, href: string, haystack: string) => {
    const h = normalize(`${title} ${haystack}`);
    let score = 0;
    for (const w of terms) {
      if (normalize(title).includes(w)) score += 3;
      else if (h.includes(w)) score += 1;
      else return;
    }
    hits.push({ entity, id, title, subtitle, href, score });
  };
  const brandName = (id: string | null) => s.brands.find((b) => b.id === id)?.name ?? "";
  const campaignTitle = (id: string | null) => s.campaigns.find((c) => c.id === id)?.title ?? "";
  for (const x of s.tasks) add("tasks", x.id, x.title, "Tarefa", `/tasks?open=${x.id}`, `${x.description ?? ""} ${x.category ?? ""} ${x.tags.join(" ")} ${campaignTitle(x.campaignId)}`);
  for (const x of s.projects) add("projects", x.id, x.name, "Projeto", `/projects/${x.id}`, x.description ?? "");
  for (const x of s.events) add("events", x.id, x.title, "Evento", `/calendar?open=${x.id}`, `${x.description ?? ""} ${x.location ?? ""}`);
  for (const x of s.notes) add("notes", x.id, x.title, "Nota", `/notes?open=${x.id}`, `${x.body ?? ""} ${x.url ?? ""} ${x.tags.join(" ")}`);
  for (const x of s.ideas) add("ideas", x.id, x.title, "Ideia", `/creator?tab=ideas&open=${x.id}`, `${x.hook ?? ""} ${x.description ?? ""} ${x.category ?? ""}`);
  for (const x of s.contents) add("contents", x.id, x.title, "Conteúdo", `/creator?open=${x.id}`, `${x.hook ?? ""} ${x.script ?? ""} ${x.caption ?? ""} ${x.platform ?? ""} ${campaignTitle(x.campaignId)}`);
  for (const x of s.lives) add("lives", x.id, x.title, "Live", `/creator?tab=lives&open=${x.id}`, `${x.topic ?? ""} ${x.agenda ?? ""}`);
  for (const x of s.brands) add("brands", x.id, x.name, "Marca", `/creator?tab=brands`, `${x.contactName ?? ""} ${x.notes ?? ""}`);
  for (const x of s.campaigns) add("campaigns", x.id, x.title, "Campanha", `/creator?tab=brands&open=${x.id}`, `${brandName(x.brandId)} ${x.briefing ?? ""} ${x.notes ?? ""}`);
  for (const x of s.clients) add("clients", x.id, x.name, x.kind === "lead" ? "Lead" : "Cliente", `/clients?open=${x.id}`, `${x.company ?? ""} ${x.email ?? ""} ${x.notes ?? ""}`);
  for (const x of s.goals) add("goals", x.id, x.title, "Meta", `/goals`, x.category);
  for (const x of s.transactions) add("transactions", x.id, x.title, x.kind === "income" ? "Receita" : "Despesa", `/finance`, x.category);
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

const STOP = new Set(["de", "da", "do", "das", "dos", "a", "o", "as", "os", "e", "em", "no", "na", "com", "para", "pra", "um", "uma", "tudo", "relacionado", "relacionada", "mostre", "mostra", "sobre", "empresa", "que"]);

export function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

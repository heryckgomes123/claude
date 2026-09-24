import "server-only";
import { getDb, schema } from "@/db";
import { newId } from "@/lib/id";
import type { Snapshot } from "@/lib/types";
import { dayRange, fmtTime, isOverdue, type Clock } from "@/lib/intelligence";
import { wallParts } from "@/lib/nlp/datetime";

type N = { key: string; title: string; body?: string; kind: string; href?: string };

/** Smart, deduplicated notifications — useful signals only, never spam. */
export function computeNotifications(s: Snapshot, clock: Clock): N[] {
  const out: N[] = [];
  const now = clock.now.getTime();
  const p = wallParts(clock.now, clock.tzOffset);
  const ymd = `${p.y}-${p.m + 1}-${p.d}`;
  const tomorrow = dayRange(clock, 1);

  for (const l of s.lives) {
    if (l.status === "done" || !l.startAt) continue;
    const mins = (new Date(l.startAt).getTime() - now) / 60_000;
    if (mins > 0 && mins <= 30) out.push({ key: `live30:${l.id}`, title: `Você tem uma live em ${Math.round(mins)} minutos`, body: l.title, kind: "live", href: `/creator?tab=lives&open=${l.id}` });
  }
  for (const e of s.events) {
    if (e.allDay || e.kind === "live") continue;
    const start = new Date(e.startAt).getTime();
    const lead = (e.reminderMinutes ?? 15) * 60_000;
    if (now >= start - lead && now < start) out.push({ key: `evt:${e.id}:${e.startAt}`, title: `${e.title} às ${fmtTime(e.startAt, clock.tzOffset)}`, body: e.location ?? undefined, kind: "event", href: `/calendar?open=${e.id}` });
  }
  for (const t of s.tasks) {
    if (t.status === "done" || !t.hasTime || !t.dueAt) continue;
    const due = new Date(t.dueAt).getTime();
    if (now >= due - 10 * 60_000 && now < due + 5 * 60_000) out.push({ key: `task:${t.id}:${t.dueAt}`, title: `Lembrete: ${t.title}`, kind: "task", href: `/tasks?open=${t.id}` });
  }
  const overdue = s.tasks.filter((t) => isOverdue(t, clock)).length;
  if (overdue > 0) out.push({ key: `overdue:${ymd}`, title: `Você tem ${overdue} ${overdue === 1 ? "tarefa atrasada" : "tarefas atrasadas"}`, kind: "warn", href: "/tasks?view=overdue" });

  const recTomorrow = s.events.filter((e) => e.kind === "recording" && new Date(e.startAt).getTime() >= tomorrow.start && new Date(e.startAt).getTime() < tomorrow.end).length;
  if (recTomorrow && p.h >= 12) out.push({ key: `rec:${ymd}`, title: `Amanhã você tem ${recTomorrow} ${recTomorrow === 1 ? "gravação" : "gravações"}`, kind: "content", href: "/calendar" });

  for (const c of s.campaigns) {
    if (!c.dueAt || ["done", "lost", "payment"].includes(c.stage)) continue;
    const due = new Date(c.dueAt).getTime();
    const missing = c.deliverables.filter((d) => !d.done).length;
    if (missing && due - now < 2 * 86_400_000) out.push({ key: `camp:${c.id}:${ymd}`, title: `O conteúdo da ${c.title} ainda não foi enviado`, body: `${missing} ${missing === 1 ? "entregável pendente" : "entregáveis pendentes"}`, kind: "campaign", href: `/creator?tab=brands&open=${c.id}` });
  }
  return out;
}

export async function persistNotifications(workspaceId: string, list: N[]) {
  if (!list.length) return;
  const db = await getDb();
  await db
    .insert(schema.notifications)
    .values(list.map((n) => ({ id: newId(), workspaceId, title: n.title, body: n.body ?? null, kind: n.kind, href: n.href ?? null, dedupeKey: n.key })))
    .onConflictDoNothing();
}

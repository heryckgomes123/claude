"use client";

import { useMemo, useState } from "react";
import { useClientValue } from "@/hooks/use-client-value";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/PageHeader";
import { Segmented, Button, Checkbox } from "@/components/ui";
import { useAiva, useList } from "@/store/aiva";
import { useClock } from "@/hooks/use-clock";
import { useOpenParam } from "@/hooks/use-open-param";
import { EVENT_KIND_COLOR, EVENT_KIND_LABEL } from "@/components/detail/fields";
import type { EntityName } from "@/lib/entities";
import { cn } from "@/lib/cn";

/** One item on the universal calendar — events, tasks, publications, lives, campaign deadlines. */
type CalItem = {
  key: string;
  entity: EntityName;
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  label: string;
  done?: boolean;
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const HOUR_PX = 52;

export function CalendarView() {
  const events = useList("events");
  const tasks = useList("tasks");
  const contents = useList("contents");
  const lives = useList("lives");
  const campaigns = useList("campaigns");
  const creator = useAiva((s) => s.me?.workspace.settings.creatorMode);
  const setUI = useAiva((s) => s.setUI);
  const create = useAiva((s) => s.create);
  const update = useAiva((s) => s.update);
  const { now } = useClock();
  const isPhone = useClientValue(() => window.innerWidth < 640, false);
  const [chosenView, setView] = useState<"day" | "week" | "month" | null>(null);
  const view = chosenView ?? (isPhone ? "day" : "week");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  useOpenParam((id) => (events.some((e) => e.id === id) ? "events" : tasks.some((t) => t.id === id) ? "tasks" : null));


  const items = useMemo<CalItem[]>(() => {
    const out: CalItem[] = [];
    const contentWithEvent = new Set(events.filter((e) => e.contentId && e.kind === "publish").map((e) => e.contentId));
    for (const e of events) {
      const start = new Date(e.startAt);
      out.push({ key: `e${e.id}`, entity: "events", id: e.id, title: e.title, start, end: e.endAt ? new Date(e.endAt) : new Date(start.getTime() + 3600_000), allDay: e.allDay, color: EVENT_KIND_COLOR[e.kind] ?? "#8b5cff", label: EVENT_KIND_LABEL[e.kind] ?? "Evento" });
    }
    for (const t of tasks) {
      if (!t.dueAt) continue;
      const start = new Date(t.dueAt);
      out.push({ key: `t${t.id}`, entity: "tasks", id: t.id, title: t.title, start, end: new Date(start.getTime() + 30 * 60_000), allDay: !t.hasTime, color: "#a3a1b8", label: "Tarefa", done: t.status === "done" });
    }
    if (creator) {
      for (const c of contents) {
        if (!c.scheduledAt || contentWithEvent.has(c.id)) continue;
        const start = new Date(c.scheduledAt);
        out.push({ key: `c${c.id}`, entity: "contents", id: c.id, title: `📣 ${c.title}`, start, end: new Date(start.getTime() + 30 * 60_000), allDay: false, color: "#3ddc97", label: "Publicação", done: c.stage === "published" || c.stage === "analyzed" });
      }
      for (const l of lives) {
        if (!l.startAt || events.some((e) => e.kind === "live" && e.title.includes(l.title))) continue;
        const start = new Date(l.startAt);
        out.push({ key: `l${l.id}`, entity: "lives", id: l.id, title: `🔴 ${l.title}`, start, end: new Date(start.getTime() + l.durationMin * 60_000), allDay: false, color: "#ff5c7a", label: "Live" });
      }
      for (const c of campaigns) {
        if (!c.dueAt || c.stage === "done" || c.stage === "lost") continue;
        const start = new Date(c.dueAt);
        out.push({ key: `k${c.id}`, entity: "campaigns", id: c.id, title: `⏳ ${c.title}`, start, end: start, allDay: true, color: "#ffa24c", label: "Prazo da campanha" });
      }
    }
    return out.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events, tasks, contents, lives, campaigns, creator]);

  const range = useMemo(() => {
    if (view === "day") return { start: cursor, days: 1 };
    if (view === "week") {
      const s = addDays(cursor, -((cursor.getDay() + 6) % 7)); // Monday
      return { start: s, days: 7 };
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const s = addDays(first, -((first.getDay() + 6) % 7));
    return { start: s, days: 42 };
  }, [view, cursor]);

  const move = (dir: number) => {
    if (view === "day") setCursor((c) => addDays(c, dir));
    if (view === "week") setCursor((c) => addDays(c, 7 * dir));
    if (view === "month") setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  };

  const open = (it: CalItem) => {
    if (["tasks", "events", "contents", "lives", "campaigns"].includes(it.entity)) setUI({ detail: { entity: it.entity, id: it.id } });
  };

  const newEvent = async (at: Date, allDay = false) => {
    const row = await create("events", { title: "Novo compromisso", startAt: at.toISOString(), endAt: new Date(at.getTime() + 3600_000).toISOString(), allDay, kind: "appointment" }, { silent: true });
    if (row) setUI({ detail: { entity: "events", id: row.id } });
  };

  const title =
    view === "month"
      ? cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      : view === "week"
        ? `${range.start.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} – ${addDays(range.start, 6).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}`
        : cursor.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const days = Array.from({ length: range.days }, (_, i) => addDays(range.start, i));
  const dayItems = (d: Date) => items.filter((it) => sameDay(it.start, d));

  return (
    <Page wide>
      <PageHeader
        title="Calendário"
        actions={
          <Button variant="primary" size="sm" onClick={() => { const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); newEvent(d); }}>
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Evento</span>
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => move(-1)} className="pressable grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-muted hover:text-ink" aria-label="Anterior"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={() => setCursor(startOfDay(new Date()))} className="pressable h-10 rounded-xl bg-surface-2 px-3 text-sm text-muted hover:text-ink">Hoje</button>
          <button onClick={() => move(1)} className="pressable grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-muted hover:text-ink" aria-label="Próximo"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <h2 className="min-w-0 flex-1 truncate text-lg font-medium first-letter:uppercase">{title}</h2>
        <Segmented value={view} onChange={setView} options={[{ value: "day", label: "Dia" }, { value: "week", label: "Semana" }, { value: "month", label: "Mês" }]} />
      </div>

      {view === "day" && (
        <>
          <WeekStrip cursor={cursor} setCursor={setCursor} items={items} now={now} />
          <DayAgenda day={cursor} items={dayItems(cursor)} now={now} onOpen={open} onNew={newEvent} onToggleTask={(id, done) => update("tasks", id, { status: done ? "done" : "todo" })} />
        </>
      )}

      {view === "week" && (
        <>
          {/* Mobile: stacked agenda per day. Desktop: time grid. */}
          <div className="grid gap-4 lg:hidden">
            {days.map((d) => (
              <section key={d.toISOString()}>
                <p className={cn("mb-1.5 px-1 text-[13px] font-semibold first-letter:uppercase", sameDay(d, now) ? "text-ink" : "text-muted")}>
                  {d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric" })} {sameDay(d, now) && <span className="grad-text">· hoje</span>}
                </p>
                <div className="card p-1">
                  {dayItems(d).length === 0 ? <button onClick={() => { const at = new Date(d); at.setHours(10); newEvent(at); }} className="w-full px-3 py-3 text-left text-sm text-faint">Livre · toque para adicionar</button> : dayItems(d).map((it) => <AgendaRow key={it.key} it={it} onOpen={open} onToggleTask={(id, done) => update("tasks", id, { status: done ? "done" : "todo" })} />)}
                </div>
              </section>
            ))}
          </div>
          <div className="hidden lg:block">
            <TimeGrid days={days} items={items} now={now} onOpen={open} onNew={newEvent} />
          </div>
        </>
      )}

      {view === "month" && (
        <div className="card overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b border-line">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
              <div key={d} className="py-2 text-center text-[11px] font-medium text-faint">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const list = dayItems(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => { setCursor(d); setView("day"); }}
                  className={cn("flex min-h-16 flex-col items-stretch gap-1 border-r border-b border-line p-1 text-left hover:bg-surface-2 sm:min-h-24 sm:p-1.5", !inMonth && "opacity-40")}
                >
                  <span className={cn("grid h-6 w-6 place-items-center self-start rounded-full text-[12px]", sameDay(d, now) && "grad font-semibold text-white")}>{d.getDate()}</span>
                  <span className="hidden flex-col gap-0.5 sm:flex">
                    {list.slice(0, 3).map((it) => (
                      <span key={it.key} className="truncate rounded-md px-1 py-0.5 text-[11px]" style={{ background: `${it.color}22`, color: it.color }}>{it.title}</span>
                    ))}
                    {list.length > 3 && <span className="px-1 text-[10px] text-faint">+{list.length - 3}</span>}
                  </span>
                  <span className="flex flex-wrap gap-0.5 sm:hidden">
                    {list.slice(0, 4).map((it) => <span key={it.key} className="h-1.5 w-1.5 rounded-full" style={{ background: it.color }} />)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-muted">
        {Object.entries(EVENT_KIND_LABEL).map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: EVENT_KIND_COLOR[k] }} /> {label}</span>
        ))}
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted" /> Tarefa</span>
      </div>
    </Page>
  );
}

function WeekStrip({ cursor, setCursor, items, now }: { cursor: Date; setCursor: (d: Date) => void; items: CalItem[]; now: Date }) {
  const start = addDays(cursor, -3);
  return (
    <div className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 no-scrollbar lg:mx-0 lg:px-0">
      {Array.from({ length: 14 }, (_, i) => addDays(start, i)).map((d) => {
        const has = items.some((it) => sameDay(it.start, d));
        const active = sameDay(d, cursor);
        return (
          <button key={d.toISOString()} onClick={() => setCursor(d)} className={cn("pressable flex h-16 w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border", active ? "grad border-transparent text-white" : "border-line bg-surface", sameDay(d, now) && !active && "border-violet/50")}>
            <span className={cn("text-[10px] uppercase", active ? "text-white/80" : "text-faint")}>{WEEKDAYS[d.getDay()]}</span>
            <span className="text-[17px] font-semibold">{d.getDate()}</span>
            <span className={cn("h-1 w-1 rounded-full", has ? (active ? "bg-white" : "bg-violet") : "bg-transparent")} />
          </button>
        );
      })}
    </div>
  );
}

function AgendaRow({ it, onOpen, onToggleTask }: { it: CalItem; onOpen: (it: CalItem) => void; onToggleTask: (id: string, done: boolean) => void }) {
  return (
    <div role="button" tabIndex={0} onClick={() => onOpen(it)} onKeyDown={(e) => e.key === "Enter" && onOpen(it)} className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-surface-2">
      <span className="w-11 shrink-0 text-right font-mono text-[12px] text-muted">{it.allDay ? "dia" : hhmm(it.start)}</span>
      <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: it.color }} />
      {it.entity === "tasks" && <Checkbox checked={!!it.done} onChange={(v) => onToggleTask(it.id, v)} size={20} />}
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[15px]", it.done && "text-faint line-through")}>{it.title}</span>
        <span className="block text-[11px] text-faint">{it.label}{!it.allDay && it.entity === "events" ? ` · até ${hhmm(it.end)}` : ""}</span>
      </span>
    </div>
  );
}

function DayAgenda({ day, items, now, onOpen, onNew, onToggleTask }: { day: Date; items: CalItem[]; now: Date; onOpen: (it: CalItem) => void; onNew: (d: Date, allDay?: boolean) => void; onToggleTask: (id: string, done: boolean) => void }) {
  const allDay = items.filter((i) => i.allDay);
  const timed = items.filter((i) => !i.allDay);
  return (
    <div className="grid gap-3">
      {allDay.length > 0 && <div className="card p-1">{allDay.map((it) => <AgendaRow key={it.key} it={it} onOpen={onOpen} onToggleTask={onToggleTask} />)}</div>}
      <div className="card relative p-0">
        {Array.from({ length: 18 }, (_, i) => i + 6).map((h) => {
          const slot = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h);
          const inHour = timed.filter((it) => it.start.getHours() === h);
          const isNow = sameDay(day, now) && now.getHours() === h;
          return (
            <div key={h} className={cn("flex min-h-[52px] border-b border-line last:border-0", isNow && "bg-violet/5")}>
              <button onClick={() => onNew(slot)} className="w-14 shrink-0 pt-2 text-center font-mono text-[11px] text-faint hover:text-ink" aria-label={`Novo evento às ${h}h`}>{String(h).padStart(2, "0")}:00</button>
              <div className="min-w-0 flex-1 py-1 pr-1">
                {inHour.map((it) => <AgendaRow key={it.key} it={it} onOpen={onOpen} onToggleTask={onToggleTask} />)}
                {isNow && <div className="relative h-0"><span className="absolute -top-0.5 left-0 h-[2px] w-full grad" style={{ top: `${(now.getMinutes() / 60) * 44}px` }} /></div>}
              </div>
            </div>
          );
        })}
      </div>
      {timed.filter((t) => t.start.getHours() < 6).map((it) => <AgendaRow key={it.key} it={it} onOpen={onOpen} onToggleTask={onToggleTask} />)}
    </div>
  );
}

function TimeGrid({ days, items, now, onOpen, onNew }: { days: Date[]; items: CalItem[]; now: Date; onOpen: (it: CalItem) => void; onNew: (d: Date, allDay?: boolean) => void }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="card overflow-hidden p-0">
      <div className="grid border-b border-line" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
        <div />
        {days.map((d) => (
          <div key={d.toISOString()} className="border-l border-line px-2 py-2">
            <p className="text-[11px] uppercase text-faint">{WEEKDAYS[d.getDay()]}</p>
            <p className={cn("text-lg font-semibold", sameDay(d, now) && "grad-text")}>{d.getDate()}</p>
            <div className="mt-1 grid gap-0.5">
              {items.filter((it) => it.allDay && sameDay(it.start, d)).map((it) => (
                <button key={it.key} onClick={() => onOpen(it)} className={cn("truncate rounded-md px-1.5 py-0.5 text-left text-[11px]", it.done && "line-through opacity-60")} style={{ background: `${it.color}22`, color: it.color }}>{it.title}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="relative max-h-[70vh] overflow-y-auto" ref={(el) => { if (el && !el.dataset.scrolled) { el.scrollTop = HOUR_PX * 7; el.dataset.scrolled = "1"; } }}>
        <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
          <div>
            {hours.map((h) => <div key={h} className="pr-2 text-right font-mono text-[10px] text-faint" style={{ height: HOUR_PX }}>{String(h).padStart(2, "0")}:00</div>)}
          </div>
          {days.map((d) => (
            <div key={d.toISOString()} className="relative border-l border-line">
              {hours.map((h) => (
                <button key={h} onClick={() => onNew(new Date(d.getFullYear(), d.getMonth(), d.getDate(), h))} className="block w-full border-b border-line/60 hover:bg-surface-2" style={{ height: HOUR_PX }} aria-label={`Novo evento ${d.getDate()} às ${h}h`} />
              ))}
              {items.filter((it) => !it.allDay && sameDay(it.start, d)).map((it, i, arr) => {
                const top = (it.start.getHours() + it.start.getMinutes() / 60) * HOUR_PX;
                const height = Math.max(22, ((it.end.getTime() - it.start.getTime()) / 3600_000) * HOUR_PX - 2);
                const overlap = arr.filter((o) => o.start < it.end && o.end > it.start);
                const idx = overlap.indexOf(it);
                const w = 100 / overlap.length;
                return (
                  <button key={it.key} onClick={() => onOpen(it)} className={cn("absolute overflow-hidden rounded-lg border-l-2 px-1.5 py-1 text-left text-[11px] leading-tight hover:brightness-125", it.done && "opacity-50")} style={{ top, height, left: `calc(${idx * w}% + 2px)`, width: `calc(${w}% - 4px)`, background: `${it.color}26`, borderColor: it.color, zIndex: 2 + i }}>
                    <span className="block truncate font-medium">{it.title}</span>
                    <span className="block text-faint">{hhmm(it.start)}</span>
                  </button>
                );
              })}
              {sameDay(d, now) && <span className="grad absolute right-0 left-0 z-10 h-[2px]" style={{ top: (now.getHours() + now.getMinutes() / 60) * HOUR_PX }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


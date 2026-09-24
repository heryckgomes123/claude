"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-client-value";
import { useRouter } from "next/navigation";
import { Mic, ArrowRight, X, Sparkles, Moon, CircleDot, Clock3, AlertTriangle, CalendarClock, Flame, Users, FolderKanban, Clapperboard, Check } from "lucide-react";
import { Page, HeaderIcons } from "@/components/shell/PageHeader";
import { Avatar, Button, Card, SectionTitle, Progress, Badge } from "@/components/ui";
import { AivaOrb } from "@/components/brand";
import { ItemRow } from "@/components/items/ItemRow";
import { useAiva } from "@/store/aiva";
import { useSnapshot, useSettings } from "@/hooks/use-snapshot";
import { useClock } from "@/hooks/use-clock";
import { buildToday, buildSuggestions, dailyReview, focusOfDay, followUps, greeting, contentsThisWeek, STAGE_LABEL, fmtWhen, type ItemRef } from "@/lib/intelligence";
import { wallParts } from "@/lib/nlp/datetime";
import { cn } from "@/lib/cn";

const DISMISS_KEY = "aiva:dismissed-suggestions";


export function TodayView() {
  const snap = useSnapshot();
  const settings = useSettings();
  const me = useAiva((s) => s.me);
  const setUI = useAiva((s) => s.setUI);
  const update = useAiva((s) => s.update);
  const toast = useAiva((s) => s.toast);
  const clock = useClock();
  const router = useRouter();
  const [dismissed, setDismissed] = useLocalStorage<string[]>(DISMISS_KEY, []);

  const today = useMemo(() => buildToday(snap, clock), [snap, clock]);
  const suggestions = useMemo(() => buildSuggestions(snap, clock).filter((s) => !dismissed.includes(s.id)), [snap, clock, dismissed]);
  const focus = useMemo(() => focusOfDay(snap, clock), [snap, clock]);
  const people = useMemo(() => followUps(snap, clock).slice(0, 4), [snap, clock]);
  const toPublish = useMemo(() => contentsThisWeek(snap, clock), [snap, clock]);
  const review = useMemo(() => dailyReview(snap, clock), [snap, clock]);
  const hour = wallParts(clock.now, clock.tzOffset).h;
  const showReview = hour >= (settings.dayEnd ?? 19) - 1 || hour < 4;
  const name = settings.displayName ?? me?.user.name.split(" ")[0] ?? "";
  const dateLabel = clock.now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const habitsToday = snap.habits.filter((h) => !h.archived && h.daysOfWeek.includes(wallParts(clock.now, clock.tzOffset).dow));
  const ymd = (() => {
    const p = wallParts(clock.now, clock.tzOffset);
    return `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  })();
  const projects = snap.projects
    .filter((p) => p.status === "active")
    .map((p) => {
      const ts = snap.tasks.filter((t) => t.projectId === p.id);
      const done = ts.filter((t) => t.status === "done").length;
      return { p, total: ts.length, done, open: ts.length - done };
    })
    .sort((a, b) => b.open - a.open)
    .slice(0, 4);

  const dismiss = (id: string) => {
    setDismissed([...dismissed, id].slice(-100));
  };

  const na = today.nextAction;
  const naTask = na?.ref?.entity === "tasks" ? snap.tasks.find((t) => t.id === na.ref!.id) : undefined;

  const brief = [
    { n: today.counts.priorities, label: today.counts.priorities === 1 ? "prioridade" : "prioridades", dot: "bg-red" },
    { n: today.counts.tasksToday, label: today.counts.tasksToday === 1 ? "tarefa" : "tarefas", dot: "bg-orange" },
    { n: today.counts.overdue, label: today.counts.overdue === 1 ? "atrasada" : "atrasadas", dot: "bg-yellow", warn: true },
    { n: today.counts.events, label: today.counts.events === 1 ? "compromisso" : "compromissos", dot: "bg-blue" },
    ...(settings.creatorMode
      ? [
          { n: today.counts.contents, label: today.counts.contents === 1 ? "conteúdo" : "conteúdos", dot: "bg-pink" },
          { n: today.counts.lives, label: today.counts.lives === 1 ? "live" : "lives", dot: "bg-red" },
        ]
      : []),
  ];

  const nothing = !today.now.length && !today.today.length && !today.overdue.length;

  return (
    <Page wide>
      {/* ---------- Header ---------- */}
      <header className="flex items-center gap-3 pt-4 lg:pt-8">
        <Link href="/settings" className="shrink-0 lg:hidden" aria-label="Perfil">
          <Avatar name={name} color={me?.user.avatarColor} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-muted first-letter:uppercase">{dateLabel}</p>
          <h1 className="text-[24px] leading-tight font-semibold tracking-tight lg:text-[32px]">
            {greeting(clock)}, {name} 👋
          </h1>
        </div>
        <HeaderIcons />
      </header>
      <p className="mt-1 text-[15px] text-muted">{showReview ? "Hora de fechar o dia com calma." : nothing ? "Seu dia está livre. Que tal planejar algo que importa?" : "Vamos colocar seu dia em movimento."}</p>

      {/* ---------- Briefing ---------- */}
      <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar lg:mx-0 lg:flex-wrap lg:px-0">
        {brief.map((b) => (
          <span key={b.label} className={cn("flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px]", b.warn && b.n > 0 ? "border-yellow/30 bg-yellow/8 text-yellow" : "border-line bg-surface text-muted")}>
            <span className={cn("h-2 w-2 rounded-full", b.dot, b.n === 0 && "opacity-30")} />
            <strong className="font-semibold text-ink">{b.n}</strong> {b.label}
          </span>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-8">
        {/* ================= LEFT ================= */}
        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          {/* Next action */}
          <section className="grad-border relative overflow-hidden rounded-[26px] p-5 shadow-[0_20px_60px_-30px_rgb(139_92_255/0.8)]">
            <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgb(255_79_176/0.25),transparent_70%)]" />
            <p className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.18em] text-muted">👉 PRÓXIMA AÇÃO</p>
            {na ? (
              <>
                <h2 className="mt-3 text-[22px] leading-snug font-semibold">{na.title}</h2>
                <p className="mt-1.5 text-[14px] text-muted">{na.reason}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (na.ref && ["tasks", "events", "contents", "lives", "campaigns"].includes(na.ref.entity)) setUI({ detail: { entity: na.ref.entity as never, id: na.ref.id } });
                      else router.push(na.href);
                    }}
                  >
                    {na.cta} <ArrowRight className="h-4 w-4" />
                  </Button>
                  {naTask && (
                    <Button
                      onClick={() => {
                        update("tasks", naTask.id, { status: "done" });
                        toast({ message: "Feito! Próxima ação atualizada.", tone: "ai", action: { label: "Desfazer", onClick: () => update("tasks", naTask.id, { status: "todo" }) } });
                      }}
                    >
                      <Check className="h-4 w-4" /> Concluir
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-3 text-[22px] font-semibold">Nada urgente agora ✨</h2>
                <p className="mt-1.5 text-[14px] text-muted">Capture o que está na sua cabeça ou peça para a AIVA planejar seu dia.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button variant="primary" onClick={() => setUI({ captureOpen: true, captureMode: "text" })}>
                    Capturar
                  </Button>
                  <Button onClick={() => router.push(`/aiva?q=${encodeURIComponent("Organize meu dia")}`)}>Organizar meu dia</Button>
                </div>
              </>
            )}
            {focus && (
              <p className="mt-5 flex items-center gap-2 border-t border-line pt-3.5 text-[13px] text-muted">
                <Flame className="h-4 w-4 shrink-0 text-orange" /> <span className="shrink-0 font-medium text-ink">Foco:</span> <span className="truncate">{focus}</span>
              </p>
            )}
          </section>

          {/* Voice / ask */}
          <button onClick={() => setUI({ voiceOpen: true })} className="pressable flex h-16 w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 text-left hover:bg-surface-2">
            <AivaOrb size={34} />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">Falar com AIVA</span>
              <span className="block truncate text-[12px] text-muted">“O que está atrasado?” · “Reunião amanhã às 15h”</span>
            </span>
            <span className="grad grid h-10 w-10 shrink-0 place-items-center rounded-full">
              <Mic className="h-5 w-5 text-white" />
            </span>
          </button>

          {/* Suggestions (mobile position) */}
          {suggestions.length > 0 && (
            <div className="grid gap-2 lg:hidden">
              {suggestions.map((s) => (
                <SuggestionCard key={s.id} s={s} onDismiss={() => dismiss(s.id)} />
              ))}
            </div>
          )}

          <Section icon={<CircleDot className="h-4 w-4 text-red" />} title="Agora" items={today.now} empty="Nada exigindo atenção imediata." />
          <Section icon={<Clock3 className="h-4 w-4 text-orange" />} title="Hoje" items={today.today} empty="Nenhuma tarefa com prazo hoje." action={<Link href="/tasks" className="text-[13px] text-muted hover:text-ink">Ver tudo</Link>} />
          {today.overdue.length > 0 && <Section icon={<AlertTriangle className="h-4 w-4 text-yellow" />} title="Atrasado" items={today.overdue} action={<Link href={`/aiva?q=${encodeURIComponent("Reorganize os atrasados")}`} className="text-[13px] text-muted hover:text-ink">Reorganizar</Link>} />}
          <Section icon={<CalendarClock className="h-4 w-4 text-blue" />} title="Próximo" items={today.next} empty="Sem compromissos nos próximos dias." action={<Link href="/calendar" className="text-[13px] text-muted hover:text-ink">Agenda</Link>} />
        </div>

        {/* ================= RIGHT ================= */}
        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          {suggestions.length > 0 && (
            <div className="hidden gap-2 lg:grid">
              <SectionTitle icon={<Sparkles className="h-4 w-4 text-[#c4b1ff]" />} title="AIVA sugere" className="mb-1" />
              {suggestions.map((s) => (
                <SuggestionCard key={s.id} s={s} onDismiss={() => dismiss(s.id)} />
              ))}
            </div>
          )}

          {showReview && (
            <Card className="grad-soft border-violet/20 p-5">
              <p className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.18em] text-muted">
                <Moon className="h-4 w-4" /> SEU DIA EM RESUMO
              </p>
              <ul className="mt-3 grid gap-1.5 text-[15px]">
                <li>✓ {review.done.length} tarefas concluídas</li>
                <li>→ {review.pending.length} pendentes</li>
                {review.overdue.length > 0 && <li>⚠️ {review.overdue.length} atrasadas</li>}
                {settings.creatorMode && <li>🎥 {review.published.length} conteúdos publicados</li>}
              </ul>
              <p className="mt-4 text-[13px] font-semibold tracking-[0.14em] text-muted">AMANHÃ</p>
              <p className="mt-1 text-[15px]">
                Você tem {review.tomorrowPriorities} {review.tomorrowPriorities === 1 ? "prioridade" : "prioridades"}
                {review.tomorrowEvents.length ? ` e ${review.tomorrowEvents.length} compromisso${review.tomorrowEvents.length > 1 ? "s" : ""}` : ""}. Quer que eu organize?
              </p>
              <Button variant="primary" size="sm" className="mt-4" onClick={() => router.push(`/aiva?q=${encodeURIComponent("Organize meu dia de amanhã")}`)}>
                <Sparkles className="h-4 w-4" /> Organizar amanhã
              </Button>
            </Card>
          )}

          {habitsToday.length > 0 && (
            <section>
              <SectionTitle title="Rotina de hoje" action={<Link href="/goals" className="text-[13px] text-muted hover:text-ink">Metas</Link>} />
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar lg:mx-0 lg:flex-wrap lg:px-0">
                {habitsToday.map((h) => {
                  const done = h.log.includes(ymd);
                  return (
                    <button
                      key={h.id}
                      onClick={() => update("habits", h.id, { log: done ? h.log.filter((d) => d !== ymd) : [...h.log, ymd].slice(-800) })}
                      className={cn("pressable flex h-11 shrink-0 items-center gap-2 rounded-2xl border px-3.5 text-sm", done ? "border-green/30 bg-green/10 text-green" : "border-line bg-surface text-muted")}
                    >
                      <span>{done ? "✓" : h.emoji ?? "○"}</span> {h.title}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {settings.creatorMode && (
            <section>
              <SectionTitle icon={<Clapperboard className="h-4 w-4 text-pink" />} title="Para publicar" count={toPublish.length} action={<Link href="/creator" className="text-[13px] text-muted hover:text-ink">Creator</Link>} />
              {toPublish.length ? (
                <div className="card divide-y divide-line p-1">
                  {toPublish.slice(0, 5).map((c) => (
                    <button key={c.id} onClick={() => setUI({ detail: { entity: "contents", id: c.id } })} className="flex w-full items-center gap-3 px-2.5 py-2.5 text-left">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px]">{c.title}</span>
                        <span className="block text-[12px] text-muted">{fmtWhen(c.scheduledAt, true, clock)} {c.platform ? `· ${c.platform}` : ""}</span>
                      </span>
                      <Badge tone={c.stage === "scheduled" ? "green" : "pink"}>{STAGE_LABEL[c.stage]}</Badge>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-line px-4 py-4 text-sm text-muted">Nada agendado esta semana. <Link className="text-ink underline-offset-4 hover:underline" href={`/aiva?q=${encodeURIComponent("Crie um calendário de conteúdo para os próximos 7 dias")}`}>Planejar com a AIVA</Link></p>
              )}
            </section>
          )}

          {projects.length > 0 && (
            <section>
              <SectionTitle icon={<FolderKanban className="h-4 w-4 text-violet" />} title="Projetos em movimento" />
              <div className="grid gap-2">
                {projects.map(({ p, total, done, open }) => (
                  <Link key={p.id} href={`/projects/${p.id}`} className="card flex items-center gap-3 p-3.5 hover:bg-surface-2">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-lg">{p.emoji ?? "📁"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px]">{p.name}</span>
                      <Progress value={total ? (done / total) * 100 : 0} className="mt-2" />
                    </span>
                    <span className="shrink-0 text-[12px] text-muted">{open} abertas</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {people.length > 0 && (
            <section>
              <SectionTitle icon={<Users className="h-4 w-4 text-cyan" />} title="Quem precisa de você" />
              <div className="card divide-y divide-line p-1">
                {people.map((c) => (
                  <button key={c.id} onClick={() => setUI({ detail: { entity: "clients", id: c.id } })} className="flex w-full items-center gap-3 px-2.5 py-2.5 text-left">
                    <Avatar name={c.name} size={32} color="#38d6f5" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px]">{c.name}</span>
                      <span className="block truncate text-[12px] text-muted">{c.company ?? (c.kind === "lead" ? "Lead" : "Cliente")} · follow-up</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </Page>
  );
}

function Section({ icon, title, items, empty, action }: { icon: React.ReactNode; title: string; items: ItemRef[]; empty?: string; action?: React.ReactNode }) {
  if (!items.length && !empty) return null;
  return (
    <section>
      <SectionTitle icon={icon} title={title} count={items.length} action={action} />
      {items.length ? (
        <div className="card p-1">
          {items.slice(0, 8).map((it) => (
            <ItemRow key={`${it.entity}:${it.id}`} item={it} />
          ))}
          {items.length > 8 && <p className="px-3 py-2 text-[12px] text-faint">+ {items.length - 8} itens</p>}
        </div>
      ) : (
        <p className="px-1 text-sm text-faint">{empty}</p>
      )}
    </section>
  );
}

function SuggestionCard({ s, onDismiss }: { s: ReturnType<typeof buildSuggestions>[number]; onDismiss: () => void }) {
  const router = useRouter();
  return (
    <div className={cn("flex animate-rise items-start gap-3 rounded-2xl border p-3.5", s.tone === "danger" ? "border-red/25 bg-red/6" : s.tone === "warn" ? "border-orange/25 bg-orange/6" : "border-violet/25 bg-violet/6")}>
      <Sparkles className={cn("mt-0.5 h-4 w-4 shrink-0", s.tone === "danger" ? "text-red" : s.tone === "warn" ? "text-orange" : "text-[#c4b1ff]")} />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">{s.text}</p>
        <button onClick={() => router.push(s.prompt ? `/aiva?q=${encodeURIComponent(s.prompt)}` : s.href ?? "/today")} className="mt-2 text-[13px] font-medium text-ink underline-offset-4 hover:underline">
          {s.cta} →
        </button>
      </div>
      <button onClick={onDismiss} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-faint hover:bg-surface-3 hover:text-ink" aria-label="Dispensar sugestão">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

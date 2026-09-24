"use client";

import { useState } from "react";
import { Target, Plus, Minus, Flame, Trash2, Check } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/PageHeader";
import { Button, EmptyState, Progress, Sheet, Field, Input, Select, Card, SectionTitle, Chip, Menu } from "@/components/ui";
import { useAiva, useList } from "@/store/aiva";
import { useClock } from "@/hooks/use-clock";
import { GOAL_HORIZON, GOAL_CATEGORY } from "@/lib/entities";
import type { Goal, Habit } from "@/lib/types";
import { cn } from "@/lib/cn";

const HORIZON: Record<string, string> = { day: "Hoje", week: "Semana", month: "Mês", quarter: "Trimestre", year: "Ano" };
const CATEGORY: Record<string, string> = { personal: "Pessoal", work: "Trabalho", content: "Conteúdo", finance: "Financeiro", health: "Saúde", learning: "Aprendizado", projects: "Projetos" };
const DOW = ["D", "S", "T", "Q", "Q", "S", "S"];

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function streak(h: Habit, now: Date) {
  let n = 0;
  const d = new Date(now);
  if (!h.log.includes(ymd(d))) d.setDate(d.getDate() - 1); // today not done yet doesn't break the streak
  while (h.log.includes(ymd(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function GoalsView() {
  const goals = useList("goals");
  const habits = useList("habits");
  const tasks = useList("tasks");
  const create = useAiva((s) => s.create);
  const update = useAiva((s) => s.update);
  const remove = useAiva((s) => s.remove);
  const { now } = useClock();
  const [horizon, setHorizon] = useState<string>("all");
  const [goalForm, setGoalForm] = useState<{ title: string; horizon: string; category: string; target: string; unit: string } | null>(null);
  const [habitTitle, setHabitTitle] = useState("");

  const active = goals.filter((g) => g.status === "active" && (horizon === "all" || g.horizon === horizon));
  const doneGoals = goals.filter((g) => g.status === "done");
  const days = Array.from({ length: 7 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + i));

  const progressOf = (g: Goal) => {
    const linked = tasks.filter((t) => t.goalId === g.id);
    if (g.target) return { pct: Math.min(100, (g.current / g.target) * 100), label: `${g.current.toLocaleString("pt-BR")} / ${g.target.toLocaleString("pt-BR")} ${g.unit ?? ""}` };
    if (linked.length) {
      const d = linked.filter((t) => t.status === "done").length;
      return { pct: (d / linked.length) * 100, label: `${d}/${linked.length} tarefas` };
    }
    return { pct: 0, label: "Sem medida — adicione um alvo ou tarefas" };
  };

  const saveGoal = async () => {
    if (!goalForm?.title.trim()) return;
    await create("goals", { title: goalForm.title.trim(), horizon: goalForm.horizon as "month", category: goalForm.category as "personal", target: goalForm.target ? Number(goalForm.target) : null, unit: goalForm.unit || null }, { silent: true });
    setGoalForm(null);
  };

  const addHabit = async () => {
    if (!habitTitle.trim()) return;
    await create("habits", { title: habitTitle.trim() }, { silent: true });
    setHabitTitle("");
  };

  return (
    <Page wide>
      <PageHeader title="Metas & Rotina" subtitle="Life OS: objetivos, hábitos e o que te move." actions={<Button variant="primary" size="sm" onClick={() => setGoalForm({ title: "", horizon: "month", category: "personal", target: "", unit: "" })}><Plus className="h-4 w-4" /> <span className="hidden sm:inline">Meta</span></Button>} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section>
          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
            <Chip active={horizon === "all"} onClick={() => setHorizon("all")}>Todas</Chip>
            {GOAL_HORIZON.map((h) => <Chip key={h} active={horizon === h} onClick={() => setHorizon(h)}>{HORIZON[h]}</Chip>)}
          </div>
          {active.length === 0 ? (
            <EmptyState icon={<Target className="h-5 w-5" />} title="Nenhuma meta ativa" text="Diga “meta: juntar 5 mil até dezembro” para a AIVA, ou crie aqui. Metas se conectam a tarefas e projetos." />
          ) : (
            <div className="grid gap-3">
              {active.map((g) => {
                const p = progressOf(g);
                return (
                  <Card key={g.id} className="grid gap-3">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] text-muted">{HORIZON[g.horizon]} · {CATEGORY[g.category]}</p>
                        <p className="font-medium">{g.title}</p>
                      </div>
                      <Menu
                        trigger={<button className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:bg-surface-2" aria-label="Ações">⋯</button>}
                        items={[
                          { label: "Concluir meta", icon: <Check className="h-4 w-4" />, onClick: () => update("goals", g.id, { status: "done" }) },
                          { label: "Excluir", icon: <Trash2 className="h-4 w-4" />, danger: true, onClick: () => remove("goals", g.id, { label: "Meta" }) },
                        ]}
                      />
                    </div>
                    <Progress value={p.pct} tone={p.pct >= 100 ? "green" : "grad"} />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] text-muted">{p.label}</span>
                      {g.target != null && (
                        <span className="flex gap-1">
                          <button onClick={() => update("goals", g.id, { current: Math.max(0, g.current - 1) })} className="pressable grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-muted" aria-label="Diminuir"><Minus className="h-4 w-4" /></button>
                          <button onClick={() => update("goals", g.id, { current: g.current + 1 })} className="pressable grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-muted" aria-label="Aumentar"><Plus className="h-4 w-4" /></button>
                          <input type="number" inputMode="decimal" defaultValue={g.current} key={g.current} onBlur={(e) => Number(e.target.value) !== g.current && update("goals", g.id, { current: Number(e.target.value) || 0 })} className="h-9 w-20 rounded-xl border border-line bg-surface px-2 text-sm outline-none" aria-label="Progresso atual" />
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          {doneGoals.length > 0 && <p className="mt-4 text-[13px] text-muted">🏆 {doneGoals.length} meta{doneGoals.length > 1 ? "s" : ""} concluída{doneGoals.length > 1 ? "s" : ""}</p>}
        </section>

        <section>
          <SectionTitle icon={<Flame className="h-4 w-4 text-orange" />} title="Hábitos" />
          <Card className="p-0">
            <div className="grid grid-cols-[minmax(0,1fr)_repeat(7,32px)] items-center gap-1 border-b border-line px-3 py-2 text-center text-[10px] text-faint">
              <span />
              {days.map((d) => <span key={d.toISOString()} className={cn(ymd(d) === ymd(now) && "font-semibold text-ink")}>{DOW[d.getDay()]}<br />{d.getDate()}</span>)}
            </div>
            {habits.filter((h) => !h.archived).map((h) => (
              <div key={h.id} className="grid grid-cols-[minmax(0,1fr)_repeat(7,32px)] items-center gap-1 border-b border-line px-3 py-2 last:border-0">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm">{h.emoji ? `${h.emoji} ` : ""}{h.title}</span>
                  {streak(h, now) > 1 && <span className="shrink-0 text-[11px] text-orange">🔥{streak(h, now)}</span>}
                  <button onClick={() => remove("habits", h.id, { label: "Hábito" })} className="ml-auto hidden h-6 w-6 shrink-0 place-items-center rounded text-faint hover:text-red sm:grid" aria-label={`Excluir ${h.title}`}><Trash2 className="h-3 w-3" /></button>
                </span>
                {days.map((d) => {
                  const key = ymd(d);
                  const done = h.log.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => update("habits", h.id, { log: done ? h.log.filter((x) => x !== key) : [...h.log, key].slice(-800) })}
                      className={cn("pressable grid h-8 w-8 place-items-center rounded-lg", done ? "grad text-white" : "bg-surface-2 text-transparent hover:text-faint")}
                      aria-label={`${h.title} em ${d.toLocaleDateString("pt-BR")}: ${done ? "feito" : "não feito"}`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="flex items-center gap-2 p-2">
              <Input value={habitTitle} onChange={(e) => setHabitTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addHabit()} placeholder="Novo hábito…" className="h-10" />
              <Button size="sm" onClick={addHabit} disabled={!habitTitle.trim()}>Adicionar</Button>
            </div>
          </Card>
        </section>
      </div>

      <Sheet open={!!goalForm} onClose={() => setGoalForm(null)} title="Nova meta" size="sm" footer={<Button variant="primary" className="w-full" onClick={saveGoal} disabled={!goalForm?.title.trim()}>Criar meta</Button>}>
        {goalForm && (
          <div className="grid gap-4">
            <Field label="Objetivo"><Input value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} placeholder="Ex.: Chegar a 10 mil seguidores" data-autofocus /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Horizonte">
                <Select value={goalForm.horizon} onChange={(e) => setGoalForm({ ...goalForm, horizon: e.target.value })}>{GOAL_HORIZON.map((h) => <option key={h} value={h}>{HORIZON[h]}</option>)}</Select>
              </Field>
              <Field label="Área">
                <Select value={goalForm.category} onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}>{GOAL_CATEGORY.map((c) => <option key={c} value={c}>{CATEGORY[c]}</option>)}</Select>
              </Field>
              <Field label="Alvo (opcional)"><Input type="number" inputMode="decimal" value={goalForm.target} onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value })} placeholder="10000" /></Field>
              <Field label="Unidade"><Input value={goalForm.unit} onChange={(e) => setGoalForm({ ...goalForm, unit: e.target.value })} placeholder="seguidores" /></Field>
            </div>
          </div>
        )}
      </Sheet>
    </Page>
  );
}

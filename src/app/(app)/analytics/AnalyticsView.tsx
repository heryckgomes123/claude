"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Page, PageHeader } from "@/components/shell/PageHeader";
import { Card, SectionTitle } from "@/components/ui";
import { StatTile, BarChart, RankBars } from "@/components/charts";
import { useSnapshot, useSettings } from "@/hooks/use-snapshot";
import { useClock } from "@/hooks/use-clock";
import { financeSummary, isOverdue, brl } from "@/lib/intelligence";

/** Productivity analytics — only what helps decide, computed from real activity. */
export function AnalyticsView() {
  const s = useSnapshot();
  const settings = useSettings();
  const clock = useClock();
  const now = clock.now;

  const daily = useMemo(() => {
    const out: { label: string; value: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const e = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      out.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, value: s.tasks.filter((t) => t.completedAt && new Date(t.completedAt) >= d && new Date(t.completedAt) < e).length });
    }
    return out;
  }, [s.tasks, now]);

  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();
  const doneWeek = s.tasks.filter((t) => t.completedAt && new Date(t.completedAt).getTime() >= weekStart);
  const createdWeek = s.tasks.filter((t) => new Date(t.createdAt).getTime() >= weekStart);
  const dueWeek = s.tasks.filter((t) => t.dueAt && new Date(t.dueAt).getTime() >= weekStart && new Date(t.dueAt).getTime() < now.getTime());
  const onTime = dueWeek.filter((t) => t.completedAt && new Date(t.completedAt) <= new Date(new Date(t.dueAt!).getTime() + 86_400_000)).length;
  const overdue = s.tasks.filter((t) => isOverdue(t, clock)).length;

  const byCategory = Object.entries(
    doneWeek.reduce<Record<string, number>>((acc, t) => {
      const k = t.category ?? "Sem categoria";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const byHour = useMemo(() => {
    const blocks = [
      { label: "Manhã", from: 5, to: 12 },
      { label: "Tarde", from: 12, to: 18 },
      { label: "Noite", from: 18, to: 24 },
      { label: "Madrugada", from: 0, to: 5 },
    ];
    return blocks.map((b) => ({ label: b.label, value: s.tasks.filter((t) => t.completedAt && new Date(t.completedAt).getHours() >= b.from && new Date(t.completedAt).getHours() < b.to).length }));
  }, [s.tasks]);
  const bestPeriod = [...byHour].sort((a, b) => b.value - a.value)[0];

  const habitsRate = (() => {
    const active = s.habits.filter((h) => !h.archived);
    if (!active.length) return null;
    let total = 0;
    let done = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      for (const h of active) {
        if (!h.daysOfWeek.includes(d.getDay())) continue;
        total++;
        if (h.log.includes(key)) done++;
      }
    }
    return total ? Math.round((done / total) * 100) : null;
  })();

  const f = financeSummary(s, clock);

  return (
    <Page wide>
      <PageHeader title="Analytics" subtitle="Últimos 7 dias, sem métricas inúteis." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Tarefas concluídas" value={doneWeek.length} hint={`${createdWeek.length} criadas na semana`} />
        <StatTile label="No prazo" value={dueWeek.length ? `${Math.round((onTime / dueWeek.length) * 100)}%` : "—"} hint={`${onTime}/${dueWeek.length} com prazo`} />
        <StatTile label="Atrasadas agora" value={overdue} tone={overdue ? "red" : "default"} />
        <StatTile label="Hábitos cumpridos" value={habitsRate != null ? `${habitsRate}%` : "—"} hint="últimos 7 dias" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Concluídas por dia" />
          <BarChart title="Tarefas concluídas por dia" data={daily} />
        </Card>
        <Card className="p-5">
          <SectionTitle title="Quando você mais conclui" />
          <RankBars data={byHour} />
          {bestPeriod && bestPeriod.value > 0 && (
            <p className="mt-4 text-[13px] text-muted">
              Você rende mais à <strong className="text-ink">{bestPeriod.label.toLowerCase()}</strong>
              {settings.peakTime ? " — use esse período para o que exige foco." : "."}
            </p>
          )}
        </Card>
        <Card className="p-5">
          <SectionTitle title="Onde foi sua energia (semana)" />
          {byCategory.length ? <RankBars data={byCategory} /> : <p className="text-sm text-faint">Conclua tarefas para ver a distribuição.</p>}
        </Card>
        <Card className="grid content-start gap-3 p-5">
          <SectionTitle title="Dinheiro do mês" className="mb-0" />
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Recebido" value={brl(f.received)} tone="green" />
            <StatTile label="A receber" value={brl(f.receivable)} />
          </div>
          <Link href="/finance" className="text-[13px] text-muted hover:text-ink">Abrir financeiro →</Link>
          {settings.creatorMode && <Link href="/creator?tab=analytics" className="text-[13px] text-muted hover:text-ink">Ver Creator Analytics →</Link>}
        </Card>
      </div>
    </Page>
  );
}

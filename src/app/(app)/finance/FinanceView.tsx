"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, Check } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/PageHeader";
import { Button, Chip, EmptyState, Badge, Sheet, Field, Input, Select, Card, SectionTitle, Segmented } from "@/components/ui";
import { StatTile, BarChart } from "@/components/charts";
import { DeleteButton } from "@/components/detail/common";
import { useAiva, useList } from "@/store/aiva";
import { useClock } from "@/hooks/use-clock";
import { useSnapshot } from "@/hooks/use-snapshot";
import { financeSummary, brl, fmtDay } from "@/lib/intelligence";
import { TX_CATEGORY } from "@/lib/entities";
import type { Transaction } from "@/lib/types";
import { toLocalInput, fromLocalInput } from "@/components/detail/fields";
import { cn } from "@/lib/cn";

const CAT_LABEL: Record<string, string> = { campaign: "Campanha", publi: "Publi", product: "Produto", service: "Serviço", affiliate: "Afiliado", tools: "Ferramentas", team: "Equipe", taxes: "Impostos", personal: "Pessoal", other: "Outros" };

type Form = { id?: string; kind: "income" | "expense"; title: string; amount: string; category: string; status: "pending" | "done"; dueAt: string; projectId: string };
const EMPTY: Form = { kind: "income", title: "", amount: "", category: "other", status: "done", dueAt: "", projectId: "" };

export function FinanceView() {
  const snap = useSnapshot();
  const txs = useList("transactions");
  const projects = useList("projects");
  const create = useAiva((s) => s.create);
  const update = useAiva((s) => s.update);
  const remove = useAiva((s) => s.remove);
  const clock = useClock();
  const [filter, setFilter] = useState<"all" | "income" | "expense" | "pending">("all");
  const params = useSearchParams();
  const [form, setForm] = useState<Form | null>(() => (params.get("project") ? { ...EMPTY, projectId: params.get("project")! } : null));
  const s = useMemo(() => financeSummary(snap, clock), [snap, clock]);


  const list = txs
    .filter((t) => (filter === "all" ? true : filter === "pending" ? t.status === "pending" : t.kind === filter))
    .sort((a, b) => (b.paidAt ?? b.dueAt ?? b.createdAt).localeCompare(a.paidAt ?? a.dueAt ?? a.createdAt));

  const months = useMemo(() => {
    const out: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(clock.now.getFullYear(), clock.now.getMonth() - i, 1);
      const end = new Date(clock.now.getFullYear(), clock.now.getMonth() - i + 1, 1);
      const v = txs.filter((t) => t.kind === "income" && t.status === "done" && t.paidAt && new Date(t.paidAt) >= start && new Date(t.paidAt) < end).reduce((a, t) => a + t.amount, 0);
      out.push({ label: start.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), value: v });
    }
    return out;
  }, [txs, clock.now]);

  const edit = (t: Transaction) => setForm({ id: t.id, kind: t.kind as Form["kind"], title: t.title, amount: String(t.amount), category: t.category, status: t.status as Form["status"], dueAt: toLocalInput(t.dueAt, false), projectId: t.projectId ?? "" });

  const submit = async () => {
    if (!form || !form.title.trim() || !Number(form.amount)) return;
    const data = { kind: form.kind, title: form.title.trim(), amount: Math.abs(Number(form.amount)), category: form.category as "other", status: form.status, dueAt: fromLocalInput(form.dueAt, false), projectId: form.projectId || null };
    if (form.id) await update("transactions", form.id, data);
    else await create("transactions", data, { silent: true });
    setForm(null);
  };

  return (
    <Page wide>
      <PageHeader title="Financeiro" subtitle={clock.now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} actions={<Button variant="primary" size="sm" onClick={() => setForm(EMPTY)}><Plus className="h-4 w-4" /> <span className="hidden sm:inline">Lançamento</span></Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Receita prevista" value={brl(s.expected)} hint="no mês" />
        <StatTile label="Recebido" value={brl(s.received)} tone="green" />
        <StatTile label="A receber" value={brl(s.receivable)} hint="total pendente" />
        <StatTile label="Despesas" value={brl(s.expenses)} tone={s.expenses ? "red" : "default"} />
        <StatTile label="Resultado" value={brl(s.result)} tone={s.result >= 0 ? "green" : "red"} hint="recebido − pago" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section>
          <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
            {[["all", "Tudo"], ["income", "Receitas"], ["expense", "Despesas"], ["pending", "Pendentes"]].map(([v, l]) => (
              <Chip key={v} active={filter === v} onClick={() => setFilter(v as typeof filter)}>{l}</Chip>
            ))}
          </div>
          {list.length === 0 ? (
            <EmptyState icon={<Wallet className="h-5 w-5" />} title="Nenhum lançamento" text="Diga “recebi 2 mil da marca X” ou “gastei 50 com uber” para a AIVA — ou adicione aqui." />
          ) : (
            <div className="card divide-y divide-line p-1">
              {list.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-3 py-3">
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", t.kind === "income" ? "bg-green/12 text-green" : "bg-red/12 text-red")}>
                    {t.kind === "income" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </span>
                  <button onClick={() => edit(t)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[15px]">{t.title}</span>
                    <span className="block truncate text-[12px] text-muted">{CAT_LABEL[t.category] ?? t.category} · {t.status === "done" ? `pago ${fmtDay(t.paidAt ?? t.createdAt, clock)}` : t.dueAt ? `vence ${fmtDay(t.dueAt, clock)}` : "pendente"}</span>
                  </button>
                  <span className={cn("shrink-0 text-[15px] font-medium tabular-nums", t.kind === "income" ? "text-green" : "text-ink")}>{t.kind === "expense" ? "−" : "+"}{brl(t.amount)}</span>
                  {t.status === "pending" ? (
                    <button onClick={() => update("transactions", t.id, { status: "done" })} className="pressable grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted hover:text-green" aria-label="Marcar como pago" title={t.kind === "income" ? "Recebido" : "Pago"}>
                      <Check className="h-4 w-4" />
                    </button>
                  ) : (
                    <Badge tone="green" className="hidden sm:inline-flex">ok</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
        <Card className="h-fit p-5">
          <SectionTitle title="Recebido por mês" />
          <BarChart title="Receita recebida por mês" data={months} format={(v) => brl(v)} />
        </Card>
      </div>

      <Sheet
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Editar lançamento" : "Novo lançamento"}
        size="sm"
        footer={
          <div className="flex items-center justify-between gap-2">
            {form?.id ? <DeleteButton onDelete={() => { remove("transactions", form.id!, { label: "Lançamento" }); setForm(null); }} /> : <span />}
            <Button variant="primary" onClick={submit} disabled={!form?.title.trim() || !Number(form?.amount)}>Salvar</Button>
          </div>
        }
      >
        {form && (
          <div className="grid gap-4">
            <Segmented value={form.kind} onChange={(kind) => setForm({ ...form, kind })} options={[{ value: "income", label: "Receita" }, { value: "expense", label: "Despesa" }]} className="w-full [&>button]:flex-1" />
            <Field label="Descrição"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-autofocus /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor (R$)"><Input type="number" inputMode="decimal" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
              <Field label="Categoria">
                <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {TX_CATEGORY.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Form["status"] })}>
                  <option value="done">{form.kind === "income" ? "Recebido" : "Pago"}</option>
                  <option value="pending">{form.kind === "income" ? "A receber" : "A pagar"}</option>
                </Select>
              </Field>
              <Field label="Vencimento"><Input type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} className="[color-scheme:dark]" /></Field>
            </div>
            <Field label="Projeto">
              <Select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                <option value="">Nenhum</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
          </div>
        )}
      </Sheet>
    </Page>
  );
}

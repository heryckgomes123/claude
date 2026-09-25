import { ArrowDownLeft, ArrowUpRight, Banknote, History, MinusCircle, PiggyBank, PlusCircle, Vault } from "lucide-react";
import Link from "next/link";
import { CashTransactionButton, CloseCashButton, OpenCashForm } from "@/components/cash/cash-controls";
import { EmptyState } from "@/components/shared/empty-state";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CASH_TRANSACTION_LABELS, PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/config/domain";
import { requirePagePermission } from "@/lib/auth/session";
import { getCurrentCash, listClosedRegisters } from "@/services/cash";
import { formatDateTime, formatTime } from "@/utils/dates";
import { formatMoney } from "@/utils/money";
import { cn } from "@/utils/cn";

export const metadata = { title: "Caixa" };

const TYPE_TONE = { INCOME: "sage", EXPENSE: "danger", WITHDRAWAL: "bronze", DEPOSIT: "teal" } as const;

export default async function CashPage() {
  const user = await requirePagePermission("cash.view");
  const [current, history] = await Promise.all([getCurrentCash(user), listClosedRegisters(user)]);

  return (
    <>
      <PageHeader
        eyebrow="Financeiro"
        title="Caixa"
        description={
          current
            ? `Aberto às ${formatTime(current.register.openedAt)} por ${current.register.openedByName ?? "—"}.`
            : "Abra o caixa para começar o dia."
        }
        actions={
          current && (
            <>
              <CashTransactionButton />
              <CloseCashButton expectedCents={current.summary.expectedCashCents} />
            </>
          )
        }
      />

      {!current ? (
        <Card className="surface-grain overflow-hidden">
          <CardContent className="flex flex-col gap-6 py-8 sm:flex-row sm:items-center">
            <span className="grid size-16 shrink-0 place-items-center rounded-3xl bg-charcoal text-terracotta-300 shadow-lifted">
              <Vault className="size-7" aria-hidden />
            </span>
            <div className="flex-1">
              <h2 className="font-display text-3xl font-semibold">Caixa fechado</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Informe o troco inicial da gaveta. Pagamentos só podem ser registrados com o caixa aberto.
              </p>
              <div className="mt-5">
                <OpenCashForm />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <section aria-label="Resumo do caixa" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
            <MetricCard label="Saldo inicial" value={formatMoney(current.summary.openingBalanceCents)} icon={PiggyBank} tone="bronze" />
            <MetricCard
              label="Entradas"
              value={formatMoney(current.summary.incomeCents)}
              icon={ArrowDownLeft}
              tone="sage"
              hint="todas as formas"
            />
            <MetricCard label="Saídas" value={formatMoney(current.summary.expenseCents)} icon={ArrowUpRight} tone="terracotta" />
            <MetricCard label="Sangrias" value={formatMoney(current.summary.withdrawalCents)} icon={MinusCircle} tone="plum" />
            <MetricCard label="Suprimentos" value={formatMoney(current.summary.depositCents)} icon={PlusCircle} tone="bronze" />
            <MetricCard
              label="Saldo esperado"
              value={formatMoney(current.summary.expectedCashCents)}
              icon={Banknote}
              tone="dark"
              hint="dinheiro na gaveta"
            />
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_2fr]">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Entradas por forma de pagamento</CardTitle>
                  <CardDescription>Para conferência de Pix e maquininha.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                    <li key={m} className="flex justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm">
                      <span>{PAYMENT_METHOD_LABELS[m]}</span>
                      <span className="tabular font-bold">{formatMoney(current.summary.incomeByMethod[m] ?? 0)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Saldo esperado = saldo inicial + entradas em dinheiro + suprimentos − saídas em dinheiro − sangrias.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Movimentações</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-2">
                {current.transactions.length === 0 ? (
                  <div className="px-5 pb-4">
                    <EmptyState compact title="Nenhuma movimentação ainda" description="Pagamentos e lançamentos aparecerão aqui." />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Forma</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {current.transactions.map((t) => {
                        const outflow = t.type === "EXPENSE" || t.type === "WITHDRAWAL";
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="tabular text-muted-foreground">{formatTime(t.createdAt)}</TableCell>
                            <TableCell>
                              <Badge tone={TYPE_TONE[t.type]}>{CASH_TRANSACTION_LABELS[t.type]}</Badge>
                            </TableCell>
                            <TableCell className="max-w-64 truncate">
                              {t.description}
                              <span className="block text-xs text-muted-foreground">{t.createdByName}</span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{PAYMENT_METHOD_LABELS[t.method]}</TableCell>
                            <TableCell className={cn("tabular text-right font-bold", outflow ? "text-destructive" : "text-sage-700")}>
                              {outflow ? "−" : "+"} {formatMoney(t.amountCents)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-bronze-500" aria-hidden /> Caixas fechados
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {history.length === 0 ? (
            <p className="px-5 pb-4 text-sm text-muted-foreground">Nenhum fechamento registrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Abertura</TableHead>
                  <TableHead>Fechamento</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Contado</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="tabular whitespace-nowrap">{formatDateTime(r.openedAt)}</TableCell>
                    <TableCell className="tabular whitespace-nowrap text-muted-foreground">
                      {r.closedAt ? formatDateTime(r.closedAt) : "—"}
                    </TableCell>
                    <TableCell className="tabular text-right">{formatMoney(r.incomeCents)}</TableCell>
                    <TableCell className="tabular text-right">{formatMoney(r.expectedBalanceCents)}</TableCell>
                    <TableCell className="tabular text-right">{formatMoney(r.countedBalanceCents)}</TableCell>
                    <TableCell
                      className={cn("tabular text-right font-bold", (r.differenceCents ?? 0) === 0 ? "text-sage-700" : "text-destructive")}
                    >
                      {formatMoney(r.differenceCents)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.closedByName ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {!current && (
        <p className="mt-4 text-xs text-muted-foreground">
          Dica: após abrir o caixa, finalize atendimentos em{" "}
          <Link href="/painel/atendimentos" className="font-semibold text-primary">
            Atendimento
          </Link>{" "}
          para registrar pagamentos.
        </p>
      )}
    </>
  );
}

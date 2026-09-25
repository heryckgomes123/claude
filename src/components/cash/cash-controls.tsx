"use client";

import { ArrowDownLeft, ArrowUpRight, Lock, LockOpen, MinusCircle, PlusCircle } from "lucide-react";
import { useState } from "react";
import { cashTransactionAction, closeCashAction, openCashAction } from "@/actions/cash";
import { useCan } from "@/components/layout/app-context";
import { FormField } from "@/components/shared/form-field";
import { MoneyInput } from "@/components/shared/money-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import {
  CASH_TRANSACTION_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type CashTransactionType,
  type PaymentMethod,
} from "@/config/domain";
import { useServerAction } from "@/hooks/use-server-action";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/money";

export function OpenCashForm() {
  const can = useCan();
  const [amount, setAmount] = useState<number | null>(20000);
  const { pending, run, fieldError } = useServerAction();
  if (!can("cash.manage")) return <p className="text-sm text-muted-foreground">Você não tem permissão para abrir o caixa.</p>;
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => openCashAction({ openingBalanceCents: amount ?? -1 }), { success: "Caixa aberto. Bom trabalho!" });
      }}
    >
      <FormField id="opening" label="Saldo inicial (troco na gaveta)" error={fieldError("openingBalanceCents")} className="sm:w-64">
        <MoneyInput id="opening" value={amount} onChange={setAmount} />
      </FormField>
      <Button type="submit" size="lg" loading={pending}>
        <LockOpen /> Abrir caixa
      </Button>
    </form>
  );
}

const TYPE_META: Record<CashTransactionType, { icon: typeof PlusCircle; tone: string; hint: string }> = {
  INCOME: { icon: ArrowDownLeft, tone: "text-sage-700", hint: "Recebimento avulso (ex.: venda de produto)" },
  EXPENSE: { icon: ArrowUpRight, tone: "text-destructive", hint: "Despesa paga com o caixa" },
  WITHDRAWAL: { icon: MinusCircle, tone: "text-bronze-700", hint: "Retirada de dinheiro da gaveta" },
  DEPOSIT: { icon: PlusCircle, tone: "text-teal-soft-700", hint: "Reforço de troco na gaveta" },
};

export function CashTransactionButton() {
  const can = useCan();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CashTransactionType>("EXPENSE");
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [description, setDescription] = useState("");
  const { pending, run, fieldError, setFieldErrors } = useServerAction();
  if (!can("cash.manage")) return null;
  const drawerOnly = type === "WITHDRAWAL" || type === "DEPOSIT";

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setAmount(null);
          setDescription("");
          setFieldErrors({});
          setOpen(true);
        }}
      >
        <PlusCircle /> Movimentação
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form
            className="flex min-h-0 flex-1 flex-col"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              run(() => cashTransactionAction({ type, amountCents: amount ?? 0, method: drawerOnly ? "CASH" : method, description }), {
                success: `${CASH_TRANSACTION_LABELS[type]} registrada.`,
                onSuccess: () => setOpen(false),
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Nova movimentação</DialogTitle>
              <DialogDescription>Pagamentos de atendimentos entram automaticamente.</DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4 pb-5">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de movimentação">
                {(Object.keys(TYPE_META) as CashTransactionType[]).map((t) => {
                  const Icon = TYPE_META[t].icon;
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={type === t}
                      onClick={() => setType(t)}
                      className={cn(
                        "flex items-start gap-2 rounded-2xl border p-3 text-left transition",
                        type === t ? "border-primary bg-terracotta-50 ring-2 ring-terracotta-100" : "border-border hover:border-bronze-200",
                      )}
                    >
                      <Icon className={cn("mt-0.5 size-4 shrink-0", TYPE_META[t].tone)} aria-hidden />
                      <span>
                        <span className="block text-sm font-semibold">{CASH_TRANSACTION_LABELS[t]}</span>
                        <span className="block text-[0.7rem] text-muted-foreground">{TYPE_META[t].hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="tx-amount" label="Valor" required error={fieldError("amountCents")}>
                  <MoneyInput id="tx-amount" value={amount} onChange={setAmount} autoFocus />
                </FormField>
                <FormField id="tx-method" label="Forma">
                  <NativeSelect
                    id="tx-method"
                    value={drawerOnly ? "CASH" : method}
                    disabled={drawerOnly}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {PAYMENT_METHOD_LABELS[m]}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
              </div>
              <FormField id="tx-desc" label="Descrição" required error={fieldError("description")}>
                <Input
                  id="tx-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={200}
                  placeholder="Ex.: compra de café, depósito no banco"
                />
              </FormField>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={pending}>
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CloseCashButton({ expectedCents }: { expectedCents: number }) {
  const can = useCan();
  const [open, setOpen] = useState(false);
  const [counted, setCounted] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const { pending, run, fieldError } = useServerAction();
  if (!can("cash.manage")) return null;
  const difference = counted == null ? null : counted - expectedCents;

  return (
    <>
      <Button
        variant="dark"
        onClick={() => {
          setCounted(null);
          setNotes("");
          setOpen(true);
        }}
      >
        <Lock /> Fechar caixa
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Fechar caixa</DialogTitle>
            <DialogDescription>Conte o dinheiro da gaveta e informe o valor.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4 pb-5">
            <div className="flex justify-between rounded-2xl bg-muted p-4">
              <span className="text-sm text-muted-foreground">Saldo esperado (dinheiro)</span>
              <span className="tabular font-bold">{formatMoney(expectedCents)}</span>
            </div>
            <FormField id="counted" label="Saldo contado" required error={fieldError("countedBalanceCents")}>
              <MoneyInput id="counted" value={counted} onChange={setCounted} autoFocus />
            </FormField>
            {difference !== null && (
              <p
                className={cn(
                  "rounded-xl p-3 text-sm font-semibold",
                  difference === 0 ? "bg-sage-100 text-sage-700" : "bg-bronze-50 text-bronze-700",
                )}
                aria-live="polite"
              >
                {difference === 0
                  ? "Caixa conferido — sem diferença."
                  : `Diferença de ${formatMoney(difference)} (${difference > 0 ? "sobra" : "falta"}).`}
              </p>
            )}
            <FormField id="close-notes" label="Observações">
              <Textarea id="close-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} className="min-h-16" />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="dark"
              loading={pending}
              disabled={counted == null}
              onClick={() =>
                run(() => closeCashAction({ countedBalanceCents: counted ?? 0, notes }), {
                  success: (r) =>
                    `Caixa fechado. Esperado ${formatMoney(r.expectedCents)} · contado ${formatMoney(r.countedCents)} · diferença ${formatMoney(r.differenceCents)}.`,
                  onSuccess: () => setOpen(false),
                })
              }
            >
              <Lock /> Confirmar fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { Banknote, CreditCard, QrCode, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { registerPaymentAction } from "@/actions/attendance";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/config/domain";
import { useServerAction } from "@/hooks/use-server-action";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/money";

const METHODS: { value: PaymentMethod; icon: typeof QrCode }[] = [
  { value: "PIX", icon: QrCode },
  { value: "CASH", icon: Banknote },
  { value: "DEBIT", icon: CreditCard },
  { value: "CREDIT", icon: CreditCard },
  { value: "CREDIT_INSTALLMENTS", icon: Wallet },
];

/** Registro de pagamento: valores vêm do servidor; aqui só se escolhe a forma. */
export function PaymentDialog({
  open,
  onOpenChange,
  attendanceId,
  subtotalCents,
  discountCents,
  totalCents,
  cashOpen,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  attendanceId: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  cashOpen: boolean;
}) {
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [installments, setInstallments] = useState(2);
  const { pending, run } = useServerAction();

  function confirm() {
    run(
      () =>
        registerPaymentAction({
          attendanceId,
          method,
          installments: method === "CREDIT_INSTALLMENTS" ? installments : 1,
        }),
      {
        success: (r) => `Pagamento de ${formatMoney(r.amountCents)} registrado. Comissão: ${formatMoney(r.commissionCents)}.`,
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription>O valor entra no caixa e a comissão é calculada automaticamente.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5 pb-5">
          <div className="rounded-2xl bg-charcoal p-4 text-cream">
            <div className="flex justify-between text-sm text-stone-400">
              <span>Valor bruto</span>
              <span className="tabular">{formatMoney(subtotalCents)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm text-stone-400">
              <span>Desconto</span>
              <span className="tabular">− {formatMoney(discountCents)}</span>
            </div>
            <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-3">
              <span className="text-sm font-semibold">Valor final</span>
              <span className="tabular text-3xl font-extrabold text-terracotta-200">{formatMoney(totalCents)}</span>
            </div>
          </div>

          {!cashOpen && (
            <div role="alert" className="rounded-xl border border-bronze-200 bg-bronze-50 p-3 text-sm text-bronze-700">
              O caixa está fechado.{" "}
              <Link href="/painel/caixa" className="font-semibold underline">
                Abra o caixa
              </Link>{" "}
              para registrar pagamentos.
            </div>
          )}

          <fieldset>
            <legend className="mb-2 text-[0.8rem] font-semibold">Forma de pagamento</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Forma de pagamento">
              {METHODS.map(({ value, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={method === value}
                  onClick={() => setMethod(value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-sm font-semibold transition",
                    method === value
                      ? "border-primary bg-terracotta-50 text-terracotta-700 ring-2 ring-terracotta-100"
                      : "border-border hover:border-bronze-200",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {PAYMENT_METHOD_LABELS[value]}
                </button>
              ))}
            </div>
          </fieldset>
          {method === "CREDIT_INSTALLMENTS" && (
            <div className="space-y-1.5 animate-fade-in">
              <Label htmlFor="installments">Parcelas</Label>
              <NativeSelect id="installments" value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                  <option key={n} value={n}>
                    {n}x de {formatMoney(Math.round(totalCents / n))}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button onClick={confirm} loading={pending} disabled={!cashOpen}>
            Confirmar {formatMoney(totalCents)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

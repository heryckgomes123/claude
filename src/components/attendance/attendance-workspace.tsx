"use client";

import { CheckCircle2, Minus, Plus, RotateCcw, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import {
  addItemAction,
  finishAttendanceAction,
  reopenAttendanceAction,
  removeItemAction,
  setDiscountAction,
  updateItemAction,
} from "@/actions/attendance";
import { useApp, useCan } from "@/components/layout/app-context";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { MoneyInput } from "@/components/shared/money-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/input";
import type { AttendanceStatus } from "@/config/domain";
import { useServerAction } from "@/hooks/use-server-action";
import { formatMoney, formatPercent } from "@/utils/money";
import { firstName } from "@/utils/text";
import { PaymentDialog } from "./payment-dialog";

export type WorkspaceItem = {
  id: string;
  serviceName: string;
  professionalName: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  commissionRate: number;
  durationMinutes: number;
};

type Props = {
  attendanceId: string;
  status: AttendanceStatus;
  professionalId: string;
  items: WorkspaceItem[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  showCommission: boolean;
};

/** Tela operacional do atendimento: serviços, quantidades, desconto, finalização e pagamento. */
export function AttendanceWorkspace(props: Props) {
  const { services, professionals, business } = useApp();
  const can = useCan();
  const editable = props.status === "IN_PROGRESS";
  const [serviceId, setServiceId] = useState("");
  const [itemProfessional, setItemProfessional] = useState(props.professionalId);
  const [discount, setDiscount] = useState<number | null>(props.discountCents);
  const [paying, setPaying] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const action = useServerAction();

  const eligibleServices = services.filter((s) => s.professionalIds.includes(itemProfessional));
  const canPickProfessional = can("attendance.view_all");

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Serviços do atendimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="divide-y divide-border/60 rounded-2xl border border-border">
            {props.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{item.serviceName}</p>
                  <p className="text-xs text-muted-foreground">
                    {firstName(item.professionalName)} · {formatMoney(item.unitPriceCents)}
                    {props.showCommission && ` · comissão ${formatPercent(item.commissionRate)}`}
                  </p>
                </div>
                {!editable ? (
                  <span className="tabular text-sm text-muted-foreground">{item.quantity}×</span>
                ) : (
                  <div className="flex items-center gap-1.5" aria-label={`Quantidade de ${item.serviceName}`}>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Diminuir quantidade"
                      disabled={!editable || item.quantity <= 1 || action.pending}
                      onClick={() => action.run(() => updateItemAction({ itemId: item.id, quantity: item.quantity - 1 }))}
                    >
                      <Minus />
                    </Button>
                    <span className="tabular w-6 text-center font-bold">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Aumentar quantidade"
                      disabled={!editable || item.quantity >= 20 || action.pending}
                      onClick={() => action.run(() => updateItemAction({ itemId: item.id, quantity: item.quantity + 1 }))}
                    >
                      <Plus />
                    </Button>
                  </div>
                )}
                <span className="tabular w-24 text-right font-bold">{formatMoney(item.totalCents)}</span>
                {editable && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remover ${item.serviceName}`}
                    disabled={props.items.length <= 1 || action.pending}
                    onClick={() => action.run(() => removeItemAction({ itemId: item.id }), { success: "Serviço removido." })}
                  >
                    <Trash2 />
                  </Button>
                )}
              </li>
            ))}
          </ul>

          {editable && (
            <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-sand bg-muted/30 p-3 sm:flex-row">
              {canPickProfessional && (
                <NativeSelect
                  aria-label="Profissional do serviço"
                  value={itemProfessional}
                  onChange={(e) => {
                    setItemProfessional(e.target.value);
                    setServiceId("");
                  }}
                  className="sm:w-44"
                >
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {firstName(p.name)}
                    </option>
                  ))}
                </NativeSelect>
              )}
              <NativeSelect
                aria-label="Adicionar serviço"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="flex-1"
              >
                <option value="">Adicionar serviço…</option>
                {eligibleServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {formatMoney(s.priceCents)}
                  </option>
                ))}
              </NativeSelect>
              <Button
                variant="dark"
                disabled={!serviceId}
                loading={action.pending}
                onClick={() =>
                  action.run(
                    () => addItemAction({ attendanceId: props.attendanceId, serviceId, professionalId: itemProfessional, quantity: 1 }),
                    {
                      success: "Serviço adicionado.",
                      onSuccess: () => setServiceId(""),
                    },
                  )
                }
              >
                <Plus /> Adicionar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="overflow-hidden">
          <CardContent className="space-y-3 pt-5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular font-semibold">{formatMoney(props.subtotalCents)}</span>
            </div>
            {can("attendance.discount") && props.status !== "PAID" ? (
              <div className="space-y-1.5">
                <label htmlFor="discount" className="text-sm text-muted-foreground">
                  Desconto
                </label>
                <div className="flex gap-2">
                  <MoneyInput id="discount" value={discount} onChange={setDiscount} />
                  <Button
                    variant="outline"
                    disabled={action.pending || (discount ?? 0) === props.discountCents}
                    onClick={() =>
                      action.run(() => setDiscountAction({ attendanceId: props.attendanceId, discountCents: discount ?? 0 }), {
                        success: "Desconto aplicado.",
                      })
                    }
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Desconto</span>
                <span className="tabular font-semibold">− {formatMoney(props.discountCents)}</span>
              </div>
            )}
            <div className="flex items-end justify-between border-t border-border pt-3">
              <span className="font-semibold">Total</span>
              <span className="tabular text-3xl font-extrabold text-foreground">{formatMoney(props.totalCents)}</span>
            </div>
          </CardContent>
          {props.status !== "PAID" && (
            <div className="space-y-2 border-t border-border bg-muted/40 p-4">
              {props.status === "IN_PROGRESS" && can("attendance.finish") && (
                <Button size="lg" className="w-full" onClick={() => setConfirmFinish(true)} loading={action.pending}>
                  <CheckCircle2 /> Finalizar atendimento
                </Button>
              )}
              {props.status === "AWAITING_PAYMENT" && can("payments.create") && (
                <Button size="lg" className="w-full" onClick={() => setPaying(true)}>
                  <Wallet /> Registrar pagamento
                </Button>
              )}
              {props.status === "AWAITING_PAYMENT" && !can("payments.create") && (
                <p className="text-center text-sm text-muted-foreground">Aguardando pagamento na recepção.</p>
              )}
              {props.status === "AWAITING_PAYMENT" && can("attendance.view_all") && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() =>
                    action.run(() => reopenAttendanceAction({ attendanceId: props.attendanceId }), { success: "Atendimento reaberto." })
                  }
                >
                  <RotateCcw /> Reabrir para editar
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmFinish}
        onOpenChange={setConfirmFinish}
        title="Finalizar atendimento?"
        description={`Total de ${formatMoney(props.totalCents)}. ${can("payments.create") ? "Em seguida você registra o pagamento." : "A recepção fará a cobrança."}`}
        confirmLabel="Finalizar"
        onConfirm={() =>
          action.run(() => finishAttendanceAction({ attendanceId: props.attendanceId }), {
            success: "Atendimento finalizado.",
            onSuccess: () => can("payments.create") && setPaying(true),
          })
        }
      />
      <PaymentDialog
        open={paying}
        onOpenChange={setPaying}
        attendanceId={props.attendanceId}
        subtotalCents={props.subtotalCents}
        discountCents={props.discountCents}
        totalCents={props.totalCents}
        cashOpen={business.cashOpen}
      />
    </div>
  );
}

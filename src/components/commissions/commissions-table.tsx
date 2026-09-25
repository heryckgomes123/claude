"use client";

import { CheckCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { markCommissionsPaidAction } from "@/actions/commissions";
import { useCan } from "@/components/layout/app-context";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COMMISSION_STATUS_LABELS } from "@/config/domain";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/utils/dates";
import { formatMoney, formatPercent } from "@/utils/money";
import { firstName } from "@/utils/text";

type Row = {
  id: string;
  createdAt: Date;
  baseCents: number;
  rate: number;
  amountCents: number;
  status: "PENDING" | "PAID";
  paidAt: Date | null;
  attendanceId: string;
  professionalName: string;
  professionalColor: string;
  serviceName: string;
  clientName: string;
};

export function CommissionsTable({ rows }: { rows: Row[] }) {
  const can = useCan();
  const manage = can("commissions.manage");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const { run } = useServerAction();
  const pending = rows.filter((r) => r.status === "PENDING");
  const selectedTotal = useMemo(() => rows.filter((r) => selected.has(r.id)).reduce((s, r) => s + r.amountCents, 0), [rows, selected]);

  if (rows.length === 0)
    return (
      <EmptyState title="Nenhuma comissão no período" description="Comissões são geradas automaticamente quando um atendimento é pago." />
    );

  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      {manage && selected.size > 0 && (
        <div className="sticky top-20 z-10 mb-3 flex items-center justify-between gap-3 rounded-2xl border border-terracotta-200 bg-terracotta-50 p-3 shadow-soft animate-slide-up">
          <p className="text-sm font-semibold text-terracotta-800">
            {selected.size} selecionada(s) · {formatMoney(selectedTotal)}
          </p>
          <Button size="sm" onClick={() => setConfirming(true)}>
            <CheckCheck /> Marcar como pagas
          </Button>
        </div>
      )}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {manage && (
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Selecionar todas pendentes"
                    checked={pending.length > 0 && pending.every((r) => selected.has(r.id))}
                    onCheckedChange={(v) => setSelected(v ? new Set(pending.map((r) => r.id)) : new Set())}
                  />
                </TableHead>
              )}
              <TableHead>Data</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Serviço / Cliente</TableHead>
              <TableHead className="text-right">Base</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                data-state={selected.has(r.id) ? "selected" : undefined}
                className="data-[state=selected]:bg-terracotta-50/60"
              >
                {manage && (
                  <TableCell>
                    {r.status === "PENDING" && (
                      <Checkbox
                        aria-label={`Selecionar comissão de ${r.professionalName}`}
                        checked={selected.has(r.id)}
                        onCheckedChange={() => toggle(r.id)}
                      />
                    )}
                  </TableCell>
                )}
                <TableCell className="tabular whitespace-nowrap text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="mr-2 inline-block size-2 rounded-full" style={{ backgroundColor: r.professionalColor }} aria-hidden />
                  {firstName(r.professionalName)}
                </TableCell>
                <TableCell className="max-w-64">
                  <Link href={`/painel/atendimentos/${r.attendanceId}`} className="block truncate font-semibold hover:text-primary">
                    {r.serviceName}
                  </Link>
                  <span className="block truncate text-xs text-muted-foreground">{r.clientName}</span>
                </TableCell>
                <TableCell className="tabular text-right">{formatMoney(r.baseCents)}</TableCell>
                <TableCell className="tabular text-right text-muted-foreground">{formatPercent(r.rate, 2)}</TableCell>
                <TableCell className="tabular text-right font-bold">{formatMoney(r.amountCents)}</TableCell>
                <TableCell>
                  <Badge tone={r.status === "PAID" ? "sage" : "bronze"}>{COMMISSION_STATUS_LABELS[r.status]}</Badge>
                  {r.paidAt && <span className="block text-[0.65rem] text-muted-foreground">{formatDate(r.paidAt)}</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Fechar comissões?"
        description={`${selected.size} comissão(ões) totalizando ${formatMoney(selectedTotal)} serão marcadas como pagas. Comissões pagas não são recalculadas.`}
        confirmLabel="Marcar como pagas"
        onConfirm={() =>
          run(() => markCommissionsPaidAction({ commissionIds: [...selected] }), {
            success: (r) => `${r.count} comissão(ões) paga(s): ${formatMoney(r.totalCents)}.`,
            onSuccess: () => setSelected(new Set()),
          })
        }
      />
    </>
  );
}

"use client";

import { Ban, Trash2 } from "lucide-react";
import { useState } from "react";
import { createScheduleBlockAction, deleteScheduleBlockAction } from "@/actions/appointments";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDateTime, todayKey } from "@/utils/dates";
import type { AgendaBlock } from "./types";

/** Bloqueio de agenda (folga pontual, curso, manutenção). Sem profissional = salão inteiro. */
export function BlockDialog({
  open,
  onOpenChange,
  date,
  professionals,
  blocks,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  professionals: { id: string; name: string }[];
  blocks: AgendaBlock[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <BlockForm date={date} professionals={professionals} blocks={blocks} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function BlockForm({
  date,
  professionals,
  blocks,
  onClose,
}: {
  date: string;
  professionals: { id: string; name: string }[];
  blocks: AgendaBlock[];
  onClose: () => void;
}) {
  const today = todayKey();
  const [form, setForm] = useState({
    professionalId: "",
    date: date < today ? today : date,
    startTime: "12:00",
    endTime: "13:00",
    reason: "",
  });
  const { pending, run, fieldError } = useServerAction();
  const remove = useServerAction();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(() => createScheduleBlockAction({ ...form, professionalId: form.professionalId || null }), {
      success: "Horário bloqueado.",
      onSuccess: onClose,
    });
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogHeader>
        <DialogTitle>Bloquear horário</DialogTitle>
        <DialogDescription>O período bloqueado some da disponibilidade da agenda.</DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4 pb-5">
        <FormField id="block-prof" label="Profissional">
          <NativeSelect id="block-prof" value={form.professionalId} onChange={(e) => setForm({ ...form, professionalId: e.target.value })}>
            <option value="">Salão inteiro</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <div className="grid grid-cols-3 gap-3">
          <FormField id="block-date" label="Data" className="col-span-3 sm:col-span-1" error={fieldError("date")}>
            <Input
              id="block-date"
              type="date"
              min={todayKey()}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </FormField>
          <FormField id="block-start" label="Início" className="col-span-3 sm:col-span-1" error={fieldError("startTime")}>
            <Input
              id="block-start"
              type="time"
              step={900}
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
          </FormField>
          <FormField id="block-end" label="Fim" className="col-span-3 sm:col-span-1" error={fieldError("endTime")}>
            <Input
              id="block-end"
              type="time"
              step={900}
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </FormField>
        </div>
        <FormField id="block-reason" label="Motivo" required error={fieldError("reason")}>
          <Input
            id="block-reason"
            placeholder="Ex.: consulta médica, curso, manutenção"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            maxLength={200}
          />
        </FormField>
        {blocks.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-muted-foreground uppercase">Bloqueios no período</p>
            {blocks.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm">
                <Ban className="size-4 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{b.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.professionalName ?? "Salão inteiro"} · {formatDateTime(b.startsAt)} – {formatDateTime(b.endsAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remover bloqueio"
                  disabled={remove.pending}
                  onClick={() => remove.run(() => deleteScheduleBlockAction({ blockId: b.id }), { success: "Bloqueio removido." })}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Fechar
        </Button>
        <Button type="submit" variant="dark" loading={pending}>
          <Ban /> Bloquear
        </Button>
      </DialogFooter>
    </form>
  );
}

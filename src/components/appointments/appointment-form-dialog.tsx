"use client";

import { CalendarCheck2, Clock, Loader2, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { availabilityAction, createAppointmentAction, rescheduleAppointmentAction } from "@/actions/appointments";
import { ClientCombobox, type ClientOption } from "@/components/clients/client-combobox";
import { useApp } from "@/components/layout/app-context";
import { FormField } from "@/components/shared/form-field";
import { MoneyInput } from "@/components/shared/money-input";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import { cn } from "@/utils/cn";
import { addDays, formatDateKey, todayKey } from "@/utils/dates";
import { formatMoney } from "@/utils/money";
import { firstName } from "@/utils/text";

export type AppointmentPrefill = {
  date?: string;
  time?: string;
  professionalId?: string;
  serviceId?: string;
  client?: ClientOption;
};

export type ReschedulableAppointment = {
  id: string;
  date: string;
  time: string;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  serviceId: string;
  professionalId: string;
  durationMinutes: number;
  priceCents: number;
  notes: string | null;
};

type Slot = { time: string; startMinute: number };

/**
 * Novo agendamento / remarcação:
 * Cliente → Serviço → Profissional → Data/Hora (somente horários livres) → Confirmar.
 */
export function AppointmentFormDialog({
  open,
  onOpenChange,
  prefill,
  appointment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: AppointmentPrefill;
  appointment?: ReschedulableAppointment | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <AppointmentForm prefill={prefill} appointment={appointment} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

type SlotResult = { key: string; slots: Slot[]; closedReason: string | null };

/** Corpo do formulário: montado a cada abertura, então o estado nasce das props. */
function AppointmentForm({
  prefill,
  appointment,
  onClose,
}: {
  prefill?: AppointmentPrefill;
  appointment?: ReschedulableAppointment | null;
  onClose: () => void;
}) {
  const { services, professionals } = useApp();
  const today = todayKey();
  const [client, setClient] = useState<ClientOption | null>(() =>
    appointment ? { id: appointment.clientId, name: appointment.clientName, phone: appointment.clientPhone } : (prefill?.client ?? null),
  );
  const [serviceId, setServiceId] = useState(appointment?.serviceId ?? prefill?.serviceId ?? "");
  const [professionalId, setProfessionalId] = useState(appointment?.professionalId ?? prefill?.professionalId ?? "");
  const [date, setDate] = useState(() => {
    const initial = appointment?.date ?? prefill?.date;
    return initial && initial >= today ? initial : today;
  });
  const [time, setTime] = useState(appointment?.time ?? prefill?.time ?? "");
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [priceCents, setPriceCents] = useState<number | null>(appointment?.priceCents ?? null);
  const [duration, setDuration] = useState<number | null>(appointment?.durationMinutes ?? null);
  const [adjust, setAdjust] = useState(false);
  const [slotResult, setSlotResult] = useState<SlotResult | null>(null);
  const { pending, run, fieldError, setFieldErrors } = useServerAction();

  const service = services.find((s) => s.id === serviceId);
  const eligible = useMemo(() => professionals.filter((p) => !serviceId || p.serviceIds.includes(serviceId)), [professionals, serviceId]);
  const grouped = useMemo(() => {
    const map = new Map<string, typeof services>();
    for (const s of services) map.set(s.categoryName, [...(map.get(s.categoryName) ?? []), s]);
    return [...map.entries()];
  }, [services]);

  // Troca de serviço: valores padrão e profissional compatível.
  function selectService(id: string) {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    setPriceCents(svc?.priceCents ?? null);
    setDuration(svc?.durationMinutes ?? null);
    const compatible = professionals.filter((p) => p.serviceIds.includes(id));
    if (!compatible.some((p) => p.id === professionalId)) {
      setProfessionalId(compatible.length === 1 ? compatible[0].id : "");
    }
  }

  // Busca de horários disponíveis (resultado indexado pela consulta; carregando = consulta sem resultado).
  const slotKey = serviceId && professionalId && date ? [serviceId, professionalId, date, duration ?? ""].join("|") : null;
  useEffect(() => {
    if (!slotKey) return;
    let cancelled = false;
    availabilityAction({
      serviceId,
      professionalId,
      date,
      durationMinutes: duration ?? undefined,
      excludeAppointmentId: appointment?.id,
    })
      .then((res) => {
        if (cancelled) return;
        setSlotResult(
          res.ok
            ? { key: slotKey, slots: res.data.slots, closedReason: res.data.closedReason }
            : { key: slotKey, slots: [], closedReason: res.error },
        );
      })
      .catch(() => !cancelled && setSlotResult({ key: slotKey, slots: [], closedReason: "Não foi possível carregar os horários." }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slotKey resume serviço/profissional/data/duração
  }, [slotKey, appointment?.id]);
  const loadingSlots = slotKey !== null && slotResult?.key !== slotKey;
  const slots = slotKey && slotResult?.key === slotKey ? slotResult.slots : [];
  const closedReason = slotKey && slotResult?.key === slotKey ? slotResult.closedReason : null;

  const timeAvailable = slots.some((s) => s.time === time);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string[]> = {};
    if (!client) errors.clientId = ["Selecione a cliente."];
    if (!serviceId) errors.serviceId = ["Selecione o serviço."];
    if (!professionalId) errors.professionalId = ["Selecione a profissional."];
    if (!time) errors.time = ["Escolha um horário disponível."];
    else if (!timeAvailable) errors.time = ["Este horário não está disponível. Escolha outro."];
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    const payload = {
      clientId: client!.id,
      serviceId,
      professionalId,
      date,
      time,
      notes,
      priceCents: priceCents ?? undefined,
      durationMinutes: duration ?? undefined,
    };
    if (appointment) {
      run(() => rescheduleAppointmentAction({ ...payload, appointmentId: appointment.id }), {
        success: "Agendamento remarcado.",
        onSuccess: onClose,
      });
    } else {
      run(() => createAppointmentAction(payload), {
        success: `Agendado: ${client!.name} · ${formatDateKey(date, "short")} às ${time}`,
        onSuccess: onClose,
      });
    }
  }

  const quickDates = [0, 1, 2, 3, 4, 5, 6].map((d) => addDays(today, d));

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogHeader>
        <DialogTitle>{appointment ? "Remarcar agendamento" : "Novo agendamento"}</DialogTitle>
        <DialogDescription>
          {appointment ? "Escolha a nova data e horário." : "Cliente, serviço, profissional e horário — em poucos toques."}
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-5 pb-6">
        <FormField id="appt-client" label="Cliente" required error={fieldError("clientId")}>
          <ClientCombobox id="appt-client" value={client} onChange={setClient} invalid={!!fieldError("clientId")} />
        </FormField>

        <FormField id="appt-service" label="Serviço" required error={fieldError("serviceId")}>
          <NativeSelect
            id="appt-service"
            value={serviceId}
            onChange={(e) => selectService(e.target.value)}
            className="h-11"
            aria-invalid={!!fieldError("serviceId")}
          >
            <option value="">Selecione o serviço</option>
            {grouped.map(([category, list]) => (
              <optgroup key={category} label={category}>
                {list.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.durationMinutes} min · {formatMoney(s.priceCents)}
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        </FormField>

        <fieldset className="space-y-1.5">
          <legend className="text-[0.8rem] font-semibold text-secondary-foreground">
            Profissional<span className="ml-0.5 text-terracotta-500">*</span>
          </legend>
          {serviceId && eligible.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma profissional habilitada para este serviço.</p>
          ) : (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Profissional">
              {eligible.map((p) => {
                const active = p.id === professionalId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setProfessionalId(p.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border py-1 pr-3.5 pl-1 text-sm font-semibold transition",
                      active
                        ? "border-terracotta-300 bg-terracotta-50 text-terracotta-700 ring-2 ring-terracotta-100"
                        : "border-border bg-card hover:border-bronze-200",
                    )}
                  >
                    <Avatar name={p.name} color={p.color} size="xs" className="ring-0" />
                    {firstName(p.name)}
                  </button>
                );
              })}
            </div>
          )}
          {fieldError("professionalId") && <p className="text-xs font-medium text-destructive">{fieldError("professionalId")}</p>}
        </fieldset>

        <div className="space-y-2">
          <div className="flex items-end justify-between gap-3">
            <FormField id="appt-date" label="Data" required className="w-44">
              <Input id="appt-date" type="date" value={date} min={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </FormField>
            <div className="scrollbar-thin -mb-1 flex flex-1 gap-1.5 overflow-x-auto pb-1">
              {quickDates.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDate(d)}
                  className={cn(
                    "flex min-w-12 flex-col items-center rounded-xl border px-2 py-1 text-[0.65rem] font-semibold uppercase transition",
                    d === date
                      ? "border-charcoal bg-charcoal text-cream"
                      : "border-border bg-card text-muted-foreground hover:border-bronze-200",
                  )}
                >
                  {i === 0 ? "Hoje" : formatDateKey(d, "weekday")}
                  <span className="text-sm font-bold normal-case">{d.slice(8)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-muted/40 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase">
              <Clock className="size-3.5" aria-hidden /> Horários disponíveis
              {service && <span className="font-medium normal-case">· {duration ?? service.durationMinutes} min</span>}
            </p>
            {!serviceId || !professionalId ? (
              <p className="py-3 text-center text-sm text-muted-foreground">Selecione serviço e profissional para ver os horários.</p>
            ) : loadingSlots ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Calculando disponibilidade…
              </div>
            ) : slots.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">{closedReason ?? "Sem horários livres."}</p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6" role="radiogroup" aria-label="Horários disponíveis">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    role="radio"
                    aria-checked={slot.time === time}
                    onClick={() => setTime(slot.time)}
                    className={cn(
                      "tabular rounded-lg border py-2 text-sm font-semibold transition",
                      slot.time === time
                        ? "border-primary bg-primary text-primary-foreground shadow-glow"
                        : "border-border bg-card hover:border-terracotta-200 hover:bg-terracotta-50",
                    )}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
            {time && !loadingSlots && slots.length > 0 && !timeAvailable && (
              <p className="mt-2 text-xs font-medium text-destructive">O horário {time} não está livre — escolha outro.</p>
            )}
            {fieldError("time") && <p className="mt-2 text-xs font-medium text-destructive">{fieldError("time")}</p>}
          </div>
        </div>

        {service && (
          <div className="rounded-2xl border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Valor </span>
                <span className="font-bold">{formatMoney(priceCents ?? service.priceCents)}</span>
                <span className="text-muted-foreground"> · Duração </span>
                <span className="font-bold">{duration ?? service.durationMinutes} min</span>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAdjust((v) => !v)}>
                <SlidersHorizontal /> Ajustar
              </Button>
            </div>
            {adjust && (
              <div className="mt-3 grid animate-fade-in gap-3 sm:grid-cols-2">
                <FormField id="appt-price" label="Valor">
                  <MoneyInput id="appt-price" value={priceCents} onChange={setPriceCents} />
                </FormField>
                <FormField id="appt-duration" label="Duração (min)">
                  <Input
                    id="appt-duration"
                    type="number"
                    min={5}
                    max={600}
                    step={5}
                    value={duration ?? ""}
                    onChange={(e) => setDuration(e.target.value ? Math.max(5, Math.min(600, Number(e.target.value))) : null)}
                  />
                </FormField>
              </div>
            )}
          </div>
        )}

        <FormField id="appt-notes" label="Observação">
          <Textarea
            id="appt-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            className="min-h-16"
            placeholder="Opcional"
          />
        </FormField>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending} disabled={loadingSlots}>
          <CalendarCheck2 /> {appointment ? "Confirmar remarcação" : "Confirmar agendamento"}
        </Button>
      </DialogFooter>
    </form>
  );
}

"use client";

import { useState } from "react";
import { updateBusinessHoursAction } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useServerAction } from "@/hooks/use-server-action";
import { cn } from "@/utils/cn";
import { minutesToTime, timeToMinutes, WEEKDAY_LABELS } from "@/utils/dates";

type Day = {
  weekday: number;
  isOpen: boolean;
  openMinute: number;
  closeMinute: number;
  breakStartMinute: number | null;
  breakEndMinute: number | null;
};

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function BusinessHoursForm({ days: initial, slotInterval, editable }: { days: Day[]; slotInterval: number; editable: boolean }) {
  const [days, setDays] = useState(initial);
  const [interval, setInterval] = useState(slotInterval);
  const { pending, run } = useServerAction();
  const update = (weekday: number, patch: Partial<Day>) =>
    setDays((cur) => cur.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateBusinessHoursAction({ slotIntervalMinutes: interval as 10 | 15 | 20 | 30, days }), {
          success: "Horários de funcionamento salvos.",
        });
      }}
      className="space-y-4"
    >
      <fieldset disabled={!editable} className="space-y-2">
        <legend className="sr-only">Dias de funcionamento</legend>
        {ORDER.map((wd) => {
          const d = days.find((x) => x.weekday === wd)!;
          return (
            <div
              key={wd}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-xl border p-3",
                d.isOpen ? "border-border" : "border-dashed border-sand bg-muted/30",
              )}
            >
              <label className="flex w-32 items-center gap-2 text-sm font-semibold">
                <Switch checked={d.isOpen} onCheckedChange={(v) => update(wd, { isOpen: v })} aria-label={`Aberto ${WEEKDAY_LABELS[wd]}`} />
                {WEEKDAY_LABELS[wd]}
              </label>
              {d.isOpen ? (
                <div className="flex flex-1 flex-wrap items-center gap-2 text-sm">
                  <Input
                    type="time"
                    step={900}
                    aria-label="Abertura"
                    className="h-9 w-28"
                    value={minutesToTime(d.openMinute)}
                    onChange={(e) => e.target.value && update(wd, { openMinute: timeToMinutes(e.target.value) })}
                  />
                  <span className="text-muted-foreground">às</span>
                  <Input
                    type="time"
                    step={900}
                    aria-label="Fechamento"
                    className="h-9 w-28"
                    value={minutesToTime(d.closeMinute)}
                    onChange={(e) => e.target.value && update(wd, { closeMinute: timeToMinutes(e.target.value) })}
                  />
                  <span className="ml-2 text-muted-foreground">Pausa geral</span>
                  <Input
                    type="time"
                    step={900}
                    aria-label="Início da pausa"
                    className="h-9 w-28"
                    value={d.breakStartMinute != null ? minutesToTime(d.breakStartMinute) : ""}
                    onChange={(e) =>
                      update(
                        wd,
                        e.target.value
                          ? {
                              breakStartMinute: timeToMinutes(e.target.value),
                              breakEndMinute: d.breakEndMinute ?? timeToMinutes(e.target.value) + 60,
                            }
                          : { breakStartMinute: null, breakEndMinute: null },
                      )
                    }
                  />
                  <Input
                    type="time"
                    step={900}
                    aria-label="Fim da pausa"
                    className="h-9 w-28"
                    disabled={d.breakStartMinute == null}
                    value={d.breakEndMinute != null ? minutesToTime(d.breakEndMinute) : ""}
                    onChange={(e) => e.target.value && update(wd, { breakEndMinute: timeToMinutes(e.target.value) })}
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Fechado</span>
              )}
            </div>
          );
        })}
      </fieldset>
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="slot-interval">Intervalo entre horários da agenda</Label>
          <NativeSelect
            id="slot-interval"
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            disabled={!editable}
            className="w-40"
          >
            {[10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>
                {n} minutos
              </option>
            ))}
          </NativeSelect>
        </div>
        {editable && (
          <Button type="submit" loading={pending}>
            Salvar horários
          </Button>
        )}
      </div>
    </form>
  );
}

"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { saveProfessionalAction } from "@/actions/professionals";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PROFESSIONAL_COLORS } from "@/config/domain";
import { useServerAction } from "@/hooks/use-server-action";
import { cn } from "@/utils/cn";
import { minutesToTime, timeToMinutes, WEEKDAY_LABELS } from "@/utils/dates";
import { formatPhone } from "@/utils/phone";

export type ScheduleDay = {
  weekday: number;
  startMinute: number;
  endMinute: number;
  breakStartMinute: number | null;
  breakEndMinute: number | null;
};

export type EditableProfessional = {
  id: string;
  name: string;
  title: string;
  photoUrl: string | null;
  phone: string | null;
  color: string;
  defaultCommissionRate: number;
  categoryIds: string[];
  serviceIds: string[];
  schedule: ScheduleDay[];
};

type Catalog = { categories: { id: string; name: string }[]; services: { id: string; name: string; categoryId: string }[] };

const DEFAULT_SCHEDULE: ScheduleDay[] = [2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  startMinute: 540,
  endMinute: weekday === 6 ? 1020 : 1140,
  breakStartMinute: weekday === 6 ? null : 750,
  breakEndMinute: weekday === 6 ? null : 810,
}));

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function ProfessionalFormDialog({
  open,
  onOpenChange,
  professional,
  catalog,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professional?: EditableProfessional | null;
  catalog: Catalog;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <ProfessionalForm professional={professional} catalog={catalog} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ProfessionalForm({
  professional,
  catalog,
  onClose,
}: {
  professional?: EditableProfessional | null;
  catalog: Catalog;
  onClose: () => void;
}) {
  const [form, setForm] = useState(() => ({
    name: professional?.name ?? "",
    title: professional?.title ?? "",
    photoUrl: professional?.photoUrl ?? "",
    phone: formatPhone(professional?.phone),
    color: professional?.color ?? PROFESSIONAL_COLORS[0],
    rate: String(professional?.defaultCommissionRate ?? 40),
  }));
  const [categoryIds, setCategoryIds] = useState<string[]>(professional?.categoryIds ?? []);
  const [serviceIds, setServiceIds] = useState<string[]>(professional?.serviceIds ?? []);
  const [schedule, setSchedule] = useState<ScheduleDay[]>(professional?.schedule ?? DEFAULT_SCHEDULE);
  const [tab, setTab] = useState("dados");
  const { pending, run, fieldError } = useServerAction();

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  function toggleCategory(id: string) {
    const next = toggle(categoryIds, id);
    setCategoryIds(next);
    // Ao marcar uma especialidade, habilita todos os serviços dela por padrão.
    const ofCategory = catalog.services.filter((s) => s.categoryId === id).map((s) => s.id);
    setServiceIds((current) =>
      next.includes(id) ? [...new Set([...current, ...ofCategory])] : current.filter((s) => !ofCategory.includes(s)),
    );
  }

  function updateDay(weekday: number, patch: Partial<ScheduleDay> | null) {
    setSchedule((current) => {
      const exists = current.find((d) => d.weekday === weekday);
      if (patch === null) return current.filter((d) => d.weekday !== weekday);
      if (!exists)
        return [...current, { weekday, startMinute: 540, endMinute: 1140, breakStartMinute: null, breakEndMinute: null, ...patch }];
      return current.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d));
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(
      () =>
        saveProfessionalAction({
          professionalId: professional?.id ?? null,
          name: form.name,
          title: form.title,
          photoUrl: form.photoUrl,
          phone: form.phone,
          color: form.color,
          defaultCommissionRate: Number(form.rate.replace(",", ".")),
          categoryIds,
          serviceIds,
          schedule,
        }),
      {
        success: professional ? "Profissional atualizada." : "Profissional cadastrada.",
        onSuccess: onClose,
        onError: (r) => {
          if (r.fieldErrors?.schedule) setTab("jornada");
          else if (r.fieldErrors?.name || r.fieldErrors?.title || r.fieldErrors?.defaultCommissionRate) setTab("dados");
        },
      },
    );
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogHeader>
        <DialogTitle>{professional ? "Editar profissional" : "Nova profissional"}</DialogTitle>
        <DialogDescription>Dados, especialidades, serviços habilitados e jornada de trabalho.</DialogDescription>
      </DialogHeader>
      <DialogBody className="pb-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="servicos">Serviços ({serviceIds.length})</TabsTrigger>
            <TabsTrigger value="jornada">Jornada</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="prof-name" label="Nome" required error={fieldError("name")}>
                <Input id="prof-name" value={form.name} onChange={set("name")} maxLength={120} />
              </FormField>
              <FormField id="prof-title" label="Cargo" required error={fieldError("title")}>
                <Input id="prof-title" value={form.title} onChange={set("title")} placeholder="Ex.: Cabeleireira" maxLength={80} />
              </FormField>
              <FormField id="prof-phone" label="Telefone" error={fieldError("phone")}>
                <Input id="prof-phone" inputMode="tel" value={form.phone} onChange={set("phone")} />
              </FormField>
              <FormField
                id="prof-rate"
                label="Comissão padrão (%)"
                required
                error={fieldError("defaultCommissionRate")}
                hint="Usada quando o serviço não define percentual próprio."
              >
                <Input id="prof-rate" inputMode="decimal" value={form.rate} onChange={set("rate")} />
              </FormField>
              <FormField
                id="prof-photo"
                label="Foto (URL)"
                className="sm:col-span-2"
                error={fieldError("photoUrl")}
                hint="Opcional. Upload de imagens chega na próxima fase."
              >
                <Input id="prof-photo" type="url" value={form.photoUrl} onChange={set("photoUrl")} placeholder="https://…" />
              </FormField>
            </div>
            <fieldset>
              <legend className="mb-2 text-[0.8rem] font-semibold">Cor na agenda</legend>
              <div className="flex flex-wrap gap-2">
                {PROFESSIONAL_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color }))}
                    className="grid size-9 place-items-center rounded-full ring-offset-2 transition hover:scale-105"
                    style={{ backgroundColor: color, boxShadow: form.color === color ? `0 0 0 2px #fff, 0 0 0 4px ${color}` : undefined }}
                    aria-label={`Cor ${color}`}
                    aria-pressed={form.color === color}
                  >
                    {form.color === color && <Check className="size-4 text-white" aria-hidden />}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-[0.8rem] font-semibold">Especialidades</legend>
              <div className="flex flex-wrap gap-2">
                {catalog.categories.map((c) => {
                  const active = categoryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleCategory(c.id)}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-sm font-semibold transition",
                        active ? "border-terracotta-300 bg-terracotta-50 text-terracotta-700" : "border-border hover:border-bronze-200",
                      )}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </TabsContent>

          <TabsContent value="servicos" className="space-y-4">
            {catalog.categories.map((c) => {
              const list = catalog.services.filter((s) => s.categoryId === c.id);
              if (list.length === 0) return null;
              return (
                <div key={c.id}>
                  <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">{c.name}</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {list.map((s) => (
                      <label
                        key={s.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted/50"
                      >
                        <Checkbox checked={serviceIds.includes(s.id)} onCheckedChange={() => setServiceIds((cur) => toggle(cur, s.id))} />
                        {s.name}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="jornada" className="space-y-2">
            {fieldError("schedule") && <p className="text-sm font-medium text-destructive">{fieldError("schedule")}</p>}
            <p className="text-xs text-muted-foreground">
              Dias desligados são folga. A agenda também respeita o horário de funcionamento do salão.
            </p>
            {WEEK_ORDER.map((weekday) => {
              const day = schedule.find((d) => d.weekday === weekday);
              return (
                <div key={weekday} className={cn("rounded-xl border p-3", day ? "border-border" : "border-dashed border-sand bg-muted/30")}>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex w-28 items-center gap-2 text-sm font-semibold">
                      <Switch
                        checked={!!day}
                        onCheckedChange={(v) => updateDay(weekday, v ? {} : null)}
                        aria-label={`Trabalha ${WEEKDAY_LABELS[weekday]}`}
                      />
                      {WEEKDAY_LABELS[weekday].slice(0, 3)}
                    </label>
                    {day ? (
                      <div className="flex flex-1 flex-wrap items-center gap-2 text-sm">
                        <Input
                          type="time"
                          step={900}
                          aria-label="Início"
                          className="h-9 w-28"
                          value={minutesToTime(day.startMinute)}
                          onChange={(e) => e.target.value && updateDay(weekday, { startMinute: timeToMinutes(e.target.value) })}
                        />
                        <span className="text-muted-foreground">às</span>
                        <Input
                          type="time"
                          step={900}
                          aria-label="Fim"
                          className="h-9 w-28"
                          value={minutesToTime(day.endMinute)}
                          onChange={(e) => e.target.value && updateDay(weekday, { endMinute: timeToMinutes(e.target.value) })}
                        />
                        <span className="ml-2 text-muted-foreground">Pausa</span>
                        <Input
                          type="time"
                          step={900}
                          aria-label="Início da pausa"
                          className="h-9 w-28"
                          value={day.breakStartMinute != null ? minutesToTime(day.breakStartMinute) : ""}
                          onChange={(e) =>
                            updateDay(
                              weekday,
                              e.target.value
                                ? {
                                    breakStartMinute: timeToMinutes(e.target.value),
                                    breakEndMinute: day.breakEndMinute ?? timeToMinutes(e.target.value) + 60,
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
                          value={day.breakEndMinute != null ? minutesToTime(day.breakEndMinute) : ""}
                          disabled={day.breakStartMinute == null}
                          onChange={(e) => e.target.value && updateDay(weekday, { breakEndMinute: timeToMinutes(e.target.value) })}
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Folga</span>
                    )}
                  </div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending}>
          {professional ? "Salvar alterações" : "Cadastrar profissional"}
        </Button>
      </DialogFooter>
    </form>
  );
}

"use client";

import { Clock, MoreHorizontal, Pencil, Plus, Power, Scissors } from "lucide-react";
import { useMemo, useState } from "react";
import { saveServiceAction, setServiceActiveAction } from "@/actions/services";
import { useCan } from "@/components/layout/app-context";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField } from "@/components/shared/form-field";
import { MoneyInput } from "@/components/shared/money-input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import { cn } from "@/utils/cn";
import { formatMoney, formatPercent } from "@/utils/money";
import { firstName } from "@/utils/text";

export type ServiceItem = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  commissionRate: number | null;
  isActive: boolean;
  categoryId: string;
  categoryName: string;
  professionals: { id: string; name: string; color: string }[];
};

type Options = { categories: { id: string; name: string }[]; professionals: { id: string; name: string; color: string }[] };

export function ServicesManager({ services, options, query }: { services: ServiceItem[]; options: Options; query: string }) {
  const can = useCan();
  const [editing, setEditing] = useState<ServiceItem | null | undefined>(undefined);
  const { run } = useServerAction();
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? services.filter((s) => s.name.toLowerCase().includes(q) || s.categoryName.toLowerCase().includes(q)) : services;
  }, [services, query]);
  const groups = options.categories
    .map((c) => ({ ...c, items: filtered.filter((s) => s.categoryId === c.id) }))
    .filter((g) => g.items.length > 0);
  const canEdit = can("services.edit");

  return (
    <>
      {can("services.create") && (
        <div className="-mt-2 mb-4 flex justify-end">
          <Button onClick={() => setEditing(null)}>
            <Plus /> Novo serviço
          </Button>
        </div>
      )}
      {groups.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title={query ? "Nenhum serviço encontrado" : "Nenhum serviço cadastrado"}
          description="Cadastre serviços com duração, preço e comissão."
        />
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.id} aria-labelledby={`cat-${g.id}`}>
              <h2 id={`cat-${g.id}`} className="mb-3 flex items-center gap-3 font-display text-2xl font-semibold">
                {g.name}
                <span className="h-px flex-1 bg-gradient-to-r from-sand to-transparent" aria-hidden />
                <span className="font-sans text-xs font-semibold text-muted-foreground">{g.items.length} serviço(s)</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {g.items.map((s) => (
                  <article
                    key={s.id}
                    className={cn(
                      "flex flex-col rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:shadow-lifted",
                      !s.isActive && "opacity-60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold">{s.name}</h3>
                        {s.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>}
                      </div>
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${s.name}`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setEditing(s)}>
                              <Pencil /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              tone={s.isActive ? "danger" : undefined}
                              onSelect={() =>
                                run(() => setServiceActiveAction({ serviceId: s.id, isActive: !s.isActive }), {
                                  success: s.isActive ? "Serviço desativado." : "Serviço reativado.",
                                })
                              }
                            >
                              <Power /> {s.isActive ? "Desativar" : "Reativar"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className="tabular text-lg font-extrabold">{formatMoney(s.priceCents)}</span>
                      <Badge tone="neutral">
                        <Clock /> {s.durationMinutes} min
                      </Badge>
                      <Badge tone="terracotta">
                        {s.commissionRate != null ? `Comissão ${formatPercent(s.commissionRate)}` : "Comissão padrão"}
                      </Badge>
                      {!s.isActive && <Badge tone="muted">Inativo</Badge>}
                    </div>
                    <div className="mt-auto flex items-center gap-2 pt-4">
                      <div className="flex -space-x-2">
                        {s.professionals.slice(0, 5).map((p) => (
                          <Avatar key={p.id} name={p.name} color={p.color} size="xs" />
                        ))}
                      </div>
                      <span className="truncate text-xs text-muted-foreground">
                        {s.professionals.length
                          ? s.professionals.map((p) => firstName(p.name)).join(", ")
                          : "Nenhuma profissional habilitada"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <ServiceFormDialog
        open={editing !== undefined}
        onOpenChange={(o) => !o && setEditing(undefined)}
        service={editing}
        options={options}
      />
    </>
  );
}

function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  options,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  service?: ServiceItem | null;
  options: Options;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <ServiceForm service={service} options={options} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ServiceForm({ service, options, onClose }: { service?: ServiceItem | null; options: Options; onClose: () => void }) {
  const [form, setForm] = useState(() => ({
    name: service?.name ?? "",
    categoryId: service?.categoryId ?? options.categories[0]?.id ?? "",
    description: service?.description ?? "",
    duration: String(service?.durationMinutes ?? 60),
    rate: service?.commissionRate != null ? String(service.commissionRate) : "",
  }));
  const [price, setPrice] = useState<number | null>(service?.priceCents ?? null);
  const [professionalIds, setProfessionalIds] = useState<string[]>(service?.professionals.map((p) => p.id) ?? []);
  const { pending, run, fieldError } = useServerAction();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(
      () =>
        saveServiceAction({
          serviceId: service?.id ?? null,
          name: form.name,
          categoryId: form.categoryId,
          description: form.description,
          durationMinutes: Number(form.duration),
          priceCents: price ?? -1,
          commissionRate: form.rate.trim() === "" ? null : Number(form.rate.replace(",", ".")),
          professionalIds,
        }),
      { success: service ? "Serviço atualizado." : "Serviço cadastrado.", onSuccess: onClose },
    );
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogHeader>
        <DialogTitle>{service ? "Editar serviço" : "Novo serviço"}</DialogTitle>
        <DialogDescription>Alterações de preço valem para novos agendamentos; valores já lançados não mudam.</DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4 pb-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="svc-name" label="Nome" required error={fieldError("name")}>
            <Input id="svc-name" value={form.name} onChange={set("name")} maxLength={120} />
          </FormField>
          <FormField id="svc-category" label="Categoria" required error={fieldError("categoryId")}>
            <NativeSelect id="svc-category" value={form.categoryId} onChange={set("categoryId")}>
              {options.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        </div>
        <FormField id="svc-desc" label="Descrição" error={fieldError("description")}>
          <Textarea id="svc-desc" value={form.description} onChange={set("description")} maxLength={1000} className="min-h-16" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField id="svc-duration" label="Duração (min)" required error={fieldError("durationMinutes")}>
            <Input id="svc-duration" type="number" min={5} max={600} step={5} value={form.duration} onChange={set("duration")} />
          </FormField>
          <FormField id="svc-price" label="Preço" required error={fieldError("priceCents")}>
            <MoneyInput id="svc-price" value={price} onChange={setPrice} invalid={!!fieldError("priceCents")} />
          </FormField>
          <FormField id="svc-rate" label="Comissão (%)" hint="Vazio = padrão da profissional" error={fieldError("commissionRate")}>
            <Input id="svc-rate" inputMode="decimal" value={form.rate} onChange={set("rate")} placeholder="Padrão" />
          </FormField>
        </div>
        <fieldset>
          <legend className="mb-2 text-[0.8rem] font-semibold">Profissionais habilitadas</legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {options.professionals.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted/50"
              >
                <Checkbox
                  checked={professionalIds.includes(p.id)}
                  onCheckedChange={() => setProfessionalIds((cur) => (cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur, p.id]))}
                />
                <Avatar name={p.name} color={p.color} size="xs" className="ring-0" />
                {p.name}
              </label>
            ))}
          </div>
        </fieldset>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending}>
          {service ? "Salvar alterações" : "Cadastrar serviço"}
        </Button>
      </DialogFooter>
    </form>
  );
}

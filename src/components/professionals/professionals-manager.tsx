"use client";

import { MoreHorizontal, Pencil, Plus, Power, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { setProfessionalActiveAction } from "@/actions/professionals";
import { useCan } from "@/components/layout/app-context";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useServerAction } from "@/hooks/use-server-action";
import { WEEKDAY_SHORT } from "@/utils/dates";
import { formatPercent } from "@/utils/money";
import { formatPhone } from "@/utils/phone";
import { type EditableProfessional, ProfessionalFormDialog } from "./professional-form-dialog";

export type ProfessionalRow = EditableProfessional & { isActive: boolean; specialtyNames: string[]; serviceCount: number };
type Catalog = Parameters<typeof ProfessionalFormDialog>[0]["catalog"];

export function ProfessionalsManager({ rows, catalog }: { rows: ProfessionalRow[]; catalog: Catalog }) {
  const can = useCan();
  const [editing, setEditing] = useState<EditableProfessional | null | undefined>(undefined);
  const [deactivating, setDeactivating] = useState<ProfessionalRow | null>(null);
  const { run } = useServerAction();
  const manage = can("professionals.manage");

  return (
    <>
      {manage && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setEditing(null)}>
            <Plus /> Nova profissional
          </Button>
        </div>
      )}
      {rows.length === 0 ? (
        <EmptyState icon={UserRound} title="Nenhuma profissional cadastrada" description="Cadastre a equipe para montar a agenda." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <article
              key={p.id}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lifted"
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-20 opacity-70"
                style={{ background: `linear-gradient(135deg, ${p.color}26, transparent 70%)` }}
                aria-hidden
              />
              <div className="relative flex items-start gap-4">
                <Avatar name={p.name} src={p.photoUrl} color={p.color} size="lg" />
                <div className="min-w-0 flex-1">
                  <Link href={`/painel/profissionais/${p.id}`} className="block truncate text-lg font-bold hover:text-primary">
                    {p.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{p.title}</p>
                  {!p.isActive && (
                    <Badge tone="muted" className="mt-1">
                      Inativa
                    </Badge>
                  )}
                </div>
                {manage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${p.name}`}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditing(p)}>
                        <Pencil /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        tone={p.isActive ? "danger" : undefined}
                        onSelect={() =>
                          p.isActive
                            ? setDeactivating(p)
                            : run(() => setProfessionalActiveAction({ professionalId: p.id, isActive: true }), {
                                success: "Profissional reativada.",
                              })
                        }
                      >
                        <Power /> {p.isActive ? "Desativar" : "Reativar"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="relative mt-4 flex flex-wrap gap-1.5">
                {p.specialtyNames.map((s) => (
                  <Badge key={s} tone="bronze">
                    {s}
                  </Badge>
                ))}
              </div>
              <dl className="relative mt-4 grid grid-cols-3 gap-2 border-t border-border/70 pt-4 text-center text-xs">
                <div>
                  <dt className="text-muted-foreground">Serviços</dt>
                  <dd className="text-base font-bold">{p.serviceCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Comissão</dt>
                  <dd className="text-base font-bold">{formatPercent(p.defaultCommissionRate)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Dias</dt>
                  <dd className="text-base font-bold">{p.schedule.length}</dd>
                </div>
              </dl>
              <p className="relative mt-3 truncate text-xs text-muted-foreground">
                {p.schedule.length
                  ? [...p.schedule]
                      .sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7))
                      .map((d) => WEEKDAY_SHORT[d.weekday])
                      .join(" · ")
                  : "Sem jornada definida"}
                {p.phone && ` · ${formatPhone(p.phone)}`}
              </p>
            </article>
          ))}
        </div>
      )}
      <ProfessionalFormDialog
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
        professional={editing}
        catalog={catalog}
      />
      <ConfirmDialog
        open={deactivating !== null}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title={`Desativar ${deactivating?.name ?? ""}?`}
        description="Ela deixa de aparecer na agenda e em novos agendamentos. Histórico, atendimentos e comissões são preservados."
        confirmLabel="Desativar"
        destructive
        onConfirm={() => {
          if (deactivating)
            run(() => setProfessionalActiveAction({ professionalId: deactivating.id, isActive: false }), {
              success: "Profissional desativada.",
            });
        }}
      />
    </>
  );
}

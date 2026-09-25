import { CheckCheck, HandCoins, Hourglass, TrendingUp } from "lucide-react";
import { CommissionsTable } from "@/components/commissions/commissions-table";
import { PeriodFilter } from "@/components/finance/period-filter";
import { FilterBar } from "@/components/shared/filter-bar";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar } from "@/components/ui/avatar";
import { can, requirePagePermission } from "@/lib/auth/session";
import { listCommissions } from "@/services/commissions";
import { listProfessionalOptions } from "@/services/professionals";
import { formatMoney } from "@/utils/money";
import { resolvePeriod } from "@/utils/period";
import Link from "next/link";
import { cn } from "@/utils/cn";

export const metadata = { title: "Comissões" };

type Search = { period?: string; from?: string; to?: string; professional?: string; status?: string };

export default async function CommissionsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requirePagePermission(["commissions.view", "commissions.view_own"]);
  const params = await searchParams;
  const period = resolvePeriod(params);
  const seesAll = can(user, "commissions.view");
  const status = params.status === "PENDING" || params.status === "PAID" ? params.status : null;
  const professionalId = seesAll && params.professional && /^[0-9a-f-]{36}$/i.test(params.professional) ? params.professional : null;

  const [data, professionals] = await Promise.all([
    listCommissions(user, { from: period.from, to: period.to, professionalId, status }),
    seesAll ? listProfessionalOptions(user) : Promise.resolve([]),
  ]);

  const hrefFor = (id: string | null) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "professional") sp.set(k, v);
    if (id) sp.set("professional", id);
    return `/painel/comissoes?${sp.toString()}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Equipe"
        title={seesAll ? "Comissões" : "Minhas comissões"}
        description="Calculadas automaticamente no pagamento: valor do serviço (após desconto) × percentual."
      />
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <PeriodFilter period={period} />
        <FilterBar
          label="Status"
          param="status"
          defaultValue="all"
          options={[
            { value: "all", label: "Todas" },
            { value: "PENDING", label: "A pagar" },
            { value: "PAID", label: "Pagas" },
          ]}
        />
      </div>

      <section aria-label="Totais" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard label="Produção (base)" value={formatMoney(data.totals.baseCents)} icon={TrendingUp} tone="dark" />
        <MetricCard label="Comissões" value={formatMoney(data.totals.amountCents)} icon={HandCoins} tone="terracotta" />
        <MetricCard label="A pagar" value={formatMoney(data.totals.pendingCents)} icon={Hourglass} tone="bronze" />
        <MetricCard label="Pagas" value={formatMoney(data.totals.paidCents)} icon={CheckCheck} tone="sage" />
      </section>

      {seesAll && professionals.length > 0 && (
        <div className="scrollbar-thin mt-6 flex gap-2 overflow-x-auto pb-1">
          <Link
            href={hrefFor(null)}
            className={cn(
              "rounded-2xl border px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition",
              !professionalId ? "border-charcoal bg-charcoal text-cream" : "border-border bg-card hover:bg-muted",
            )}
          >
            Todas
          </Link>
          {professionals.map((p) => {
            const totals = data.byProfessional.find((b) => b.professionalId === p.id);
            const active = professionalId === p.id;
            return (
              <Link
                key={p.id}
                href={hrefFor(p.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-2xl border px-3 py-2 text-sm whitespace-nowrap transition",
                  active ? "border-terracotta-300 bg-terracotta-50" : "border-border bg-card hover:bg-muted",
                )}
              >
                <Avatar name={p.name} color={p.color} size="xs" className="ring-0" />
                <span className="font-semibold">{p.name.split(" ")[0]}</span>
                {totals && <span className="tabular text-xs text-muted-foreground">{formatMoney(totals.pendingCents)} a pagar</span>}
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <CommissionsTable rows={data.rows} />
      </div>
    </>
  );
}

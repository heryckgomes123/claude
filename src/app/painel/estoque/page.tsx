import { AlertTriangle, Boxes, History, Wallet } from "lucide-react";
import { InventoryManager } from "@/components/inventory/inventory-manager";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { INVENTORY_MOVEMENT_LABELS } from "@/config/domain";
import { requirePagePermission } from "@/lib/auth/session";
import { listProducts, listRecentMovements } from "@/services/inventory";
import { formatDateTime } from "@/utils/dates";
import { formatMoney } from "@/utils/money";

export const metadata = { title: "Estoque" };

export default async function InventoryPage() {
  const user = await requirePagePermission("inventory.view");
  const [products, movements] = await Promise.all([listProducts(user), listRecentMovements(user, 15)]);
  const active = products.filter((p) => p.isActive);
  const low = active.filter((p) => p.isLow);
  const value = active.reduce((s, p) => s + Math.round(p.quantity * p.costCents), 0);

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Estoque"
        description="Controle básico de insumos: entradas, saídas, ajustes e alerta de estoque baixo."
      />
      <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <MetricCard label="Produtos ativos" value={active.length} icon={Boxes} tone="bronze" />
        <MetricCard
          label="Estoque baixo"
          value={low.length}
          icon={AlertTriangle}
          tone={low.length ? "terracotta" : "sage"}
          hint={low.length ? "repor em breve" : "tudo abastecido"}
        />
        <MetricCard
          label="Valor em estoque"
          value={formatMoney(value)}
          icon={Wallet}
          tone="dark"
          hint="pelo custo"
          className="col-span-2 lg:col-span-1"
        />
      </section>
      <InventoryManager products={products} />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-bronze-500" aria-hidden /> Últimas movimentações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {movements.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="font-semibold">{m.productName}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatDateTime(m.createdAt)} · {m.userName ?? "—"} {m.reason && `· ${m.reason}`}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone={m.type === "IN" ? "sage" : m.type === "OUT" ? "danger" : "neutral"}>
                      {INVENTORY_MOVEMENT_LABELS[m.type]}
                    </Badge>
                    <span className="tabular font-bold">
                      {m.quantityDelta > 0 ? "+" : ""}
                      {m.quantityDelta.toLocaleString("pt-BR")} {m.unit}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { ClientCard } from "@/components/clients/client-card";
import { NewClientButton } from "@/components/clients/new-client-button";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { can, requirePagePermission } from "@/lib/auth/session";
import { listClients } from "@/services/clients";
import { formatDate, formatDateKey } from "@/utils/dates";
import { formatPhone } from "@/utils/phone";

export const metadata = { title: "Clientes" };

type Search = { q?: string; status?: string; page?: string };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requirePagePermission("clients.view");
  const params = await searchParams;
  const status = params.status === "inactive" ? "inactive" : params.status === "all" ? "all" : "active";
  const page = Math.max(1, Number(params.page) || 1);
  const q = (params.q ?? "").slice(0, 100);
  const { rows, total, pageSize } = await listClients(user, { q, status, page });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const scoped = !can(user, "clients.view_all");

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status !== "active") sp.set("status", status);
    sp.set("page", String(p));
    return `/painel/clientes?${sp.toString()}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Relacionamento"
        title={scoped ? "Minhas clientes" : "Clientes"}
        description={`${total} cliente(s) ${status === "active" ? "ativas" : status === "inactive" ? "inativas" : "no total"}.`}
        actions={<NewClientButton />}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder="Buscar por nome, telefone ou WhatsApp" className="sm:max-w-sm" />
        <FilterBar
          label="Situação"
          param="status"
          defaultValue="active"
          options={[
            { value: "active", label: "Ativas" },
            { value: "inactive", label: "Inativas" },
            { value: "all", label: "Todas" },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? `Nenhuma cliente encontrada para “${q}”` : "Nenhuma cliente cadastrada"}
          description={q ? "Tente outro nome ou parte do telefone." : "Cadastre a primeira cliente para começar a agendar."}
          action={!q && <NewClientButton />}
        />
      ) : (
        <>
          <div className="grid gap-2 md:hidden">
            {rows.map((c) => (
              <ClientCard key={c.id} client={c} />
            ))}
          </div>
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Cliente</TableHead>
                  <TableHead>WhatsApp / Telefone</TableHead>
                  <TableHead>Aniversário</TableHead>
                  <TableHead className="text-right">Visitas</TableHead>
                  <TableHead>Última visita</TableHead>
                  <TableHead>Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id} className="group">
                    <TableCell>
                      <Link href={`/painel/clientes/${c.id}`} className="flex items-center gap-3 font-semibold group-hover:text-primary">
                        <Avatar name={c.name} color="#b58a58" size="sm" className="ring-0" />
                        {c.name}
                        {!c.isActive && <Badge tone="muted">Inativa</Badge>}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular text-muted-foreground">{formatPhone(c.whatsapp ?? c.phone) || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.birthDate ? formatDateKey(c.birthDate, "short") : "—"}</TableCell>
                    <TableCell className="tabular text-right font-semibold">{c.visits}</TableCell>
                    <TableCell className="text-muted-foreground">{c.lastVisitAt ? formatDate(c.lastVisitAt) : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          {pages > 1 && (
            <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginação">
              <span className="text-muted-foreground">
                Página {page} de {pages}
              </span>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
                  <Link href={pageHref(page - 1)} aria-disabled={page <= 1}>
                    <ChevronLeft /> Anterior
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className={page >= pages ? "pointer-events-none opacity-50" : ""}>
                  <Link href={pageHref(page + 1)} aria-disabled={page >= pages}>
                    Próxima <ChevronRight />
                  </Link>
                </Button>
              </div>
            </nav>
          )}
        </>
      )}
    </>
  );
}

import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { ServicesManager } from "@/components/services/services-manager";
import { can, requirePagePermission } from "@/lib/auth/session";
import { listServices } from "@/services/catalog";
import { listCategories, listProfessionalOptions } from "@/services/professionals";

export const metadata = { title: "Serviços" };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const user = await requirePagePermission("services.view");
  const params = await searchParams;
  const showInactive = params.status === "all" && can(user, "services.edit");
  const [services, categories, professionals] = await Promise.all([
    listServices(user, { includeInactive: showInactive }),
    listCategories(),
    listProfessionalOptions(user),
  ]);

  return (
    <>
      <PageHeader eyebrow="Catálogo" title="Serviços" description="Cabelo, unhas, cílios e sobrancelhas — duração, preço e comissão." />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder="Buscar serviço" />
        {can(user, "services.edit") && (
          <FilterBar
            label="Situação"
            param="status"
            defaultValue="active"
            options={[
              { value: "active", label: "Ativos" },
              { value: "all", label: "Todos" },
            ]}
          />
        )}
      </div>
      <ServicesManager
        query={params.q ?? ""}
        services={services}
        options={{
          categories: categories.map((c) => ({ id: c.id, name: c.name })),
          professionals: professionals.map((p) => ({ id: p.id, name: p.name, color: p.color })),
        }}
      />
    </>
  );
}

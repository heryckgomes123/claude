import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ProfessionalsManager } from "@/components/professionals/professionals-manager";
import { can, requirePagePermission } from "@/lib/auth/session";
import { listServices } from "@/services/catalog";
import { listCategories, listProfessionals } from "@/services/professionals";

export const metadata = { title: "Profissionais" };

export default async function ProfessionalsPage() {
  const user = await requirePagePermission("professionals.view");
  // Profissional vê apenas o próprio perfil.
  if (!can(user, "professionals.view_all") && user.professionalId) redirect(`/painel/profissionais/${user.professionalId}`);

  const [rows, categories, services] = await Promise.all([
    listProfessionals(user, { includeInactive: true }),
    listCategories(),
    listServices(user, { includeInactive: false }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Equipe"
        title="Profissionais"
        description="Especialidades, serviços habilitados, jornada e comissão de cada profissional."
      />
      <ProfessionalsManager
        catalog={{
          categories: categories.map((c) => ({ id: c.id, name: c.name })),
          services: services.map((s) => ({ id: s.id, name: s.name, categoryId: s.categoryId })),
        }}
        rows={rows.map((p) => ({
          id: p.id,
          name: p.name,
          title: p.title,
          photoUrl: p.photoUrl,
          phone: p.phone,
          color: p.color,
          defaultCommissionRate: p.defaultCommissionRate,
          isActive: p.isActive,
          specialtyNames: p.specialtyNames,
          serviceCount: p.serviceCount,
          categoryIds: p.specialties.map((s) => s.categoryId),
          serviceIds: p.services.map((s) => s.serviceId),
          schedule: p.schedules.map((s) => ({
            weekday: s.weekday,
            startMinute: s.startMinute,
            endMinute: s.endMinute,
            breakStartMinute: s.breakStartMinute,
            breakEndMinute: s.breakEndMinute,
          })),
        }))}
      />
    </>
  );
}

import { AppointmentActionsProvider } from "@/components/appointments/appointment-actions";
import { AppProvider } from "@/components/layout/app-context";
import { CommandMenuProvider } from "@/components/layout/command-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { QuickActionsProvider } from "@/components/layout/quick-actions";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { permissionsFor, ROLE_LABELS } from "@/config/permissions";
import { can, requireUser } from "@/lib/auth/session";
import { listServices } from "@/services/catalog";
import { getOpenRegisterStatus } from "@/services/cash";
import { listProfessionalOptions } from "@/services/professionals";
import { getBusinessSettings } from "@/services/settings";
import { formatDateKey, todayKey } from "@/utils/dates";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [settings, services, professionals, cash] = await Promise.all([
    getBusinessSettings(),
    listServices(user),
    listProfessionalOptions(user),
    can(user, "cash.view") ? getOpenRegisterStatus() : Promise.resolve(null),
  ]);

  const value = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleLabel: ROLE_LABELS[user.role],
      professionalId: user.professionalId,
    },
    permissions: permissionsFor(user.role),
    business: { name: settings.name, isDemo: settings.isDemo, cashOpen: cash !== null },
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      categoryName: s.categoryName,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
      professionalIds: s.professionals.map((p) => p.id),
    })),
    professionals: professionals.map((p) => ({ id: p.id, name: p.name, color: p.color, title: p.title, serviceIds: p.serviceIds })),
  };

  return (
    <AppProvider value={value}>
      <CommandMenuProvider>
        <QuickActionsProvider>
          <AppointmentActionsProvider>
            <div className="min-h-dvh lg:pl-[272px]">
              <Sidebar demo={settings.isDemo} />
              <Topbar todayLabel={formatDateKey(todayKey(), "long")} />
              <main id="conteudo" className="mx-auto max-w-[1400px] px-4 pt-6 pb-32 sm:px-6 lg:px-8 lg:pb-12">
                {children}
              </main>
              <MobileNav />
            </div>
          </AppointmentActionsProvider>
        </QuickActionsProvider>
      </CommandMenuProvider>
    </AppProvider>
  );
}

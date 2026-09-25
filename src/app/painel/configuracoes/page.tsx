import { Building2, CalendarClock, ShieldCheck, Users } from "lucide-react";
import { BusinessHoursForm } from "@/components/settings/business-hours-form";
import { CompanyForm } from "@/components/settings/company-form";
import { TeamManager } from "@/components/settings/team-manager";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { permissionsFor, ROLE_LABELS, ROLES } from "@/config/permissions";
import { can, requirePagePermission } from "@/lib/auth/session";
import { listProfessionalOptions } from "@/services/professionals";
import { getBusinessHours, getBusinessSettings } from "@/services/settings";
import { listUsers } from "@/services/users";

export const metadata = { title: "Configurações" };

const PERMISSION_GROUPS: { label: string; prefix: string }[] = [
  { label: "Agenda", prefix: "appointments." },
  { label: "Clientes", prefix: "clients." },
  { label: "Atendimento", prefix: "attendance." },
  { label: "Pagamentos", prefix: "payments." },
  { label: "Financeiro", prefix: "finance." },
  { label: "Caixa", prefix: "cash." },
  { label: "Comissões", prefix: "commissions." },
  { label: "Estoque", prefix: "inventory." },
  { label: "Configurações", prefix: "settings." },
];

export default async function SettingsPage() {
  const user = await requirePagePermission("settings.view");
  const manageUsers = can(user, "users.manage");
  const [settings, hours, users, professionals] = await Promise.all([
    getBusinessSettings(),
    getBusinessHours(),
    manageUsers ? listUsers(user) : Promise.resolve([]),
    manageUsers ? listProfessionalOptions(user) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader eyebrow="Sistema" title="Configurações" description="Empresa, equipe e funcionamento da agenda." />
      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa">
            <Building2 /> Empresa
          </TabsTrigger>
          {manageUsers && (
            <TabsTrigger value="equipe">
              <Users /> Equipe
            </TabsTrigger>
          )}
          <TabsTrigger value="agenda">
            <CalendarClock /> Agenda
          </TabsTrigger>
          <TabsTrigger value="perfis">
            <ShieldCheck /> Perfis de acesso
          </TabsTrigger>
        </TabsList>
        <TabsContent value="empresa">
          <Card>
            <CardContent className="pt-5">
              <CompanyForm company={settings} editable={can(user, "settings.company")} />
            </CardContent>
          </Card>
        </TabsContent>
        {manageUsers && (
          <TabsContent value="equipe">
            <TeamManager users={users} professionals={professionals.map((p) => ({ id: p.id, name: p.name }))} currentUserId={user.id} />
          </TabsContent>
        )}
        <TabsContent value="agenda">
          <Card>
            <CardContent className="pt-5">
              <p className="mb-4 text-sm text-muted-foreground">
                Dias e horários de funcionamento do salão. A jornada de cada profissional é definida no cadastro dela e sempre respeita
                estes limites.
              </p>
              <BusinessHoursForm days={hours} slotInterval={settings.slotIntervalMinutes} editable={can(user, "settings.schedule")} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="perfis">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {ROLES.map((role) => {
              const perms = permissionsFor(role);
              return (
                <Card key={role}>
                  <CardContent className="pt-5">
                    <p className="font-display text-2xl font-semibold">{ROLE_LABELS[role]}</p>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {PERMISSION_GROUPS.map((g) => {
                        const list = perms.filter((p) => p.startsWith(g.prefix));
                        const scoped =
                          role === "PROFESSIONAL" && ["appointments.", "clients.", "attendance.", "commissions."].includes(g.prefix);
                        return (
                          <li key={g.prefix} className="flex justify-between gap-2">
                            <span className={list.length ? "" : "text-muted-foreground line-through"}>{g.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {list.length ? (scoped ? "somente os próprios" : `${list.length} permissão(ões)`) : "sem acesso"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

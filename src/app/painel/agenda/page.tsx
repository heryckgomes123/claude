import { AgendaView } from "@/components/agenda/agenda-view";
import { PageHeader } from "@/components/shared/page-header";
import { can, requirePagePermission } from "@/lib/auth/session";
import { getAgendaData } from "@/services/agenda";
import { getAppointment } from "@/services/appointments";
import { listProfessionalOptions } from "@/services/professionals";
import { isValidDateKey, todayKey, toDateKey } from "@/utils/dates";

export const metadata = { title: "Agenda" };

type Search = { date?: string; view?: string; professional?: string; appointment?: string };

export default async function AgendaPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requirePagePermission("appointments.view");
  const params = await searchParams;
  const view = params.view === "week" ? "week" : "day";
  let date = params.date && isValidDateKey(params.date) ? params.date : todayKey();

  // Link direto para um agendamento: abre no dia correto.
  if (params.appointment && !params.date && /^[0-9a-f-]{36}$/i.test(params.appointment)) {
    try {
      const appt = await getAppointment(user, params.appointment);
      date = toDateKey(appt.startsAt);
    } catch {
      /* sem acesso ou inexistente: ignora */
    }
  }

  const professionalId = params.professional && /^[0-9a-f-]{36}$/i.test(params.professional) ? params.professional : null;
  const [data, allProfessionals] = await Promise.all([getAgendaData(user, { date, view, professionalId }), listProfessionalOptions(user)]);
  const isProfessional = !can(user, "appointments.view_all");

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title={isProfessional ? "Minha agenda" : "Agenda"}
        description={
          isProfessional ? "Seus horários, clientes e atendimentos." : "Disponibilidade por profissional, sem conflitos de horário."
        }
      />
      <AgendaView
        data={{
          ...data,
          date,
          view,
          professionalId: isProfessional ? null : professionalId,
          allProfessionals: isProfessional ? [] : allProfessionals.map((p) => ({ id: p.id, name: p.name, color: p.color })),
        }}
        focusAppointmentId={params.appointment}
      />
    </>
  );
}

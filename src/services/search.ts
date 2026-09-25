import "server-only";
import { and, asc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, clients, professionals, services } from "@/db/schema";
import { can, type SessionUser } from "@/lib/auth/session";
import { dayRange, todayKey } from "@/utils/dates";
import { escapeLike } from "@/utils/text";
import { quickSearchClients } from "./clients";

export type SearchResults = {
  clients: { id: string; name: string; phone: string | null }[];
  professionals: { id: string; name: string; title: string }[];
  services: { id: string; name: string; priceCents: number }[];
  appointments: { id: string; startsAt: Date; clientName: string; serviceName: string; professionalName: string }[];
};

/** Busca global (Ctrl+K). Cada grupo respeita as permissões e o escopo do perfil. */
export async function globalSearch(actor: SessionUser, q: string): Promise<SearchResults> {
  const term = q.trim();
  const empty: SearchResults = { clients: [], professionals: [], services: [], appointments: [] };
  if (term.length < 2) return empty;
  const like = `%${escapeLike(term)}%`;
  const profScope = can(actor, "appointments.view_all") ? null : actor.professionalId;

  const [clientRows, professionalRows, serviceRows, appointmentRows] = await Promise.all([
    can(actor, "clients.view") ? quickSearchClients(actor, term, 5) : [],
    can(actor, "professionals.view")
      ? db
          .select({ id: professionals.id, name: professionals.name, title: professionals.title })
          .from(professionals)
          .where(
            and(
              ilike(professionals.name, like),
              can(actor, "professionals.view_all") ? undefined : eq(professionals.id, actor.professionalId ?? ""),
            ),
          )
          .limit(4)
      : [],
    can(actor, "services.view")
      ? db
          .select({ id: services.id, name: services.name, priceCents: services.priceCents })
          .from(services)
          .where(and(eq(services.isActive, true), ilike(services.name, like)))
          .limit(5)
      : [],
    can(actor, "appointments.view")
      ? db
          .select({
            id: appointments.id,
            startsAt: appointments.startsAt,
            clientName: clients.name,
            serviceName: services.name,
            professionalName: professionals.name,
          })
          .from(appointments)
          .innerJoin(clients, eq(clients.id, appointments.clientId))
          .innerJoin(services, eq(services.id, appointments.serviceId))
          .innerJoin(professionals, eq(professionals.id, appointments.professionalId))
          .where(
            and(
              gte(appointments.startsAt, dayRange(todayKey()).start),
              sql`${appointments.status} in ('SCHEDULED','CONFIRMED','ARRIVED','IN_SERVICE')`,
              or(ilike(clients.name, like), ilike(services.name, like)),
              profScope ? eq(appointments.professionalId, profScope) : undefined,
            ),
          )
          .orderBy(asc(appointments.startsAt))
          .limit(5)
      : [],
  ]);

  return {
    clients: clientRows.map((c) => ({ id: c.id, name: c.name, phone: c.phone ?? c.whatsapp })),
    professionals: professionalRows,
    services: serviceRows,
    appointments: appointmentRows,
  };
}

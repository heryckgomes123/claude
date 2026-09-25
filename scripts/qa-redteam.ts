/**
 * QA / Red team de backend: executa regras de negócio e RBAC direto nos services,
 * como cada perfil. Uso (dev, banco com seed): npx tsx --conditions=react-server scripts/qa-redteam.ts
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, attendances, clients, professionals, services, users } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { cashTransactionInput, openCashInput } from "@/schemas/cash";
import { discountInput, paymentInput } from "@/schemas/attendance";
import { appointmentInput } from "@/schemas/appointment";
import { createAppointment, getAppointment, listAppointments } from "@/services/appointments";
import { finishAttendance, setAttendanceDiscount, startAttendance } from "@/services/attendance";
import { getCurrentCash, openCashRegister } from "@/services/cash";
import { getClientProfile } from "@/services/clients";
import { listCommissions, markCommissionsPaid } from "@/services/commissions";
import { getFinanceOverview } from "@/services/finance";
import { registerPayment } from "@/services/payments";
import { updateCompany } from "@/services/settings";
import { createUser } from "@/services/users";
import { addDays, todayKey, weekdayOf } from "@/utils/dates";
import { resolvePeriod } from "@/utils/period";

let passed = 0;
let failed = 0;
function ok(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}
async function expectError(name: string, fn: () => Promise<unknown>, match: RegExp) {
  try {
    await fn();
    ok(name, false, "não lançou erro");
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    ok(name, match.test(msg), msg.slice(0, 140));
  }
}

async function actor(email: string): Promise<SessionUser> {
  const [u] = await db.select().from(users).where(eq(users.email, email));
  return { id: u.id, name: u.name, email: u.email, role: u.role, professionalId: u.professionalId, sessionId: "qa" };
}

async function main() {
  const owner = await actor("proprietaria@rbeauty.demo");
  const reception = await actor("recepcao@rbeauty.demo");
  const pro = await actor("ana@rbeauty.demo");
  const [ana] = await db.select().from(professionals).where(eq(professionals.name, "Ana Beatriz Rocha"));
  const [carla] = await db.select().from(professionals).where(eq(professionals.name, "Carla Mendes"));
  const [corte] = await db.select().from(services).where(eq(services.name, "Corte feminino"));
  const [manicure] = await db.select().from(services).where(eq(services.name, "Manicure"));
  const [client] = await db.select().from(clients).where(eq(clients.name, "Débora Fernandes"));

  // Próximo dia útil (terça a sexta) daqui a pelo menos 2 dias.
  let day = addDays(todayKey(), 2);
  while (![2, 3, 4, 5].includes(weekdayOf(day))) day = addDays(day, 1);

  console.log(`\n— Conflito de agenda (${day})`);
  const a = await createAppointment(
    reception,
    appointmentInput.parse({ clientId: client.id, serviceId: corte.id, professionalId: ana.id, date: day, time: "14:00" }),
  );
  ok("cria Ana 14:00–15:00", !!a.id);
  await expectError(
    "bloqueia Ana 14:30 (sobreposição)",
    () =>
      createAppointment(
        reception,
        appointmentInput.parse({ clientId: client.id, serviceId: corte.id, professionalId: ana.id, date: day, time: "14:30" }),
      ),
    /Conflito de horário/,
  );
  await expectError(
    "bloqueia Ana 13:30 (termina dentro)",
    () =>
      createAppointment(
        reception,
        appointmentInput.parse({ clientId: client.id, serviceId: corte.id, professionalId: ana.id, date: day, time: "13:45" }),
      ),
    /Conflito|pausa/,
  );
  const adj = await createAppointment(
    reception,
    appointmentInput.parse({ clientId: client.id, serviceId: corte.id, professionalId: ana.id, date: day, time: "15:00" }),
  );
  ok("permite horário adjacente 15:00", !!adj.id);
  await expectError(
    "bloqueia fora do expediente (20:00)",
    () =>
      createAppointment(
        reception,
        appointmentInput.parse({ clientId: client.id, serviceId: corte.id, professionalId: ana.id, date: day, time: "19:30" }),
      ),
    /expediente/,
  );
  await expectError(
    "bloqueia profissional não habilitada (Carla + corte)",
    () =>
      createAppointment(
        reception,
        appointmentInput.parse({ clientId: client.id, serviceId: corte.id, professionalId: carla.id, date: day, time: "10:00" }),
      ),
    /não está habilitada/,
  );
  await expectError(
    "bloqueia data passada",
    () =>
      createAppointment(
        reception,
        appointmentInput.parse({
          clientId: client.id,
          serviceId: manicure.id,
          professionalId: carla.id,
          date: addDays(todayKey(), -1),
          time: "10:00",
        }),
      ),
    /passada/,
  );

  console.log("\n— Concorrência (2 requisições simultâneas no mesmo horário)");
  const race = await Promise.allSettled(
    [0, 1].map(() =>
      createAppointment(
        reception,
        appointmentInput.parse({ clientId: client.id, serviceId: manicure.id, professionalId: carla.id, date: day, time: "16:00" }),
      ),
    ),
  );
  ok("apenas 1 criado", race.filter((r) => r.status === "fulfilled").length === 1, race.map((r) => r.status).join(", "));

  console.log("\n— Exclusion constraint (inserção direta no banco, ignorando a aplicação)");
  try {
    const [{ startsAt }] = await db.select({ startsAt: appointments.startsAt }).from(appointments).where(eq(appointments.id, a.id));
    await db.insert(appointments).values({
      clientId: client.id,
      professionalId: ana.id,
      serviceId: corte.id,
      startsAt: new Date(startsAt.getTime() + 10 * 60_000),
      endsAt: new Date(startsAt.getTime() + 40 * 60_000),
      durationMinutes: 30,
      priceCents: 100,
    });
    ok("banco rejeita sobreposição", false, "inseriu!");
  } catch (e) {
    const code = (e as { cause?: { code?: string } }).cause?.code;
    ok("banco rejeita sobreposição", code === "23P01", `código ${code}`);
  }

  console.log("\n— RBAC: PROFISSIONAL (Ana)");
  const own = await listAppointments(pro, { from: addDays(todayKey(), -30), to: addDays(todayKey(), 30) });
  ok("vê apenas a própria agenda", own.length > 0 && own.every((x) => x.professionalId === ana.id), `${own.length} itens`);
  const [carlaAppt] = await db.select({ id: appointments.id }).from(appointments).where(eq(appointments.professionalId, carla.id)).limit(1);
  await expectError(
    "não abre agendamento de outra profissional (ID alterado)",
    () => getAppointment(pro, carlaAppt.id),
    /Forbidden|próprios/,
  );
  await expectError("não inicia atendimento de outra profissional", () => startAttendance(pro, carlaAppt.id), /Forbidden|próprios/);
  const [foreignClient] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(sql`not exists (select 1 from appointments a where a.client_id = ${clients.id} and a.professional_id = ${ana.id})`)
    .limit(1);
  await expectError("não abre perfil de cliente fora da carteira", () => getClientProfile(pro, foreignClient.id), /Forbidden|carteira/);
  await expectError("não acessa financeiro", () => getFinanceOverview(pro, resolvePeriod({})), /Forbidden/);
  await expectError("não acessa caixa", () => getCurrentCash(pro), /Forbidden/);
  await expectError(
    "não cria agendamento",
    () =>
      createAppointment(
        pro,
        appointmentInput.parse({ clientId: client.id, serviceId: corte.id, professionalId: ana.id, date: day, time: "10:00" }),
      ),
    /Forbidden/,
  );
  const ownComm = await listCommissions(pro, { from: addDays(todayKey(), -60), to: todayKey() });
  ok(
    "comissões: apenas as próprias",
    ownComm.rows.every((r) => r.professionalId === ana.id),
    `${ownComm.rows.length} linhas`,
  );
  await expectError(
    "não fecha/paga comissões",
    () =>
      markCommissionsPaid(
        pro,
        ownComm.rows.slice(0, 1).map((r) => r.id),
      ),
    /Forbidden/,
  );
  await expectError(
    "não registra pagamento",
    () => registerPayment(pro, paymentInput.parse({ attendanceId: carlaAppt.id, method: "PIX" })),
    /Forbidden/,
  );

  console.log("\n— RBAC: RECEPÇÃO");
  await expectError(
    "não altera dados da empresa",
    () => updateCompany(reception, { name: "X", logoUrl: null, phone: null, whatsapp: null, instagram: null, address: null }),
    /Forbidden/,
  );
  await expectError(
    "não cria usuários",
    () => createUser(reception, { name: "X", email: "x@x.com", role: "OWNER", professionalId: null, password: "12345678" }),
    /Forbidden/,
  );
  await expectError("não acessa financeiro", () => getFinanceOverview(reception, resolvePeriod({})), /Forbidden/);
  await expectError("não paga comissões", () => markCommissionsPaid(reception, [a.id]), /Forbidden/);

  console.log("\n— Atendimento / pagamento inválidos");
  await expectError(
    "finalizar atendimento inexistente",
    () => finishAttendance(owner, "00000000-0000-4000-8000-000000000000"),
    /não encontrado/,
  );
  const att = await startAttendance(reception, adj.id);
  ok("inicia atendimento a partir do agendamento", !!att.id);
  await expectError(
    "pagamento antes de finalizar",
    () => registerPayment(reception, paymentInput.parse({ attendanceId: att.id, method: "PIX" })),
    /Finalize/,
  );
  await expectError("desconto maior que o subtotal", () => setAttendanceDiscount(reception, att.id, 999_999_00), /maior que o subtotal/);
  ok("schema rejeita desconto negativo", !discountInput.safeParse({ attendanceId: att.id, discountCents: -500 }).success);
  ok(
    "schema rejeita movimentação negativa",
    !cashTransactionInput.safeParse({ type: "EXPENSE", amountCents: -100, description: "x y" }).success,
  );
  ok("schema rejeita saldo inicial negativo", !openCashInput.safeParse({ openingBalanceCents: -1 }).success);
  ok("schema rejeita parcelas inválidas", !paymentInput.safeParse({ attendanceId: att.id, method: "PIX", installments: 3 }).success);
  ok("schema rejeita forma de pagamento inventada", !paymentInput.safeParse({ attendanceId: att.id, method: "BITCOIN" }).success);

  await setAttendanceDiscount(reception, att.id, 2000);
  await finishAttendance(reception, att.id);
  if (!(await getCurrentCash(owner))) await openCashRegister(reception, { openingBalanceCents: 10000, notes: "QA" });
  {
    const paid = await registerPayment(reception, paymentInput.parse({ attendanceId: att.id, method: "PIX" }));
    ok("pagamento com desconto: R$120 − R$20 = R$100", paid.amountCents === 10000, `valor ${paid.amountCents}`);
    ok("comissão sobre valor líquido (40% de R$100 = R$40)", paid.commissionCents === 4000, `comissão ${paid.commissionCents}`);
    await expectError(
      "pagamento duplicado",
      () => registerPayment(reception, paymentInput.parse({ attendanceId: att.id, method: "PIX" })),
      /já foi pago/,
    );
    await expectError("não altera desconto após pago", () => setAttendanceDiscount(owner, att.id, 0), /Não é possível alterar/);
    const [row] = await db
      .select({ status: attendances.status })
      .from(attendances)
      .where(and(eq(attendances.id, att.id)));
    ok("atendimento marcado como PAGO", row.status === "PAID");
  }

  console.log(`\nResultado: ${passed} ok, ${failed} falha(s)`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

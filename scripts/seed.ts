/**
 * SEED DE DEMONSTRAÇÃO — R BEAUTY OS
 * Dados fictícios (DEMO / SEED), gerados de forma determinística e relativa à data atual,
 * para que o Command Center abra apresentável. Recrie com: npm run db:reset
 */
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { calculateCommissions } from "../src/services/commissions-calc";
import { addDays, toDateKey, todayKey, weekdayOf, zonedDateTime } from "../src/utils/dates";
import { connect, schema } from "./db";

const DEMO_PASSWORD = "RBeauty@2026";

// PRNG determinístico (mulberry32) — mesmo seed, mesmos dados.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = rng(20260925);
const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];

const CATEGORIES = [
  { slug: "cabelo", name: "Cabelo", sortOrder: 1 },
  { slug: "unhas", name: "Unhas", sortOrder: 2 },
  { slug: "cilios", name: "Cílios", sortOrder: 3 },
  { slug: "sobrancelhas", name: "Sobrancelhas", sortOrder: 4 },
];

const SERVICES = [
  {
    key: "corte",
    name: "Corte feminino",
    cat: "cabelo",
    duration: 60,
    price: 12000,
    rate: null,
    desc: "Corte personalizado com lavagem e finalização simples.",
  },
  {
    key: "escova",
    name: "Escova modelada",
    cat: "cabelo",
    duration: 45,
    price: 7000,
    rate: null,
    desc: "Escova com modelagem e acabamento.",
  },
  {
    key: "corte_escova",
    name: "Corte + Escova",
    cat: "cabelo",
    duration: 90,
    price: 17000,
    rate: null,
    desc: "Combo corte feminino e escova modelada.",
  },
  {
    key: "hidratacao",
    name: "Hidratação profunda",
    cat: "cabelo",
    duration: 60,
    price: 15000,
    rate: 35,
    desc: "Tratamento de reconstrução e brilho.",
  },
  {
    key: "coloracao",
    name: "Coloração raiz",
    cat: "cabelo",
    duration: 120,
    price: 22000,
    rate: 35,
    desc: "Retoque de raiz com coloração profissional.",
  },
  {
    key: "mechas",
    name: "Mechas e luzes",
    cat: "cabelo",
    duration: 180,
    price: 48000,
    rate: 35,
    desc: "Iluminação com técnica personalizada.",
  },
  { key: "manicure", name: "Manicure", cat: "unhas", duration: 45, price: 4500, rate: null, desc: "Cutilagem e esmaltação tradicional." },
  {
    key: "pedicure",
    name: "Pedicure",
    cat: "unhas",
    duration: 50,
    price: 5500,
    rate: null,
    desc: "Cutilagem, lixamento e esmaltação dos pés.",
  },
  { key: "pe_mao", name: "Pé e mão", cat: "unhas", duration: 90, price: 9000, rate: null, desc: "Manicure e pedicure completas." },
  {
    key: "gel",
    name: "Alongamento em gel",
    cat: "unhas",
    duration: 120,
    price: 22000,
    rate: null,
    desc: "Alongamento com molde e acabamento em gel.",
  },
  {
    key: "fio_a_fio",
    name: "Extensão de cílios fio a fio",
    cat: "cilios",
    duration: 120,
    price: 26000,
    rate: null,
    desc: "Aplicação clássica fio a fio.",
  },
  {
    key: "manut_cilios",
    name: "Manutenção de cílios",
    cat: "cilios",
    duration: 75,
    price: 15000,
    rate: null,
    desc: "Reposição de fios em até 21 dias.",
  },
  {
    key: "lash_lifting",
    name: "Lash lifting",
    cat: "cilios",
    duration: 60,
    price: 16000,
    rate: null,
    desc: "Curvatura e nutrição dos cílios naturais.",
  },
  {
    key: "design",
    name: "Design de sobrancelhas",
    cat: "sobrancelhas",
    duration: 30,
    price: 5500,
    rate: null,
    desc: "Design com pinça e visagismo.",
  },
  {
    key: "henna",
    name: "Design com henna",
    cat: "sobrancelhas",
    duration: 45,
    price: 7500,
    rate: null,
    desc: "Design com aplicação de henna.",
  },
] as const;
type ServiceKey = (typeof SERVICES)[number]["key"];

const WORK_WEEK = (days: number[], start = 9 * 60, end = 19 * 60) =>
  days.map((weekday) => ({
    weekday,
    startMinute: weekday === 6 ? 8 * 60 : start,
    endMinute: weekday === 6 ? 17 * 60 : end,
    breakStartMinute: weekday === 6 ? null : 12 * 60 + 30,
    breakEndMinute: weekday === 6 ? null : 13 * 60 + 30,
  }));

const PROFESSIONALS = [
  {
    key: "ana",
    name: "Ana Beatriz Rocha",
    title: "Cabeleireira",
    color: "#B4583F",
    rate: 40,
    phone: "11987012345",
    cats: ["cabelo"],
    services: ["corte", "escova", "corte_escova", "hidratacao", "coloracao", "mechas"] as ServiceKey[],
    schedule: WORK_WEEK([1, 2, 3, 4, 5, 6]),
  },
  {
    key: "carla",
    name: "Carla Mendes",
    title: "Nail designer",
    color: "#6F7F5E",
    rate: 45,
    phone: "11987023456",
    cats: ["unhas"],
    services: ["manicure", "pedicure", "pe_mao", "gel"] as ServiceKey[],
    schedule: WORK_WEEK([2, 3, 4, 5, 6]),
  },
  {
    key: "julia",
    name: "Júlia Farias",
    title: "Lash & brow designer",
    color: "#7C5A7A",
    rate: 40,
    phone: "11987034567",
    cats: ["cilios", "sobrancelhas"],
    services: ["fio_a_fio", "manut_cilios", "lash_lifting", "design", "henna"] as ServiceKey[],
    schedule: WORK_WEEK([1, 2, 3, 4, 5, 6], 10 * 60, 19 * 60),
  },
  {
    key: "renata",
    name: "Renata Alves",
    title: "Colorista",
    color: "#9C7248",
    rate: 40,
    phone: "11987045678",
    cats: ["cabelo", "sobrancelhas"],
    services: ["escova", "hidratacao", "coloracao", "mechas", "design", "henna"] as ServiceKey[],
    schedule: WORK_WEEK([2, 3, 4, 5, 6]),
  },
] as const;

const CLIENTS = [
  ["Maria Silva", "11991234501", "1990-03-14", "Prefere horários pela manhã."],
  ["Juliana Costa", "11991234502", "1988-07-22", null],
  ["Fernanda Oliveira", "11991234503", "1995-11-05", "Alergia a amônia — usar coloração sem amônia."],
  ["Camila Souza", "11991234504", "1992-01-30", null],
  ["Patrícia Lima", "11991234505", "1985-09-18", "Cliente desde a inauguração."],
  ["Beatriz Martins", "11991234506", "1999-12-02", null],
  ["Larissa Pereira", "11991234507", "1997-05-11", "Gosta de café sem açúcar."],
  ["Gabriela Ribeiro", "11991234508", "1993-08-27", null],
  ["Amanda Carvalho", "11991234509", "1991-02-19", "Sensibilidade no couro cabeludo."],
  ["Renata Gomes", "11991234510", "1987-10-09", null],
  ["Vanessa Rocha", "11991234511", "1994-04-03", null],
  ["Letícia Almeida", "11991234512", "2000-06-16", "Faz manutenção de cílios a cada 15 dias."],
  ["Bruna Nascimento", "11991234513", "1996-09-25", null],
  ["Aline Barbosa", "11991234514", "1989-12-21", null],
  ["Tatiane Freitas", "11991234515", "1983-03-08", "Prefere Carla para unhas."],
  ["Priscila Duarte", "11991234516", "1998-07-01", null],
  ["Carolina Teixeira", "11991234517", "1992-11-13", null],
  ["Isabela Moreira", "11991234518", "2001-01-27", null],
  ["Natália Cardoso", "11991234519", "1990-05-30", "Evitar sábados."],
  ["Débora Fernandes", "11991234520", "1986-08-04", null],
] as const;

const PRODUCTS = [
  { name: "Shampoo profissional 1L", category: "Cabelo", unit: "un", quantity: 8, min: 3, cost: 6890 },
  { name: "Máscara de hidratação 500g", category: "Cabelo", unit: "un", quantity: 5, min: 2, cost: 8990 },
  { name: "Oxidante 20 volumes 900ml", category: "Coloração", unit: "un", quantity: 2, min: 3, cost: 2490 },
  { name: "Coloração tubo 60g", category: "Coloração", unit: "un", quantity: 24, min: 10, cost: 2290 },
  { name: "Pó descolorante 500g", category: "Coloração", unit: "un", quantity: 3, min: 2, cost: 11900 },
  { name: "Esmalte cremoso", category: "Unhas", unit: "un", quantity: 46, min: 20, cost: 890 },
  { name: "Gel construtor 24g", category: "Unhas", unit: "un", quantity: 4, min: 2, cost: 7490 },
  { name: "Removedor de esmalte 500ml", category: "Unhas", unit: "un", quantity: 6, min: 2, cost: 1590 },
  { name: "Cola para cílios 5ml", category: "Cílios", unit: "un", quantity: 1, min: 2, cost: 8900 },
  { name: "Fios de cílios 0.15 mix", category: "Cílios", unit: "cx", quantity: 6, min: 3, cost: 4590 },
  { name: "Henna para sobrancelhas", category: "Sobrancelhas", unit: "un", quantity: 2, min: 2, cost: 3990 },
  { name: "Luvas descartáveis (100)", category: "Descartáveis", unit: "cx", quantity: 7, min: 2, cost: 3290 },
];

type Planned = {
  professionalKey: (typeof PROFESSIONALS)[number]["key"];
  serviceKey: ServiceKey;
  clientIndex: number;
  startsAt: Date;
  endsAt: Date;
  status: "SCHEDULED" | "CONFIRMED" | "ARRIVED" | "IN_SERVICE" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  attendance?: "IN_PROGRESS" | "AWAITING_PAYMENT" | "PAID";
  discount?: number;
};

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Seed de demonstração bloqueado em produção (defina ALLOW_DEMO_SEED=true para forçar).");
  }
  const { db, client } = connect();
  const s = schema;

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(s.users);
  if (count > 0) {
    console.log("• O banco já possui dados. Para recriar o seed use: npm run db:reset");
    await client.end();
    return;
  }

  const now = new Date();
  const today = todayKey();

  await db.transaction(async (tx) => {
    /* Empresa e funcionamento */
    await tx.insert(s.businessSettings).values({
      id: 1,
      name: "R Beauty",
      phone: "1130457788",
      whatsapp: "11991230000",
      instagram: "rbeauty.salao",
      address: "Rua das Acácias, 245 — Jardim Paulista, São Paulo/SP",
      slotIntervalMinutes: 15,
      isDemo: true,
    });
    await tx.insert(s.businessHours).values(
      Array.from({ length: 7 }, (_, weekday) => ({
        weekday,
        isOpen: weekday !== 0,
        openMinute: weekday === 6 ? 8 * 60 : 9 * 60,
        closeMinute: weekday === 6 ? 17 * 60 : 19 * 60,
        breakStartMinute: null,
        breakEndMinute: null,
      })),
    );

    /* Catálogo */
    const categories = await tx.insert(s.serviceCategories).values(CATEGORIES).returning();
    const catId = (slug: string) => categories.find((c) => c.slug === slug)!.id;

    const services = await tx
      .insert(s.services)
      .values(
        SERVICES.map((sv) => ({
          name: sv.name,
          categoryId: catId(sv.cat),
          description: sv.desc,
          durationMinutes: sv.duration,
          priceCents: sv.price,
          commissionRate: sv.rate,
          isDemo: true,
        })),
      )
      .returning();
    const serviceByKey = (key: ServiceKey) => services[SERVICES.findIndex((sv) => sv.key === key)];

    /* Profissionais */
    const professionals = await tx
      .insert(s.professionals)
      .values(
        PROFESSIONALS.map((p) => ({
          name: p.name,
          title: p.title,
          color: p.color,
          phone: p.phone,
          defaultCommissionRate: p.rate,
          isDemo: true,
        })),
      )
      .returning();
    const profByKey = (key: string) => professionals[PROFESSIONALS.findIndex((p) => p.key === key)];

    for (const [i, p] of PROFESSIONALS.entries()) {
      const id = professionals[i].id;
      await tx.insert(s.professionalSpecialties).values(p.cats.map((c) => ({ professionalId: id, categoryId: catId(c) })));
      await tx.insert(s.professionalServices).values(p.services.map((k) => ({ professionalId: id, serviceId: serviceByKey(k).id })));
      await tx.insert(s.professionalSchedules).values(p.schedule.map((d) => ({ ...d, professionalId: id })));
    }

    /* Usuários de teste (DEMO) */
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 11);
    const users = await tx
      .insert(s.users)
      .values([
        { name: "Rafaela Duarte", email: "proprietaria@rbeauty.demo", role: "OWNER" as const, passwordHash, isDemo: true },
        { name: "Marcela Nunes", email: "gerente@rbeauty.demo", role: "MANAGER" as const, passwordHash, isDemo: true },
        { name: "Paula Ramos", email: "recepcao@rbeauty.demo", role: "RECEPTION" as const, passwordHash, isDemo: true },
        {
          name: "Ana Beatriz Rocha",
          email: "ana@rbeauty.demo",
          role: "PROFESSIONAL" as const,
          passwordHash,
          professionalId: profByKey("ana").id,
          isDemo: true,
        },
      ])
      .returning();
    const reception = users[2];
    const owner = users[0];

    /* Clientes */
    const clients = await tx
      .insert(s.clients)
      .values(
        CLIENTS.map(([name, phone, birthDate, notes], i) => ({
          name,
          phone,
          whatsapp: phone,
          email: `${name.split(" ")[0].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()}.${i + 1}@exemplo.com`,
          birthDate,
          notes,
          isDemo: true,
          createdAt: new Date(now.getTime() - (120 - i * 4) * 86_400_000),
        })),
      )
      .returning();

    /* Planejamento de agendamentos (sem sobreposição por profissional) */
    const planned: Planned[] = [];
    const cursor = new Map<string, number>();

    function plan(dateKey: string, profKey: Planned["professionalKey"], serviceKey: ServiceKey, clientIndex: number, startMinute?: number) {
      const prof = PROFESSIONALS.find((p) => p.key === profKey)!;
      const day = prof.schedule.find((d) => d.weekday === weekdayOf(dateKey));
      if (!day) return null;
      const sv = SERVICES.find((x) => x.key === serviceKey)!;
      const key = `${dateKey}:${profKey}`;
      let start = startMinute ?? cursor.get(key) ?? day.startMinute;
      if (day.breakStartMinute != null && start < day.breakEndMinute! && start + sv.duration > day.breakStartMinute) {
        start = day.breakEndMinute!;
      }
      if (start + sv.duration > day.endMinute) return null;
      cursor.set(key, start + sv.duration + pick([0, 15, 15, 30, 45]));
      const startsAt = zonedDateTime(dateKey, start);
      const item: Planned = {
        professionalKey: profKey,
        serviceKey,
        clientIndex,
        startsAt,
        endsAt: new Date(startsAt.getTime() + sv.duration * 60_000),
        status: "SCHEDULED",
      };
      planned.push(item);
      return item;
    }

    const serviceOf = (profKey: Planned["professionalKey"]) => pick(PROFESSIONALS.find((p) => p.key === profKey)!.services);
    const profKeys = PROFESSIONALS.map((p) => p.key);

    // Histórico: últimos 21 dias (~22 agendamentos passados).
    let clientCursor = 0;
    for (let back = 21; back >= 1 && planned.length < 22; back -= 1) {
      const dateKey = addDays(today, -back);
      const profKey = profKeys[back % profKeys.length];
      const second = profKeys[(back + 1) % profKeys.length];
      for (const pk of back % 3 === 0 ? [profKey, second] : [profKey]) {
        const item = plan(dateKey, pk, serviceOf(pk), clientCursor++ % CLIENTS.length);
        if (!item) continue;
        item.status = "COMPLETED";
        item.attendance = "PAID";
        if (random() < 0.15) item.discount = 1000;
      }
    }
    // Um cancelamento e uma falta no histórico.
    const past = planned.filter((p) => p.status === "COMPLETED");
    if (past.length > 3) {
      past[1].status = "CANCELLED";
      past[1].attendance = undefined;
      past[3].status = "NO_SHOW";
      past[3].attendance = undefined;
    }

    // Hoje: agenda cheia com status coerentes com o horário atual.
    const todayPlan: [Planned["professionalKey"], ServiceKey, number][] = [
      ["ana", "corte_escova", 0],
      ["ana", "coloracao", 3],
      ["ana", "escova", 7],
      ["carla", "manicure", 1],
      ["carla", "pe_mao", 14],
      ["carla", "gel", 5],
      ["julia", "manut_cilios", 11],
      ["julia", "design", 6],
      ["julia", "lash_lifting", 9],
      ["renata", "hidratacao", 2],
      ["renata", "mechas", 12],
    ];
    const todayItems = todayPlan.map(([pk, sk, ci]) => plan(today, pk, sk, ci)).filter((x): x is Planned => x !== null);
    const nowMs = now.getTime();
    for (const item of todayItems) {
      if (item.endsAt.getTime() <= nowMs) {
        item.status = "COMPLETED";
        item.attendance = "PAID";
      } else if (item.startsAt.getTime() <= nowMs) {
        item.status = "IN_SERVICE";
        item.attendance = "IN_PROGRESS";
      } else if (item.startsAt.getTime() - nowMs <= 30 * 60_000) {
        item.status = "ARRIVED";
      } else {
        item.status = random() < 0.6 ? "CONFIRMED" : "SCHEDULED";
      }
    }
    const finishedToday = todayItems.filter((i) => i.attendance === "PAID");
    if (finishedToday.length) {
      const last = finishedToday[finishedToday.length - 1];
      last.status = "IN_SERVICE";
      last.attendance = "AWAITING_PAYMENT";
    }
    const cancelledToday = todayItems.find((i) => i.status === "SCHEDULED");
    if (cancelledToday) cancelledToday.status = "CANCELLED";

    // Próximos 6 dias.
    for (let ahead = 1; ahead <= 6; ahead++) {
      const dateKey = addDays(today, ahead);
      for (const pk of profKeys) {
        if (random() < 0.45) continue;
        const item = plan(dateKey, pk, serviceOf(pk), clientCursor++ % CLIENTS.length);
        if (item) item.status = ahead <= 2 && random() < 0.5 ? "CONFIRMED" : "SCHEDULED";
      }
    }

    /* Persistência: agendamentos, atendimentos, pagamentos, comissões e caixa */
    const registerByDay = new Map<string, { id: string; opening: number; cash: number }>();
    async function registerFor(dateKey: string) {
      let reg = registerByDay.get(dateKey);
      if (reg) return reg;
      const isToday = dateKey === today;
      const [created] = await tx
        .insert(s.cashRegisters)
        .values({
          status: "CLOSED", // fechado ao final; o de hoje é reaberto abaixo
          openedAt: zonedDateTime(dateKey, 8 * 60 + 45),
          openedById: reception.id,
          openingBalanceCents: 20000,
          notes: isToday ? null : "DEMO / SEED",
        })
        .returning({ id: s.cashRegisters.id });
      reg = { id: created.id, opening: 20000, cash: 20000 };
      registerByDay.set(dateKey, reg);
      return reg;
    }

    let payments = 0;
    for (const item of planned.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())) {
      const prof = profByKey(item.professionalKey);
      const sv = serviceByKey(item.serviceKey);
      const clientRow = clients[item.clientIndex];
      const dateKey = toDateKey(item.startsAt);
      const [appt] = await tx
        .insert(s.appointments)
        .values({
          clientId: clientRow.id,
          professionalId: prof.id,
          serviceId: sv.id,
          startsAt: item.startsAt,
          endsAt: item.endsAt,
          durationMinutes: sv.durationMinutes,
          priceCents: sv.priceCents,
          status: item.status,
          confirmedAt: ["CONFIRMED", "ARRIVED", "IN_SERVICE", "COMPLETED"].includes(item.status)
            ? new Date(item.startsAt.getTime() - 86_400_000)
            : null,
          arrivedAt: ["ARRIVED", "IN_SERVICE", "COMPLETED"].includes(item.status)
            ? new Date(Math.min(item.startsAt.getTime() - 5 * 60_000, nowMs))
            : null,
          cancelledAt: item.status === "CANCELLED" ? new Date(Math.min(item.startsAt.getTime() - 3 * 3600_000, nowMs)) : null,
          cancelReason: item.status === "CANCELLED" ? "Cliente pediu para remarcar (imprevisto no trabalho)." : null,
          createdById: reception.id,
          createdAt: new Date(item.startsAt.getTime() - 5 * 86_400_000),
        })
        .returning({ id: s.appointments.id });

      if (!item.attendance) continue;
      const rate = sv.commissionRate ?? prof.defaultCommissionRate;
      const discount = item.discount ?? 0;
      const finishedAt = item.attendance === "IN_PROGRESS" ? null : new Date(Math.min(item.endsAt.getTime(), nowMs));
      const [att] = await tx
        .insert(s.attendances)
        .values({
          appointmentId: appt.id,
          clientId: clientRow.id,
          professionalId: prof.id,
          status: item.attendance,
          startedAt: item.startsAt,
          finishedAt,
          subtotalCents: sv.priceCents,
          discountCents: discount,
          totalCents: sv.priceCents - discount,
          createdById: reception.id,
        })
        .returning({ id: s.attendances.id });
      const [attItem] = await tx
        .insert(s.attendanceItems)
        .values({
          attendanceId: att.id,
          serviceId: sv.id,
          professionalId: prof.id,
          quantity: 1,
          unitPriceCents: sv.priceCents,
          totalCents: sv.priceCents,
          commissionRate: rate,
          createdAt: item.startsAt,
        })
        .returning({ id: s.attendanceItems.id });

      if (item.attendance !== "PAID") continue;
      const reg = await registerFor(dateKey);
      const method = pick(["PIX", "PIX", "PIX", "CREDIT", "DEBIT", "CASH", "CREDIT_INSTALLMENTS"] as const);
      const amount = sv.priceCents - discount;
      const paidAt = new Date(Math.min(item.endsAt.getTime() + 5 * 60_000, nowMs));
      const [payment] = await tx
        .insert(s.payments)
        .values({
          attendanceId: att.id,
          clientId: clientRow.id,
          cashRegisterId: reg.id,
          grossCents: sv.priceCents,
          discountCents: discount,
          amountCents: amount,
          method,
          installments: method === "CREDIT_INSTALLMENTS" ? pick([2, 3, 4]) : 1,
          paidAt,
          receivedById: reception.id,
          createdAt: paidAt,
        })
        .returning({ id: s.payments.id });
      payments++;

      const [calc] = calculateCommissions([{ id: attItem.id, totalCents: sv.priceCents, commissionRate: rate }], discount);
      await tx
        .update(s.attendanceItems)
        .set({ discountShareCents: calc.discountShareCents, netCents: calc.baseCents })
        .where(sql`${s.attendanceItems.id} = ${attItem.id}`);
      const olderThanWeek = paidAt.getTime() < nowMs - 7 * 86_400_000;
      await tx.insert(s.commissions).values({
        attendanceId: att.id,
        attendanceItemId: attItem.id,
        paymentId: payment.id,
        professionalId: prof.id,
        serviceId: sv.id,
        baseCents: calc.baseCents,
        rate,
        amountCents: calc.amountCents,
        status: olderThanWeek ? "PAID" : "PENDING",
        paidAt: olderThanWeek ? new Date(paidAt.getTime() + 3 * 86_400_000) : null,
        paidById: olderThanWeek ? owner.id : null,
        createdAt: paidAt,
      });
      await tx.insert(s.cashTransactions).values({
        cashRegisterId: reg.id,
        type: "INCOME",
        method,
        amountCents: amount,
        description: `Atendimento — ${clientRow.name}`,
        paymentId: payment.id,
        createdById: reception.id,
        createdAt: paidAt,
      });
      if (method === "CASH") reg.cash += amount;
    }

    // Despesas e fechamento dos caixas passados; caixa de hoje permanece aberto.
    const EXPENSES = ["Café, água e descartáveis", "Lavanderia de toalhas", "Reposição de esmaltes", "Motoboy — entrega de produtos"];
    for (const [dateKey, reg] of registerByDay) {
      const expense = 2500 + Math.floor(random() * 6000);
      const canPayCash = reg.cash >= expense;
      await tx.insert(s.cashTransactions).values({
        cashRegisterId: reg.id,
        type: "EXPENSE",
        method: canPayCash ? "CASH" : "PIX",
        amountCents: expense,
        description: pick(EXPENSES),
        createdById: reception.id,
        createdAt: zonedDateTime(dateKey, 11 * 60),
      });
      if (canPayCash) reg.cash -= expense;
      if (dateKey === today) {
        await tx
          .update(s.cashRegisters)
          .set({ status: "OPEN", notes: null })
          .where(sql`${s.cashRegisters.id} = ${reg.id}`);
        continue;
      }
      const counted = reg.cash + pick([0, 0, 0, -500, 200]);
      await tx
        .update(s.cashRegisters)
        .set({
          closedAt: zonedDateTime(dateKey, 19 * 60 + 10),
          closedById: reception.id,
          expectedBalanceCents: reg.cash,
          countedBalanceCents: counted,
          differenceCents: counted - reg.cash,
        })
        .where(sql`${s.cashRegisters.id} = ${reg.id}`);
    }
    if (!registerByDay.has(today) && weekdayOf(today) !== 0) {
      await tx.insert(s.cashRegisters).values({
        status: "OPEN",
        openedAt: new Date(Math.min(zonedDateTime(today, 8 * 60 + 45).getTime(), nowMs)),
        openedById: reception.id,
        openingBalanceCents: 20000,
      });
    }

    /* Bloqueio de agenda de exemplo */
    const blockDay = addDays(today, 3);
    await tx.insert(s.scheduleBlocks).values({
      professionalId: profByKey("julia").id,
      startsAt: zonedDateTime(blockDay, 15 * 60),
      endsAt: zonedDateTime(blockDay, 17 * 60),
      reason: "Curso de atualização (DEMO)",
      createdById: owner.id,
    });

    /* Estoque */
    for (const p of PRODUCTS) {
      const initial = p.quantity + (p.quantity <= p.min ? 4 : 6);
      const [product] = await tx
        .insert(s.products)
        .values({
          name: p.name,
          category: p.category,
          unit: p.unit,
          quantity: p.quantity,
          minQuantity: p.min,
          costCents: p.cost,
          isDemo: true,
        })
        .returning({ id: s.products.id });
      await tx.insert(s.inventoryMovements).values([
        {
          productId: product.id,
          type: "IN" as const,
          quantityDelta: initial,
          balanceAfter: initial,
          reason: "Estoque inicial (DEMO)",
          createdById: owner.id,
          createdAt: new Date(nowMs - 20 * 86_400_000),
        },
        {
          productId: product.id,
          type: "OUT" as const,
          quantityDelta: p.quantity - initial,
          balanceAfter: p.quantity,
          reason: "Consumo em atendimentos",
          createdById: reception.id,
          createdAt: new Date(nowMs - 2 * 86_400_000),
        },
      ]);
    }

    console.log(
      `✓ Seed DEMO criado: ${professionals.length} profissionais, ${clients.length} clientes, ${services.length} serviços, ` +
        `${planned.length} agendamentos, ${payments} pagamentos, ${PRODUCTS.length} produtos.`,
    );
  });

  await client.end();
  console.log(`\nUsuários de teste (senha: ${DEMO_PASSWORD}):`);
  console.log("  OWNER        proprietaria@rbeauty.demo");
  console.log("  MANAGER      gerente@rbeauty.demo");
  console.log("  RECEPTION    recepcao@rbeauty.demo");
  console.log("  PROFESSIONAL ana@rbeauty.demo");
}

main().catch((error) => {
  console.error("✗ Falha no seed:", error);
  process.exit(1);
});

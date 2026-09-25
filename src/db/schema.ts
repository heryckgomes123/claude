import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ────────────────────────────────────────────────────────────
 * Enums
 * ──────────────────────────────────────────────────────────── */

export const userRole = pgEnum("user_role", ["OWNER", "MANAGER", "RECEPTION", "PROFESSIONAL"]);

export const appointmentStatus = pgEnum("appointment_status", [
  "SCHEDULED", // AGENDADO
  "CONFIRMED", // CONFIRMADO
  "ARRIVED", // CHEGOU
  "IN_SERVICE", // EM_ATENDIMENTO
  "COMPLETED", // FINALIZADO
  "CANCELLED", // CANCELADO
  "NO_SHOW", // NO_SHOW
]);

export const appointmentSource = pgEnum("appointment_source", ["COMMAND_CENTER", "WALK_IN", "ONLINE"]);

export const attendanceStatus = pgEnum("attendance_status", ["IN_PROGRESS", "AWAITING_PAYMENT", "PAID", "CANCELLED"]);

export const paymentMethod = pgEnum("payment_method", ["PIX", "CASH", "DEBIT", "CREDIT", "CREDIT_INSTALLMENTS"]);

export const commissionStatus = pgEnum("commission_status", ["PENDING", "PAID"]);

export const cashRegisterStatus = pgEnum("cash_register_status", ["OPEN", "CLOSED"]);

export const cashTransactionType = pgEnum("cash_transaction_type", [
  "INCOME", // Entrada
  "EXPENSE", // Saída / despesa
  "WITHDRAWAL", // Sangria
  "DEPOSIT", // Suprimento
]);

export const inventoryMovementType = pgEnum("inventory_movement_type", ["IN", "OUT", "ADJUSTMENT"]);

/* ────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────── */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ────────────────────────────────────────────────────────────
 * Configurações da empresa
 * ──────────────────────────────────────────────────────────── */

export const businessSettings = pgTable("business_settings", {
  id: integer("id").primaryKey().default(1),
  name: text("name").notNull().default("R Beauty"),
  logoUrl: text("logo_url"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  instagram: text("instagram"),
  address: text("address"),
  slotIntervalMinutes: integer("slot_interval_minutes").notNull().default(15),
  isDemo: boolean("is_demo").notNull().default(false),
  ...timestamps,
});

/** Horário de funcionamento do salão por dia da semana (0 = domingo). Minutos desde 00:00. */
export const businessHours = pgTable(
  "business_hours",
  {
    weekday: integer("weekday").primaryKey(),
    isOpen: boolean("is_open").notNull().default(true),
    openMinute: integer("open_minute").notNull().default(540),
    closeMinute: integer("close_minute").notNull().default(1140),
    breakStartMinute: integer("break_start_minute"),
    breakEndMinute: integer("break_end_minute"),
  },
  (t) => [check("business_hours_weekday", sql`${t.weekday} between 0 and 6`)],
);

/* ────────────────────────────────────────────────────────────
 * Usuários, sessões e auditoria
 * ──────────────────────────────────────────────────────────── */

export const professionals = pgTable(
  "professionals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    photoUrl: text("photo_url"),
    title: text("title").notNull().default("Profissional"),
    phone: text("phone"),
    color: text("color").notNull().default("#B4583F"),
    defaultCommissionRate: numeric("default_commission_rate", { precision: 5, scale: 2, mode: "number" }).notNull().default(40),
    isActive: boolean("is_active").notNull().default(true),
    isDemo: boolean("is_demo").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    check("professionals_commission_range", sql`${t.defaultCommissionRate} between 0 and 100`),
    index("professionals_active_idx").on(t.isActive),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull(),
    professionalId: uuid("professional_id").references(() => professionals.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    isDemo: boolean("is_demo").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_unique").on(sql`lower(${t.email})`), uniqueIndex("users_professional_unique").on(t.professionalId)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 do token do cookie. O token em si nunca é salvo. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_action_created_idx").on(t.action, t.createdAt), index("audit_logs_entity_idx").on(t.entity, t.entityId)],
);

/* ────────────────────────────────────────────────────────────
 * Catálogo
 * ──────────────────────────────────────────────────────────── */

export const serviceCategories = pgTable("service_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => serviceCategories.id),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    priceCents: integer("price_cents").notNull(),
    /** Percentual de comissão do serviço. Nulo = usa a comissão padrão do profissional. */
    commissionRate: numeric("commission_rate", { precision: 5, scale: 2, mode: "number" }),
    isActive: boolean("is_active").notNull().default(true),
    isDemo: boolean("is_demo").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    check("services_duration_positive", sql`${t.durationMinutes} > 0`),
    check("services_price_non_negative", sql`${t.priceCents} >= 0`),
    check("services_commission_range", sql`${t.commissionRate} is null or ${t.commissionRate} between 0 and 100`),
    index("services_category_idx").on(t.categoryId),
  ],
);

export const professionalSpecialties = pgTable(
  "professional_specialties",
  {
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => serviceCategories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.professionalId, t.categoryId] })],
);

export const professionalServices = pgTable(
  "professional_services",
  {
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.professionalId, t.serviceId] }), index("professional_services_service_idx").on(t.serviceId)],
);

/** Jornada semanal do profissional. Ausência de linha no dia = folga. */
export const professionalSchedules = pgTable(
  "professional_schedules",
  {
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
    breakStartMinute: integer("break_start_minute"),
    breakEndMinute: integer("break_end_minute"),
  },
  (t) => [
    primaryKey({ columns: [t.professionalId, t.weekday] }),
    check("professional_schedules_range", sql`${t.startMinute} < ${t.endMinute}`),
  ],
);

/** Bloqueios de agenda (folgas pontuais, férias, cursos...). professionalId nulo = salão inteiro. */
export const scheduleBlocks = pgTable(
  "schedule_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id").references(() => professionals.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason").notNull(),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("schedule_blocks_range", sql`${t.startsAt} < ${t.endsAt}`), index("schedule_blocks_range_idx").on(t.startsAt, t.endsAt)],
);

/* ────────────────────────────────────────────────────────────
 * Clientes
 * ──────────────────────────────────────────────────────────── */

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** Apenas dígitos. */
    phone: text("phone"),
    /** Apenas dígitos. */
    whatsapp: text("whatsapp"),
    email: text("email"),
    birthDate: date("birth_date", { mode: "string" }),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    isDemo: boolean("is_demo").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("clients_name_trgm_idx").using("gin", sql`${t.name} gin_trgm_ops`),
    index("clients_phone_idx").on(t.phone),
    index("clients_whatsapp_idx").on(t.whatsapp),
  ],
);

/* ────────────────────────────────────────────────────────────
 * Agenda
 * ──────────────────────────────────────────────────────────── */

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    priceCents: integer("price_cents").notNull(),
    notes: text("notes"),
    status: appointmentStatus("status").notNull().default("SCHEDULED"),
    source: appointmentSource("source").notNull().default("COMMAND_CENTER"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    arrivedAt: timestamp("arrived_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    check("appointments_range", sql`${t.startsAt} < ${t.endsAt}`),
    check("appointments_price_non_negative", sql`${t.priceCents} >= 0`),
    index("appointments_professional_start_idx").on(t.professionalId, t.startsAt),
    index("appointments_client_idx").on(t.clientId),
    index("appointments_start_idx").on(t.startsAt),
    // Exclusion constraint (anti-conflito) criada em migration SQL customizada:
    // appointments_no_overlap EXCLUDE USING gist (professional_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
  ],
);

/* ────────────────────────────────────────────────────────────
 * Atendimento, pagamento e comissão
 * ──────────────────────────────────────────────────────────── */

export const attendances = pgTable(
  "attendances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id),
    status: attendanceStatus("status").notNull().default("IN_PROGRESS"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    notes: text("notes"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("attendances_appointment_unique").on(t.appointmentId),
    check("attendances_discount_valid", sql`${t.discountCents} >= 0 and ${t.discountCents} <= ${t.subtotalCents}`),
    index("attendances_client_idx").on(t.clientId),
    index("attendances_professional_idx").on(t.professionalId),
    index("attendances_status_idx").on(t.status),
  ],
);

export const attendanceItems = pgTable(
  "attendance_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attendanceId: uuid("attendance_id")
      .notNull()
      .references(() => attendances.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    /** Parte do desconto alocada a este item (definida no pagamento). */
    discountShareCents: integer("discount_share_cents").notNull().default(0),
    /** Valor líquido do item (total - desconto alocado). Base da comissão. */
    netCents: integer("net_cents"),
    /** Snapshot do percentual de comissão no momento em que o item foi lançado. */
    commissionRate: numeric("commission_rate", { precision: 5, scale: 2, mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("attendance_items_quantity_positive", sql`${t.quantity} between 1 and 20`),
    check("attendance_items_price_non_negative", sql`${t.unitPriceCents} >= 0`),
    index("attendance_items_attendance_idx").on(t.attendanceId),
    index("attendance_items_service_idx").on(t.serviceId),
  ],
);

export const cashRegisters = pgTable(
  "cash_registers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: cashRegisterStatus("status").notNull().default("OPEN"),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    openedById: uuid("opened_by_id").references(() => users.id, { onDelete: "set null" }),
    openingBalanceCents: integer("opening_balance_cents").notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedById: uuid("closed_by_id").references(() => users.id, { onDelete: "set null" }),
    expectedBalanceCents: integer("expected_balance_cents"),
    countedBalanceCents: integer("counted_balance_cents"),
    differenceCents: integer("difference_cents"),
    notes: text("notes"),
  },
  (t) => [
    check("cash_registers_opening_non_negative", sql`${t.openingBalanceCents} >= 0`),
    uniqueIndex("cash_registers_single_open")
      .on(t.status)
      .where(sql`${t.status} = 'OPEN'`),
    index("cash_registers_opened_idx").on(t.openedAt),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attendanceId: uuid("attendance_id")
      .notNull()
      .references(() => attendances.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    cashRegisterId: uuid("cash_register_id").references(() => cashRegisters.id),
    grossCents: integer("gross_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    amountCents: integer("amount_cents").notNull(),
    method: paymentMethod("method").notNull(),
    installments: integer("installments").notNull().default(1),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
    receivedById: uuid("received_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("payments_attendance_unique").on(t.attendanceId),
    check(
      "payments_amounts_valid",
      sql`${t.grossCents} >= 0 and ${t.discountCents} >= 0 and ${t.amountCents} = ${t.grossCents} - ${t.discountCents}`,
    ),
    check("payments_installments_range", sql`${t.installments} between 1 and 12`),
    index("payments_paid_at_idx").on(t.paidAt),
    index("payments_client_idx").on(t.clientId),
  ],
);

export const commissions = pgTable(
  "commissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attendanceId: uuid("attendance_id")
      .notNull()
      .references(() => attendances.id),
    attendanceItemId: uuid("attendance_item_id")
      .notNull()
      .references(() => attendanceItems.id),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
    baseCents: integer("base_cents").notNull(),
    rate: numeric("rate", { precision: 5, scale: 2, mode: "number" }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: commissionStatus("status").notNull().default("PENDING"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paidById: uuid("paid_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("commissions_item_unique").on(t.attendanceItemId),
    check("commissions_amount_non_negative", sql`${t.amountCents} >= 0 and ${t.baseCents} >= 0`),
    index("commissions_professional_idx").on(t.professionalId, t.createdAt),
    index("commissions_status_idx").on(t.status),
  ],
);

export const cashTransactions = pgTable(
  "cash_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cashRegisterId: uuid("cash_register_id")
      .notNull()
      .references(() => cashRegisters.id),
    type: cashTransactionType("type").notNull(),
    method: paymentMethod("method").notNull().default("CASH"),
    amountCents: integer("amount_cents").notNull(),
    description: text("description").notNull(),
    paymentId: uuid("payment_id").references(() => payments.id),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("cash_transactions_amount_positive", sql`${t.amountCents} > 0`),
    uniqueIndex("cash_transactions_payment_unique").on(t.paymentId),
    index("cash_transactions_register_idx").on(t.cashRegisterId),
    index("cash_transactions_created_idx").on(t.type, t.createdAt),
  ],
);

/* ────────────────────────────────────────────────────────────
 * Estoque
 * ──────────────────────────────────────────────────────────── */

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    unit: text("unit").notNull().default("un"),
    quantity: numeric("quantity", { precision: 12, scale: 3, mode: "number" }).notNull().default(0),
    minQuantity: numeric("min_quantity", { precision: 12, scale: 3, mode: "number" }).notNull().default(0),
    costCents: integer("cost_cents").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isDemo: boolean("is_demo").notNull().default(false),
    ...timestamps,
  },
  (t) => [check("products_quantity_non_negative", sql`${t.quantity} >= 0 and ${t.minQuantity} >= 0 and ${t.costCents} >= 0`)],
);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    type: inventoryMovementType("type").notNull(),
    /** Variação aplicada ao saldo (positiva ou negativa). */
    quantityDelta: numeric("quantity_delta", { precision: 12, scale: 3, mode: "number" }).notNull(),
    balanceAfter: numeric("balance_after", { precision: 12, scale: 3, mode: "number" }).notNull(),
    reason: text("reason"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("inventory_movements_product_idx").on(t.productId, t.createdAt)],
);

/* ────────────────────────────────────────────────────────────
 * Relations
 * ──────────────────────────────────────────────────────────── */

export const usersRelations = relations(users, ({ one }) => ({
  professional: one(professionals, { fields: [users.professionalId], references: [professionals.id] }),
}));

export const professionalsRelations = relations(professionals, ({ many, one }) => ({
  user: one(users, { fields: [professionals.id], references: [users.professionalId] }),
  specialties: many(professionalSpecialties),
  services: many(professionalServices),
  schedules: many(professionalSchedules),
  appointments: many(appointments),
  attendances: many(attendances),
  commissions: many(commissions),
}));

export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(serviceCategories, { fields: [services.categoryId], references: [serviceCategories.id] }),
  professionals: many(professionalServices),
  appointments: many(appointments),
}));

export const professionalSpecialtiesRelations = relations(professionalSpecialties, ({ one }) => ({
  professional: one(professionals, { fields: [professionalSpecialties.professionalId], references: [professionals.id] }),
  category: one(serviceCategories, { fields: [professionalSpecialties.categoryId], references: [serviceCategories.id] }),
}));

export const professionalServicesRelations = relations(professionalServices, ({ one }) => ({
  professional: one(professionals, { fields: [professionalServices.professionalId], references: [professionals.id] }),
  service: one(services, { fields: [professionalServices.serviceId], references: [services.id] }),
}));

export const professionalSchedulesRelations = relations(professionalSchedules, ({ one }) => ({
  professional: one(professionals, { fields: [professionalSchedules.professionalId], references: [professionals.id] }),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  appointments: many(appointments),
  attendances: many(attendances),
  payments: many(payments),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  client: one(clients, { fields: [appointments.clientId], references: [clients.id] }),
  professional: one(professionals, { fields: [appointments.professionalId], references: [professionals.id] }),
  service: one(services, { fields: [appointments.serviceId], references: [services.id] }),
  attendance: one(attendances, { fields: [appointments.id], references: [attendances.appointmentId] }),
}));

export const attendancesRelations = relations(attendances, ({ one, many }) => ({
  appointment: one(appointments, { fields: [attendances.appointmentId], references: [appointments.id] }),
  client: one(clients, { fields: [attendances.clientId], references: [clients.id] }),
  professional: one(professionals, { fields: [attendances.professionalId], references: [professionals.id] }),
  items: many(attendanceItems),
  payment: one(payments, { fields: [attendances.id], references: [payments.attendanceId] }),
  commissions: many(commissions),
}));

export const attendanceItemsRelations = relations(attendanceItems, ({ one }) => ({
  attendance: one(attendances, { fields: [attendanceItems.attendanceId], references: [attendances.id] }),
  service: one(services, { fields: [attendanceItems.serviceId], references: [services.id] }),
  professional: one(professionals, { fields: [attendanceItems.professionalId], references: [professionals.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  attendance: one(attendances, { fields: [payments.attendanceId], references: [attendances.id] }),
  client: one(clients, { fields: [payments.clientId], references: [clients.id] }),
  cashRegister: one(cashRegisters, { fields: [payments.cashRegisterId], references: [cashRegisters.id] }),
  receivedBy: one(users, { fields: [payments.receivedById], references: [users.id] }),
  cashTransaction: one(cashTransactions, { fields: [payments.id], references: [cashTransactions.paymentId] }),
}));

export const commissionsRelations = relations(commissions, ({ one }) => ({
  attendance: one(attendances, { fields: [commissions.attendanceId], references: [attendances.id] }),
  professional: one(professionals, { fields: [commissions.professionalId], references: [professionals.id] }),
  service: one(services, { fields: [commissions.serviceId], references: [services.id] }),
  payment: one(payments, { fields: [commissions.paymentId], references: [payments.id] }),
}));

export const cashRegistersRelations = relations(cashRegisters, ({ many, one }) => ({
  transactions: many(cashTransactions),
  openedBy: one(users, { fields: [cashRegisters.openedById], references: [users.id] }),
}));

export const cashTransactionsRelations = relations(cashTransactions, ({ one }) => ({
  cashRegister: one(cashRegisters, { fields: [cashTransactions.cashRegisterId], references: [cashRegisters.id] }),
  payment: one(payments, { fields: [cashTransactions.paymentId], references: [payments.id] }),
  createdBy: one(users, { fields: [cashTransactions.createdById], references: [users.id] }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  movements: many(inventoryMovements),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  product: one(products, { fields: [inventoryMovements.productId], references: [products.id] }),
  createdBy: one(users, { fields: [inventoryMovements.createdById], references: [users.id] }),
}));

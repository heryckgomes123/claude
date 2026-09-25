/** Rótulos e metadados de domínio compartilhados por servidor e interface. */

export const APPOINTMENT_STATUSES = ["SCHEDULED", "CONFIRMED", "ARRIVED", "IN_SERVICE", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  ARRIVED: "Chegou",
  IN_SERVICE: "Em atendimento",
  COMPLETED: "Finalizado",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

/** Status que ocupam a agenda do profissional. */
export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ["SCHEDULED", "CONFIRMED", "ARRIVED", "IN_SERVICE", "COMPLETED"];

/** Status em que ainda é possível remarcar / editar. */
export const EDITABLE_APPOINTMENT_STATUSES: AppointmentStatus[] = ["SCHEDULED", "CONFIRMED"];

/** Máquina de estados manual (transições que o usuário pode disparar diretamente). */
export const APPOINTMENT_TRANSITIONS: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  SCHEDULED: ["CONFIRMED", "ARRIVED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["ARRIVED", "CANCELLED", "NO_SHOW", "SCHEDULED"],
  ARRIVED: ["CANCELLED", "CONFIRMED"],
};

export const ATTENDANCE_STATUS_LABELS = {
  IN_PROGRESS: "Em atendimento",
  AWAITING_PAYMENT: "Aguardando pagamento",
  PAID: "Pago",
  CANCELLED: "Cancelado",
} as const;
export type AttendanceStatus = keyof typeof ATTENDANCE_STATUS_LABELS;

export const PAYMENT_METHODS = ["PIX", "CASH", "DEBIT", "CREDIT", "CREDIT_INSTALLMENTS"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  DEBIT: "Débito",
  CREDIT: "Crédito",
  CREDIT_INSTALLMENTS: "Crédito parcelado",
};

export const CASH_TRANSACTION_TYPES = ["INCOME", "EXPENSE", "WITHDRAWAL", "DEPOSIT"] as const;
export type CashTransactionType = (typeof CASH_TRANSACTION_TYPES)[number];
export const CASH_TRANSACTION_LABELS: Record<CashTransactionType, string> = {
  INCOME: "Entrada",
  EXPENSE: "Saída",
  WITHDRAWAL: "Sangria",
  DEPOSIT: "Suprimento",
};
export const CASH_OUTFLOW_TYPES: CashTransactionType[] = ["EXPENSE", "WITHDRAWAL"];

export const INVENTORY_MOVEMENT_LABELS = {
  IN: "Entrada",
  OUT: "Saída",
  ADJUSTMENT: "Ajuste",
} as const;
export type InventoryMovementType = keyof typeof INVENTORY_MOVEMENT_LABELS;

export const COMMISSION_STATUS_LABELS = { PENDING: "A pagar", PAID: "Paga" } as const;

/** Categorias de serviço da R Beauty (seed). */
export const SERVICE_CATEGORY_SEED = [
  { slug: "cabelo", name: "Cabelo", sortOrder: 1 },
  { slug: "unhas", name: "Unhas", sortOrder: 2 },
  { slug: "cilios", name: "Cílios", sortOrder: 3 },
  { slug: "sobrancelhas", name: "Sobrancelhas", sortOrder: 4 },
] as const;

export const PRODUCT_UNITS = ["un", "ml", "g", "kg", "L", "cx", "par"] as const;

export const PROFESSIONAL_COLORS = ["#B4583F", "#9C7248", "#6F7F5E", "#7C5A7A", "#4F6F7A", "#B08A3E", "#8E3F2B"];

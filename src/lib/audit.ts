import "server-only";
import { db, type DbOrTx } from "@/db";
import { auditLogs } from "@/db/schema";

export type AuditAction =
  | "login"
  | "login_failed"
  | "logout"
  | "create"
  | "update"
  | "delete"
  | "deactivate"
  | "activate"
  | "appointment_status"
  | "appointment_cancel"
  | "appointment_reschedule"
  | "attendance_start"
  | "attendance_finish"
  | "attendance_reopen"
  | "payment"
  | "commission_paid"
  | "cash_open"
  | "cash_transaction"
  | "cash_close"
  | "inventory_movement"
  | "password_reset";

type AuditInput = {
  userId?: string | null;
  action: AuditAction;
  entity?: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
};

/** Registra ação relevante. Falhas de auditoria nunca derrubam a operação principal. */
export async function audit(input: AuditInput, executor: DbOrTx = db): Promise<void> {
  try {
    await executor.insert(auditLogs).values({
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
      ip: input.ip ?? null,
    });
  } catch (error) {
    if (executor !== db) throw error;
    console.error("[audit] falha ao registrar", input.action, error);
  }
}

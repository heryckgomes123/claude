import "server-only";
import { z } from "zod";
import type { Permission } from "@/config/permissions";
import { assertCan, requireActor, type SessionUser } from "@/lib/auth/session";
import { AppError, pgErrorCode } from "@/lib/errors";
import type { ActionResult } from "@/types/action";

/**
 * Envelopa uma server action:
 *  1. resolve o usuário autenticado no servidor;
 *  2. verifica permissão (RBAC);
 *  3. valida a entrada com Zod;
 *  4. converte erros em respostas seguras (sem vazar detalhes internos).
 */
export function createAction<S extends z.ZodType, R>(
  options: { permission?: Permission | Permission[]; schema: S },
  handler: (input: z.output<S>, actor: SessionUser) => Promise<R>,
): (input: z.input<S>) => Promise<ActionResult<R>> {
  return async (rawInput) => {
    try {
      const actor = await requireActor();
      if (options.permission) {
        const list = Array.isArray(options.permission) ? options.permission : [options.permission];
        assertCan(actor, ...list);
      }
      const parsed = options.schema.safeParse(rawInput);
      if (!parsed.success) {
        const flat = z.flattenError(parsed.error);
        const first = parsed.error.issues[0]?.message ?? "Dados inválidos.";
        return { ok: false, error: first, fieldErrors: flat.fieldErrors as Record<string, string[]> };
      }
      const data = await handler(parsed.data, actor);
      return { ok: true, data };
    } catch (error) {
      return toActionError(error);
    }
  };
}

export function toActionError(error: unknown): { ok: false; error: string; fieldErrors?: Record<string, string[]> } {
  if (error instanceof AppError) return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
  const code = pgErrorCode(error);
  if (code === "23P01") return { ok: false, error: "Conflito de horário: a profissional já possui atendimento neste intervalo." };
  if (code === "23505") return { ok: false, error: "Registro duplicado. Verifique os dados informados." };
  if (code === "23514") return { ok: false, error: "Valores inválidos para esta operação." };
  if (code === "23503") return { ok: false, error: "Registro relacionado não encontrado." };
  // Erros internos de navegação do Next (redirect/notFound) precisam propagar.
  if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_")) {
    throw error;
  }
  console.error("[action] erro inesperado", error);
  return { ok: false, error: "Não foi possível concluir a operação. Tente novamente." };
}

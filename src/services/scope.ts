import "server-only";
import { can, type SessionUser } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/errors";

/**
 * Escopo de dados por perfil. Retorna o id da profissional quando a usuária só pode
 * enxergar os próprios dados; null quando pode enxergar todas.
 */
export function ownProfessionalScope(actor: SessionUser, allPermission: Parameters<typeof can>[1]): string | null {
  if (can(actor, allPermission)) return null;
  if (!actor.professionalId) throw new ForbiddenError();
  return actor.professionalId;
}

/** Garante que a usuária pode agir sobre dados da profissional informada. */
export function assertProfessionalAccess(actor: SessionUser, professionalId: string, allPermission: Parameters<typeof can>[1]): void {
  const scope = ownProfessionalScope(actor, allPermission);
  if (scope && scope !== professionalId) throw new ForbiddenError("Você só pode acessar os seus próprios dados.");
}

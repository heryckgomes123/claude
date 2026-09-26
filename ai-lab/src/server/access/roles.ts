/**
 * Papéis e permissões. Hoje: USER e ADMIN.
 * Para adicionar EDITOR, CURATOR ou SUPER_ADMIN: inclua o papel aqui com suas permissões
 * e amplie a constraint `user_role_check` com uma migração.
 */
export const ROLES = ['USER', 'ADMIN'] as const
export type Role = (typeof ROLES)[number]

export const PERMISSIONS = [
  'admin:access',
  'content:write',
  'content:publish',
  'content:delete',
  'taxonomy:write',
  'members:manage',
  'codes:manage',
  'updates:write',
] as const
export type Permission = (typeof PERMISSIONS)[number]

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  USER: [],
  ADMIN: PERMISSIONS,
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

export function can(role: string | null | undefined, permission: Permission): boolean {
  if (!isRole(role)) return false
  return ROLE_PERMISSIONS[role].includes(permission)
}

export const ROLE_LABELS: Record<Role, string> = {
  USER: 'Membro',
  ADMIN: 'Administrador',
}

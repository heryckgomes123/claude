/**
 * Papéis: USER (aluno) e ADMIN (professor/equipe).
 * O acesso do aluno ao conteúdo vem de uma liberação por e-mail (ver ./grants.ts), não do papel.
 */
export const ROLES = ['USER', 'ADMIN'] as const
export type Role = (typeof ROLES)[number]

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'ADMIN'
}

export const ROLE_LABELS: Record<Role, string> = {
  USER: 'Aluno',
  ADMIN: 'Professor',
}

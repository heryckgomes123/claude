import 'server-only'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'
import { db } from '../db'
import { user } from '../db/schema'
import { ENTITLEMENTS, type Entitlement } from '../access/entitlements'
import { getActiveEntitlements } from '../access/memberships'
import { can, isRole, type Permission, type Role } from '../access/roles'
import { getAuth } from '.'

export type Viewer = {
  id: string
  name: string
  email: string
  role: Role
  entitlements: Set<string>
  isAdmin: boolean
  hasLabAccess: boolean
}

/**
 * Usuário da requisição atual, lido do banco (papel e entitlements sempre atuais).
 * Memoizado por requisição com React.cache.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  // headers() primeiro: marca a rota como dinâmica antes de qualquer acesso à configuração.
  const requestHeaders = await headers()
  const session = await getAuth().api.getSession({ headers: requestHeaders })
  if (!session) return null
  const [row] = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)
  if (!row) return null
  const role: Role = isRole(row.role) ? row.role : 'USER'
  const entitlements = await getActiveEntitlements(row.id)
  const isAdmin = can(role, 'admin:access')
  return {
    ...row,
    role,
    entitlements,
    isAdmin,
    hasLabAccess: isAdmin || entitlements.has(ENTITLEMENTS.LAB_ACCESS),
  }
})

export function viewerHas(viewer: Viewer, entitlement: Entitlement): boolean {
  return viewer.isAdmin || viewer.entitlements.has(entitlement)
}

/* ---------- Guards para páginas (redirecionam) ---------- */

export async function requireUser(): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) redirect('/entrar')
  return viewer
}

export async function requireMember(): Promise<Viewer> {
  const viewer = await requireUser()
  if (!viewer.hasLabAccess) redirect('/acesso')
  return viewer
}

/** Rotas administrativas respondem 404 para quem não tem permissão (não revelam que existem). */
export async function requirePermission(permission: Permission = 'admin:access'): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) redirect('/entrar')
  if (!can(viewer.role, permission)) notFound()
  return viewer
}

/* ---------- Guards para server actions / route handlers (lançam) ---------- */

export class AccessError extends Error {
  constructor(
    message: string,
    public readonly code: 'UNAUTHENTICATED' | 'FORBIDDEN',
  ) {
    super(message)
  }
}

export async function assertMember(entitlement?: Entitlement): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) throw new AccessError('Faça login para continuar.', 'UNAUTHENTICATED')
  if (!viewer.hasLabAccess) throw new AccessError('Sua conta ainda não tem acesso ao Lab.', 'FORBIDDEN')
  if (entitlement && !viewerHas(viewer, entitlement))
    throw new AccessError('Seu plano não inclui este recurso.', 'FORBIDDEN')
  return viewer
}

export async function assertPermission(permission: Permission): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) throw new AccessError('Faça login para continuar.', 'UNAUTHENTICATED')
  if (!can(viewer.role, permission)) throw new AccessError('Você não tem permissão para esta ação.', 'FORBIDDEN')
  return viewer
}

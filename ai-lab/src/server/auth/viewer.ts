import 'server-only'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'
import { hasActiveGrant } from '../access/grants'
import { isAdminRole, isRole, type Role } from '../access/roles'
import { db } from '../db'
import { user } from '../db/schema'
import { getAuth } from '.'

export type Viewer = {
  id: string
  name: string
  email: string
  role: Role
  isAdmin: boolean
  hasLabAccess: boolean
}

/**
 * Usuário da requisição atual, lido do banco (papel e acesso sempre atuais — um reembolso
 * processado agora já bloqueia a próxima página). Memoizado por requisição com React.cache.
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
  const isAdmin = isAdminRole(role)
  return {
    ...row,
    role,
    isAdmin,
    hasLabAccess: isAdmin || (await hasActiveGrant(row.email)),
  }
})

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

/** O painel do professor responde 404 para quem não é admin (não revela que existe). */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) redirect('/entrar')
  if (!viewer.isAdmin) notFound()
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

export async function assertMember(): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) throw new AccessError('Faça login para continuar.', 'UNAUTHENTICATED')
  if (!viewer.hasLabAccess) throw new AccessError('Sua conta ainda não tem acesso à área de membros.', 'FORBIDDEN')
  return viewer
}

export async function assertAdmin(): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) throw new AccessError('Faça login para continuar.', 'UNAUTHENTICATED')
  if (!viewer.isAdmin) throw new AccessError('Você não tem permissão para esta ação.', 'FORBIDDEN')
  return viewer
}

import { AppShell } from '@/components/lab/app-shell'
import { requireMember } from '@/server/auth/viewer'

/**
 * Área do aluno. O guard aqui melhora a UX; cada página e cada action
 * também valida o acesso (layouts não são re-executados em toda navegação).
 */
export default async function LabLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireMember()
  return <AppShell viewer={{ name: viewer.name, isAdmin: viewer.isAdmin }}>{children}</AppShell>
}

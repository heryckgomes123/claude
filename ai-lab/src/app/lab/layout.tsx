import { LabShell } from '@/components/lab/lab-shell'
import { requireMember } from '@/server/auth/viewer'

/**
 * Shell da área de membros. O guard aqui melhora a UX; cada página e cada action
 * também valida o acesso (layouts não são re-executados em toda navegação).
 */
export default async function LabLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireMember()
  return <LabShell viewer={{ name: viewer.name, email: viewer.email, isAdmin: viewer.isAdmin }}>{children}</LabShell>
}

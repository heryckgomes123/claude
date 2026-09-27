import { Badge } from '@/components/ui/badge'

export const OUTCOME_LABELS: Record<string, string> = {
  GRANTED: 'Acesso liberado',
  REVOKED: 'Acesso removido',
  IGNORED: 'Sem efeito',
  REJECTED: 'Recusado',
  DUPLICATE: 'Repetido',
  ERROR: 'Erro',
}

const VARIANTS: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  GRANTED: 'success',
  REVOKED: 'warning',
  REJECTED: 'danger',
  ERROR: 'danger',
}

export function OutcomeBadge({ outcome }: { outcome: string }) {
  return <Badge variant={VARIANTS[outcome] ?? 'default'}>{OUTCOME_LABELS[outcome] ?? outcome}</Badge>
}

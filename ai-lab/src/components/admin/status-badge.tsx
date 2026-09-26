import { Badge } from '@/components/ui/badge'
import { CONTENT_STATUS_LABELS, type ContentStatus } from '@/lib/labels'

const VARIANT: Record<ContentStatus, 'default' | 'warning' | 'success' | 'danger' | 'electric'> = {
  DRAFT: 'default',
  REVIEW: 'electric',
  PUBLISHED: 'success',
  ARCHIVED: 'danger',
}

export function StatusBadge({ status }: { status: ContentStatus }) {
  return <Badge variant={VARIANT[status]}>{CONTENT_STATUS_LABELS[status]}</Badge>
}

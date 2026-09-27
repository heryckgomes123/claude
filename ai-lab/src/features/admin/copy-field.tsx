'use client'
import { CopyButton } from '@/components/lab/copy-button'

export function CopyField({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-ink-950/60 p-1.5 pl-3">
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-bone/85" aria-label={label}>
        {value}
      </code>
      <CopyButton text={value} size="sm" toastMessage="Link copiado." />
    </div>
  )
}

'use client'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { recordCopy } from '@/server/actions/lab'
import { Button, type ButtonProps } from '../ui/button'

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback para contextos sem Clipboard API (ex.: http sem TLS)
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}

export function CopyButton({
  text,
  contentId,
  label = 'Copiar',
  copiedLabel = 'Copiado',
  className,
  variant = 'secondary',
  size = 'md',
  onCopied,
}: {
  text: string | (() => string)
  contentId?: string
  label?: string
  copiedLabel?: string
  className?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  onCopied?: () => void
}) {
  const [copied, setCopied] = useState(false)

  async function onClick() {
    const value = typeof text === 'function' ? text() : text
    if (!(await copyToClipboard(value))) {
      toast.error('Não foi possível copiar. Selecione o texto manualmente.')
      return
    }
    setCopied(true)
    onCopied?.()
    window.setTimeout(() => setCopied(false), 2200)
    if (contentId) void recordCopy(contentId)
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={onClick} className={cn(className)} aria-live="polite">
      {copied ? <Check className="text-success" /> : <Copy />}
      {copied ? copiedLabel : label}
    </Button>
  )
}

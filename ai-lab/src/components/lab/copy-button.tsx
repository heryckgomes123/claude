'use client'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { recordCopy } from '@/server/actions/student'
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
  promptId,
  label = 'Copiar',
  copiedLabel = 'Copiado',
  toastMessage = 'Copiado! Agora é só colar na ferramenta de IA.',
  className,
  variant = 'secondary',
  size = 'md',
}: {
  text: string | (() => string)
  promptId?: string
  label?: string
  copiedLabel?: string
  toastMessage?: string
  className?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
}) {
  const [copied, setCopied] = useState(false)

  async function onClick(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    const value = typeof text === 'function' ? text() : text
    if (!(await copyToClipboard(value))) {
      toast.error('Não foi possível copiar. Selecione o texto manualmente.')
      return
    }
    setCopied(true)
    toast.success(toastMessage)
    window.setTimeout(() => setCopied(false), 2200)
    if (promptId) void recordCopy(promptId)
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={onClick} className={cn(className)} aria-live="polite">
      {copied ? <Check className="text-success" /> : <Copy />}
      {copied ? copiedLabel : label}
    </Button>
  )
}

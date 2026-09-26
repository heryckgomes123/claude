'use client'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { copyToClipboard } from '@/components/lab/copy-button'

export function PaletteSwatches({ colors }: { colors: string[] }) {
  const [copied, setCopied] = useState<string | null>(null)
  return (
    <ul className="grid grid-cols-5 gap-2">
      {colors.map((c) => (
        <li key={c}>
          <button
            type="button"
            onClick={async () => {
              if (await copyToClipboard(c)) {
                setCopied(c)
                window.setTimeout(() => setCopied(null), 1500)
              }
            }}
            className="group grid w-full gap-1.5 text-left"
            aria-label={`Copiar cor ${c}`}
          >
            <span className="relative grid aspect-square place-items-center rounded-xl ring-1 ring-bone/10 transition-transform group-hover:scale-[1.03]" style={{ background: c }}>
              {copied === c && <Check className="size-4 text-bone mix-blend-difference" aria-hidden />}
            </span>
            <span className="font-mono text-[10px] uppercase text-mute">{copied === c ? 'copiado' : c}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

import Image from 'next/image'
import { cn } from '@/lib/utils'

/** Logotipo INTELRA + selo "AI LAB". */
export function LabLogo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Image
        src="/brand/mark.webp"
        alt=""
        width={400}
        height={610}
        priority
        className="h-8 w-auto drop-shadow-[0_0_10px_rgb(247_201_72/0.3)]"
      />
      {!compact && (
        <span className="flex items-center gap-2">
          <Image src="/brand/wordmark.webp" alt="INTELRA" width={900} height={130} className="h-[13px] w-auto" />
          <span className="rounded-md border border-gold-300/30 px-1.5 py-px font-mono text-[9px] font-semibold tracking-[0.2em] text-gold-200">
            AI LAB
          </span>
        </span>
      )}
      {compact && <span className="sr-only">INTELRA AI LAB</span>}
    </span>
  )
}

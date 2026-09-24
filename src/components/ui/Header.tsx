import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title: string
  subtitle?: string
  back?: boolean | string
  action?: ReactNode
  className?: string
  large?: boolean
}

export function Header({ title, subtitle, back, action, className, large = true }: HeaderProps) {
  const navigate = useNavigate()
  return (
    <header className={cn('pt-safe relative z-10 px-4', className)}>
      <div className="flex h-12 items-center justify-between">
        {back ? (
          <button
            onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
            className="-ml-2 grid size-10 place-items-center rounded-full text-ink-2 hover:bg-white/5 hover:text-ink"
            aria-label="Voltar"
          >
            <ChevronLeft size={24} />
          </button>
        ) : (
          <span />
        )}
        {!large && <h1 className="font-display-wide text-[15px] font-bold uppercase tracking-wide">{title}</h1>}
        <div className="flex min-w-10 justify-end">{action}</div>
      </div>
      {large && (
        <div className="mt-1 mb-5">
          {subtitle && <p className="hud-label mb-1.5">{subtitle}</p>}
          <h1 className="font-display-wide text-[clamp(24px,7.5vw,30px)] leading-[1.05] font-extrabold tracking-tight uppercase [overflow-wrap:anywhere]">{title}</h1>
        </div>
      )}
    </header>
  )
}

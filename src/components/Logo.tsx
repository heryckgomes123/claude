import logoPurple from '../assets/brand/logo-purple.webp'
import logoPurpleReversed from '../assets/brand/logo-purple-reversed.webp'

interface LogoProps {
  /** `reversed` = versão para fundo escuro (parte grafite do lettering em branco); `original` = arquivo da marca. */
  tone?: 'reversed' | 'original'
  className?: string
}

/** Logo oficial da INTELRA (564×160). Proporções e cores preservadas. */
export function Logo({ tone = 'reversed', className = 'h-9 w-auto' }: LogoProps) {
  return (
    <img
      src={tone === 'reversed' ? logoPurpleReversed : logoPurple}
      width={564}
      height={160}
      alt="INTELRA"
      className={className}
      decoding="async"
    />
  )
}

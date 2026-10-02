import { m } from 'framer-motion'
import robotCyan from '../assets/brand/robot-cyan.webp'
import robotPurple from '../assets/brand/robot-purple.webp'
import type { MascotState } from '../config/mascot'

interface MascotProps {
  state: MascotState
  /** Largura em px (a arte é quadrada). */
  size?: number
  className?: string
  /** Texto alternativo. Vazio quando o robô é decorativo ao lado de uma fala. */
  alt?: string
  float?: boolean
  shadow?: boolean
}

/**
 * Mascote oficial (arte estática da marca). O elemento inteiro é animado — deslocamento,
 * inclinação e escala discretos — sem simular articulações que a arte não tem.
 * No estado “confirmado” troca para a variante ciano oficial.
 */
export function Mascot({ state, size = 96, className = '', alt = '', float = true, shadow = true }: MascotProps) {
  const cyan = state === 'confirmed'
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} data-mascot-state={state}>
      {shadow && (
        <span
          aria-hidden="true"
          className="absolute -bottom-[6%] left-1/2 h-[10%] w-[70%] -translate-x-1/2 rounded-[50%] bg-volt-500/35 blur-md"
        />
      )}
      <div className="h-full w-full" style={float ? { animation: 'float-y 5.5s ease-in-out infinite' } : undefined}>
        <m.div
          key={state}
          className="relative h-full w-full"
          initial={{ y: 0, rotate: 0, scale: 1 }}
          animate={{ y: [0, -10, 0], rotate: [0, state === 'selected' ? 6 : -4, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <img
            src={robotPurple}
            width={480}
            height={480}
            alt={cyan ? '' : alt}
            aria-hidden={cyan || !alt ? true : undefined}
            className="absolute inset-0 h-full w-full transition-opacity duration-500"
            style={{ opacity: cyan ? 0 : 1 }}
            decoding="async"
            draggable={false}
          />
          <img
            src={robotCyan}
            width={480}
            height={480}
            alt={cyan ? alt : ''}
            aria-hidden={!cyan || !alt ? true : undefined}
            className="absolute inset-0 h-full w-full transition-opacity duration-500"
            style={{ opacity: cyan ? 1 : 0 }}
            decoding="async"
            loading="lazy"
            draggable={false}
          />
        </m.div>
      </div>
    </div>
  )
}

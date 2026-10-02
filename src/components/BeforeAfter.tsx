import { useId, useState } from 'react'
import type { BeforeAfterPair } from '../config/portfolio'

/**
 * Comparador antes/depois. Usa um <input type="range"> real por cima das imagens,
 * então funciona com mouse, toque e teclado (setas, Home/End).
 * Só deve receber pares verdadeiros — nunca um “antes” fabricado.
 */
export function BeforeAfter({ pair }: { pair: BeforeAfterPair }) {
  const [pos, setPos] = useState(50)
  const id = useId()
  const { before, after } = pair

  return (
    <figure>
      <div className="relative overflow-hidden rounded-2xl bg-paper-200 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-4 has-[input:focus-visible]:outline-volt-700" style={{ aspectRatio: `${after.width} / ${after.height}` }}>
        <img src={after.src} alt={after.alt} width={after.width} height={after.height} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        <img
          src={before.src}
          alt={before.alt}
          width={before.width}
          height={before.height}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.2)]" style={{ left: `${pos}%` }}>
          <span className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-paper-ink shadow-lg">
            ⇆
          </span>
        </div>
        <span className="eyebrow pointer-events-none absolute left-3 top-3 rounded bg-paper-ink/80 px-2 py-1 text-bone">Antes</span>
        <span className="eyebrow pointer-events-none absolute right-3 top-3 rounded bg-paper-ink/80 px-2 py-1 text-bone">Depois</span>
        <label htmlFor={id} className="sr-only">
          Comparar antes e depois de {pair.title}
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-valuetext={`${pos}% da imagem original visível`}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      <figcaption className="mt-3 font-display font-semibold text-paper-ink">{pair.title}</figcaption>
    </figure>
  )
}

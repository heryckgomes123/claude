const WORDS_A = ['Estratégia', 'Conteúdo', 'Tráfego', 'Resultados', 'Inteligência Artificial', 'Sites', 'Automação', 'Branding']
const WORDS_B = ['Posicionamento', 'Landing pages', 'Sistemas', 'Redes sociais', 'Agentes de IA', 'E-commerce', 'Campanhas', 'Dashboards']

function Star({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-[0.55em] shrink-0 ${className}`} aria-hidden="true">
      <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" fill="currentColor" />
    </svg>
  )
}

function Band({ words, reverse = false, variant }: { words: string[]; reverse?: boolean; variant: 'gold' | 'dark' }) {
  const items = [...words, ...words]
  return (
    <div
      className={`flex overflow-hidden py-3 md:py-4 ${
        variant === 'gold'
          ? 'bg-gold-metal text-ink-950 shadow-[0_20px_60px_-20px_rgb(226_174_58/0.6)]'
          : 'border-y border-gold-300/20 bg-ink-900 text-bone'
      }`}
    >
      <ul
        className={`flex shrink-0 items-center gap-6 pr-6 motion-reduce:animate-none md:gap-9 md:pr-9 ${
          reverse ? 'animate-[marquee-reverse_46s_linear_infinite]' : 'animate-[marquee_40s_linear_infinite]'
        }`}
      >
        {items.map((word, i) => (
          <li
            key={i}
            aria-hidden={i >= words.length}
            className="poster flex items-center gap-6 whitespace-nowrap text-[1.9rem] md:gap-9 md:text-[2.8rem]"
          >
            <span className={variant === 'dark' && i % 2 ? 'text-outline-gold' : ''}>{word}</span>
            <Star className={variant === 'gold' ? 'text-ink-950/80' : 'text-gold-300'} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Faixas cruzadas em movimento, inspiradas na tipografia dos posts da marca. */
export function Tapes() {
  return (
    <div className="relative z-10 -my-6 overflow-hidden py-10 md:-my-8 md:py-14" aria-label="Frentes de atuação da INTELRA">
      <div className="relative -mx-4 -rotate-[2.5deg]">
        <Band words={WORDS_A} variant="gold" />
      </div>
      <div className="relative -mx-4 -mt-3 rotate-[1.5deg] md:-mt-4">
        <Band words={WORDS_B} variant="dark" reverse />
      </div>
    </div>
  )
}

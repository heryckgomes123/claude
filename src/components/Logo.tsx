interface LogoProps {
  className?: string
}

/** Logotipo textual da INTELRA com um marcador dourado discreto. */
export function Logo({ className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-[0.18em] ${className}`}>
      <span aria-hidden="true" className="relative inline-block size-[0.62em]">
        <span className="absolute inset-0 rounded-full border border-current opacity-60" />
        <span className="absolute inset-[30%] rounded-full bg-gold" />
      </span>
      INTELRA
    </span>
  )
}

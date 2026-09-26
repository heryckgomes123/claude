/** Pequena explosão de faíscas douradas (feedback de seleção). Re-renderize com uma `key` nova para disparar. */
export function Burst({ className = '' }: { className?: string }) {
  return (
    <span className={`pointer-events-none absolute left-1/2 top-1/2 ${className}`} aria-hidden="true">
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className="absolute -left-[2px] -top-[2px] size-1 rounded-full bg-gold-200 shadow-[0_0_6px_rgb(247_201_72)]"
          style={{ ['--a' as string]: `${i * 36}deg`, animation: `burst 0.7s var(--ease-premium) forwards` }}
        />
      ))}
    </span>
  )
}

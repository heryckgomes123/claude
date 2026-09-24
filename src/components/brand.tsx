import { useId } from "react";
import { cn } from "@/lib/cn";

/** The AIVA mark: an "A" drawn as a gradient path with a glowing neural node. */
export function AivaMark({ size = 32, className, glow = true }: { size?: number; className?: string; glow?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const s = `s${uid}`;
  const n = `n${uid}`;
  const g = `g${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={s} x1="120" y1="400" x2="400" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3D8BFF" />
          <stop offset=".5" stopColor="#8B5CFF" />
          <stop offset="1" stopColor="#FF4FB0" />
        </linearGradient>
        <radialGradient id={n} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(256 318) scale(40)">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".45" stopColor="#FFD6F0" />
          <stop offset="1" stopColor="#FF4FB0" />
        </radialGradient>
        <filter id={g} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <path d="M146 392 256 124l110 268" fill="none" stroke={`url(#${s})`} strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" />
      {glow && <circle cx="256" cy="318" r="40" fill="#FF4FB0" opacity=".55" filter={`url(#${g})`} />}
      <circle cx="256" cy="318" r="27" fill={`url(#${n})`} />
      <circle cx="256" cy="124" r="10" fill="#fff" opacity=".9" />
    </svg>
  );
}

export function AivaLogo({ size = 28, className, tagline = false }: { size?: number; className?: string; tagline?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className="relative grid place-items-center rounded-[28%] border border-white/10 bg-[radial-gradient(120%_120%_at_20%_10%,#241a4d,#0e0b1f_55%,#07070c)]"
        style={{ width: size * 1.35, height: size * 1.35 }}
      >
        <AivaMark size={size} />
      </span>
      <span className="leading-none">
        <span className="block font-semibold tracking-[0.28em]" style={{ fontSize: size * 0.62 }}>
          AIVA
        </span>
        {tagline && <span className="mt-1 block text-[11px] tracking-wide text-muted">Seu segundo cérebro</span>}
      </span>
    </span>
  );
}

/** Animated living orb that represents the AI. */
export function AivaOrb({ size = 40, className, active = false }: { size?: number; className?: string; active?: boolean }) {
  return (
    <span className={cn("relative inline-block", className)} style={{ width: size, height: size }} aria-hidden="true">
      <span className={cn("aiva-orb absolute inset-0", active && "[animation-duration:2s]")} />
    </span>
  );
}

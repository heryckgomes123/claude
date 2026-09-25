/**
 * Ícones temáticos (chaves do catálogo) + moedas do universo.
 * Ícones de interface vêm de lucide-react; os temáticos que não existem lá
 * (javali, arco, corvo, lobo) são desenhados aqui.
 */
import {
  Anvil, Axe, Beer, BookOpen, Castle, Coins, Crown, Dice5, Feather, Flame, Gem, Hammer, Heart, Key, Moon, Pickaxe, Shield, Skull, Star, Sword,
  type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { IconKey } from '../../../shared/catalog';

const Boar = ({ size = 24, color = 'currentColor', ...p }: LucideProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...(p as any)}>
    <path d="M6.5 7 4 3.5l4.5 2.2M17.5 7 20 3.5l-4.5 2.2" />
    <path d="M6 8.5C7.5 6.5 9.6 5.6 12 5.6s4.5.9 6 2.9l.7 3.6c.2 1.9-.6 3.5-2 4.7l-1 2.2c-.7 1.3-2 2-3.7 2s-3-.7-3.7-2l-1-2.2c-1.4-1.2-2.2-2.8-2-4.7Z" />
    <path d="M9.2 10.6h.01M14.8 10.6h.01" strokeWidth={2.6} />
    <ellipse cx="12" cy="16.3" rx="2.6" ry="1.7" />
    <path d="M8.6 16.4c-1.2-.6-1.6-1.8-1.4-3.1M15.4 16.4c1.2-.6 1.6-1.8 1.4-3.1" />
  </svg>
);
const Bow = ({ size = 24, color = 'currentColor', ...p }: LucideProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...(p as any)}>
    <path d="M5 3c7 1.5 12 6.5 16 16" />
    <path d="M5 3 21 19" strokeWidth={1} />
    <path d="M3 21 15 9M15 9l-1-3.5M15 9l3.5 1" />
    <path d="M3 21l1.5-3.5M3 21l3.5-1.5" />
  </svg>
);
const Raven = ({ size = 24, color = 'currentColor', ...p }: LucideProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...(p as any)}>
    <path d="M3 9.5 7 8c1-2.5 3-3.6 5.4-3.2C15.6 5.3 17 8 16.6 11l4.4 5-5.6-1.6L13 20l-1.5-4.2L8 18l1.4-4.8C6.9 12.4 5 11.2 3 9.5Z" />
    <path d="M11.2 7.8h.01" strokeWidth={2.6} />
  </svg>
);
const Wolf = ({ size = 24, color = 'currentColor', ...p }: LucideProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...(p as any)}>
    <path d="M5 3l2.5 5M19 3l-2.5 5" />
    <path d="M5 3 4 11l3 5 5 5 5-5 3-5-1-8-4 4h-6Z" />
    <path d="M9.5 11h.01M14.5 11h.01" strokeWidth={2.6} />
    <path d="M10.5 16l1.5 1.2 1.5-1.2" />
  </svg>
);

const MAP: Record<IconKey, ComponentType<LucideProps>> = {
  boar: Boar, hammer: Hammer, dagger: Sword, axe: Axe, bow: Bow, feather: Feather, coins: Coins, pickaxe: Pickaxe, raven: Raven, book: BookOpen,
  crown: Crown, flame: Flame, moon: Moon, tower: Castle, wolf: Wolf, shield: Shield, dice: Dice5, mug: Beer, skull: Skull, star: Star, key: Key,
  anvil: Anvil, gem: Gem, heart: Heart,
};

export function ThemeIcon({ name, ...p }: { name: IconKey | string } & LucideProps) {
  const C = MAP[name as IconKey] ?? Star;
  return <C {...p} />;
}

/** Moeda MIÚDA: disco de bronze cunhado com o javali. */
export function MiudaCoin({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id="mcoin" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff0bf" />
          <stop offset=".35" stopColor="#e7b958" />
          <stop offset=".8" stopColor="#9b6a24" />
          <stop offset="1" stopColor="#5e3b12" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#mcoin)" stroke="#5e3b12" strokeWidth=".8" />
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="rgba(94,59,18,.55)" strokeWidth=".8" />
      <path
        d="M8.3 9.3 7.3 7.4l1.9 1.1M15.7 9.3l1-1.9-1.9 1.1M8.2 10c1-1.3 2.3-1.9 3.8-1.9s2.8.6 3.8 1.9l.4 2.2c.1 1.1-.4 2.1-1.2 2.8l-.6 1.3c-.5.8-1.3 1.2-2.4 1.2s-1.9-.4-2.4-1.2l-.6-1.3c-.8-.7-1.3-1.7-1.2-2.8Z"
        fill="#6b4217"
        opacity=".85"
      />
    </svg>
  );
}

export function DiamondGem({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="dgem" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9ffe9" />
          <stop offset=".4" stopColor="#3fd982" />
          <stop offset="1" stopColor="#0d6b3a" />
        </linearGradient>
      </defs>
      <path d="M6 3h12l4 6-10 12L2 9Z" fill="url(#dgem)" stroke="#0a4d2a" strokeWidth=".8" />
      <path d="M2 9h20M8.5 3 6.8 9 12 21 17.2 9 15.5 3M6.8 9 12 3l5.2 6" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth=".7" />
    </svg>
  );
}

/** Brasão dourado do javali — pontos e reputação. */
export function PointsCrest({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="pcrest" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbe3a0" />
          <stop offset=".45" stopColor="#d9a441" />
          <stop offset="1" stopColor="#7d4f22" />
        </linearGradient>
      </defs>
      <path d="M12 1.5 21 4.5v6.8c0 5.3-3.8 9.6-9 11.2-5.2-1.6-9-5.9-9-11.2V4.5Z" fill="url(#pcrest)" stroke="#5e3b12" strokeWidth=".8" />
      <path d="M12 3.4 19.2 5.8v5.5c0 4.3-3 7.8-7.2 9.2-4.2-1.4-7.2-4.9-7.2-9.2V5.8Z" fill="#3a220f" opacity=".85" />
      <path
        d="M8.2 8.8 7.2 6.9l1.9 1.1M15.8 8.8l1-1.9-1.9 1.1M8.1 9.5c1-1.3 2.4-1.9 3.9-1.9s2.9.6 3.9 1.9l.4 2.2c.1 1.1-.4 2.1-1.2 2.8l-.6 1.3c-.5.8-1.3 1.2-2.5 1.2s-2-.4-2.5-1.2l-.6-1.3c-.8-.7-1.3-1.7-1.2-2.8Z"
        fill="url(#pcrest)"
      />
      <path d="M10.1 10.6h.01M13.9 10.6h.01" stroke="#3a220f" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
/** Compatibilidade: o selo de pontos agora é o brasão. */
export const PointsSeal = PointsCrest;

/** Escudo verde com o número do nível. */
export function LevelShield({ level, size = 26 }: { level: number; size?: number }) {
  return (
    <svg viewBox="0 0 26 28" width={size} height={(size * 28) / 26} aria-hidden="true">
      <defs>
        <linearGradient id="lshield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f7a4a" />
          <stop offset="1" stopColor="#0b3a22" />
        </linearGradient>
      </defs>
      <path d="M13 1.5 24 5v8c0 6.4-4.6 11.2-11 13.5C6.6 24.2 2 19.4 2 13V5Z" fill="url(#lshield)" stroke="#4fd98b" strokeWidth="1.2" />
      <text x="13" y="17.6" textAnchor="middle" fontFamily="Oswald, sans-serif" fontWeight="600" fontSize={level > 99 ? 8 : 11} fill="#d9ffe9">
        {level}
      </text>
    </svg>
  );
}

/** Carta com selo de cera — convites. */
export function LetterSeal({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 28 28" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M4 6.5h20v15H4Z" stroke="#d9a441" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m4 6.5 10 8 10-8" stroke="#d9a441" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="14" cy="16.5" r="4" fill="#9e2b25" stroke="#e0582a" strokeWidth=".8" />
      <path d="M12.3 15.6h.01M15.7 15.6h.01M12.6 18c.9.6 1.9.6 2.8 0" stroke="#f0cf83" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function HeartIcon({ size = 20, empty = false }: { size?: number; empty?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`heart ${empty ? 'is-empty' : 'is-full'}`} aria-hidden="true">
      <path d="M12 21s-7.5-4.6-9.6-9.4C1 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4.8-1.2 2.3-2.4 4.4-2.4C19.1 4.5 21 8.3 19.6 11.6 17.5 16.4 12 21 12 21Z" fill={empty ? '#3a2a24' : '#d83a2e'} stroke={empty ? '#6b5448' : '#ff9b8a'} strokeWidth=".9" />
      {!empty && <path d="M7 7.5c-1.3.3-2.2 1.5-2.1 3" stroke="rgba(255,230,220,.7)" strokeWidth="1.3" fill="none" strokeLinecap="round" />}
    </svg>
  );
}

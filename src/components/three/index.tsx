/**
 * Wrappers 3D com carregamento sob demanda e fallback.
 * Se o dispositivo não suporta bem WebGL (ou o aluno desativou), exibe SVG.
 */
import { Component, lazy, Suspense, type ReactNode } from 'react'
import { useGraphicsTier } from '@/hooks/useGraphicsTier'
import { RingProgress } from '@/components/charts/Charts'
import type { AchievementTier } from '@/types/models'
import { cn } from '@/lib/utils'

const LevelCoreCanvas = lazy(() => import('./LevelCoreCanvas'))
const MedalCanvas = lazy(() => import('./MedalCanvas'))

class GLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function LevelCore3D({ progress, streak, level, className }: { progress: number; streak: number; level: number; className?: string }) {
  const tier = useGraphicsTier()
  const fallback = (
    <div className="grid size-full place-items-center">
      <RingProgress value={progress} size={150} stroke={7}>
        <span className="font-display-wide text-4xl font-extrabold">{level}</span>
      </RingProgress>
    </div>
  )
  return (
    <div className={cn('relative', className)}>
      {tier === 'off' ? (
        fallback
      ) : (
        <GLBoundary fallback={fallback}>
          <Suspense fallback={<div className="grid size-full place-items-center"><div className="size-28 animate-pulse rounded-full border border-lift/30" /></div>}>
            <LevelCoreCanvas progress={progress} streak={streak} tier={tier} className="absolute inset-0" />
          </Suspense>
        </GLBoundary>
      )}
    </div>
  )
}

const TIER_BG: Record<AchievementTier, string> = {
  bronze: 'from-[#b87a4b] to-[#5a3a22]',
  silver: 'from-[#dfe5ee] to-[#6e7888]',
  gold: 'from-[#f0cd70] to-[#8a6a22]',
  lift: 'from-lift-2 to-lift-deep',
}

export function MedalBadge({ icon, tier, locked, size = 64 }: { icon: string; tier: AchievementTier; locked: boolean; size?: number }) {
  return (
    <div
      className={cn('grid shrink-0 place-items-center rounded-full bg-gradient-to-br p-[2.5px]', locked ? 'from-surface-3 to-surface-2' : TIER_BG[tier])}
      style={{ width: size, height: size }}
    >
      <div className={cn('grid size-full place-items-center rounded-full bg-[#0a0f1a]', locked && 'grayscale opacity-45')} style={{ fontSize: size * 0.42 }}>
        {icon}
      </div>
    </div>
  )
}

export function Medal3D({ icon, tier, locked, className }: { icon: string; tier: AchievementTier; locked: boolean; className?: string }) {
  const gfx = useGraphicsTier()
  const fallback = (
    <div className="grid size-full place-items-center">
      <MedalBadge icon={icon} tier={tier} locked={locked} size={150} />
    </div>
  )
  return (
    <div className={cn('relative', className)}>
      {gfx === 'off' ? (
        fallback
      ) : (
        <GLBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <MedalCanvas icon={icon} tier={tier} locked={locked} gfx={gfx} className="absolute inset-0" />
          </Suspense>
        </GLBoundary>
      )}
    </div>
  )
}

import { useMemo } from 'react'
import ThreeCanvas from './ThreeCanvas'
import { createMedal } from './scenes/medal'
import type { GraphicsTier } from '@/services/device/capabilities'
import type { AchievementTier } from '@/types/models'

export default function MedalCanvas({ icon, tier, locked, gfx, className }: { icon: string; tier: AchievementTier; locked: boolean; gfx: Exclude<GraphicsTier, 'off'>; className?: string }) {
  const factory = useMemo(() => createMedal({ icon, tier, locked }), [icon, tier, locked])
  return <ThreeCanvas factory={factory} tier={gfx} className={className} interactive label="Medalha 3D — arraste para girar" />
}

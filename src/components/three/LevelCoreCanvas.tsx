import { useMemo } from 'react'
import ThreeCanvas from './ThreeCanvas'
import { createLevelCore } from './scenes/levelCore'
import type { GraphicsTier } from '@/services/device/capabilities'

export default function LevelCoreCanvas({ progress, streak, tier, className }: { progress: number; streak: number; tier: Exclude<GraphicsTier, 'off'>; className?: string }) {
  const factory = useMemo(() => createLevelCore({ progress, streak }), [progress, streak])
  return <ThreeCanvas factory={factory} tier={tier} className={className} interactive label={`Progresso de nível: ${Math.round(progress * 100)}%`} />
}

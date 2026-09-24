import { useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { detectGraphicsTier } from '@/services/device/capabilities'

export function useGraphicsTier() {
  const mode = useAppStore((s) => s.settings.graphics)
  return useMemo(() => detectGraphicsTier(mode), [mode])
}

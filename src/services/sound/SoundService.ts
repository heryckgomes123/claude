/**
 * SoundService — feedback sonoro opcional.
 * Desligado por padrão; só toca se o aluno ativar em Perfil › Preferências.
 * Usa Web Audio (sem arquivos) — pode ser trocado por samples da marca depois.
 */
import { useAppStore } from '@/store/useAppStore'

export type SoundCue = 'tap' | 'success' | 'levelUp' | 'restEnd' | 'checkin'

let ctx: AudioContext | null = null

const CUES: Record<SoundCue, { f: number[]; d: number }> = {
  tap: { f: [660], d: 0.05 },
  success: { f: [523, 784], d: 0.12 },
  checkin: { f: [587, 880, 1175], d: 0.1 },
  levelUp: { f: [523, 659, 784, 1047], d: 0.11 },
  restEnd: { f: [880, 880], d: 0.09 },
}

export const SoundService = {
  play(cue: SoundCue) {
    if (!useAppStore.getState().settings.sound) return
    try {
      ctx ??= new AudioContext()
      const { f, d } = CUES[cue]
      f.forEach((freq, i) => {
        const osc = ctx!.createOscillator()
        const gain = ctx!.createGain()
        const t = ctx!.currentTime + i * d
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.0001, t)
        gain.gain.exponentialRampToValueAtTime(0.12, t + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + d)
        osc.connect(gain).connect(ctx!.destination)
        osc.start(t)
        osc.stop(t + d + 0.02)
      })
    } catch {
      /* áudio indisponível */
    }
  },
}

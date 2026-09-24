import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Clock, MapPin } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useProgress } from '@/services/progress'
import { XP_RULES } from '@/config/gamification.config'
import { LIFT_CONFIG } from '@/config/lift.config'
import { DEMO_USER_ID } from '@/data/demo/student'
import { Header } from '@/components/ui/Header'
import { Button } from '@/components/ui/Button'
import { IntegrationNotice } from '@/components/ui/States'
import { SoundService } from '@/services/sound/SoundService'
import { fmtTime } from '@/lib/dates'
import { vibrate } from '@/lib/utils'

/**
 * Check-in. Em produção, deve ser validado no servidor
 * (QR Code na recepção, geolocalização ou catraca) para evitar fraudes.
 */
export default function CheckIn() {
  const navigate = useNavigate()
  const checkIn = useAppStore((s) => s.checkIn)
  const today = useAppStore((s) => s.checkins.find((c) => new Date(c.at).toDateString() === new Date().toDateString()))
  const haptics = useAppStore((s) => s.settings.haptics)
  const { streak } = useProgress()
  const [now, setNow] = useState(new Date())
  const [justDone, setJustDone] = useState(false)
  const [holding, setHolding] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(id)
  }, [])

  const confirm = () => {
    const c = checkIn(DEMO_USER_ID)
    if (!c) return
    setJustDone(true)
    SoundService.play('checkin')
    if (haptics) vibrate([20, 50, 30])
  }

  const done = !!today

  return (
    <div className="flex min-h-dvh flex-col">
      <Header title="Check-in" back large={false} />
      <div className="relative flex flex-1 flex-col items-center px-6">
        <div className="absolute top-10 size-[380px] rounded-full bg-lift/15 blur-[100px]" />
        <p className="hud-label relative mt-4">Check-in na LIFT</p>
        <h1 className="font-display-wide relative mt-2 text-center text-[26px] leading-tight font-extrabold uppercase">
          {done ? 'Presença registrada' : 'Chegou para treinar?'}
        </h1>

        {/* Botão principal */}
        <div className="relative my-10 grid size-64 place-items-center">
          {!done &&
            [0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-6 rounded-full border border-lift/40"
                animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
              />
            ))}
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                className="relative grid size-48 place-items-center rounded-full bg-ok/12 ring-1 ring-ok/40"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              >
                <div className="text-center">
                  <motion.div
                    className="mx-auto grid size-16 place-items-center rounded-full bg-ok text-bg"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 14 }}
                  >
                    <Check size={34} strokeWidth={3.2} />
                  </motion.div>
                  <p className="mt-3 text-[13px] font-semibold text-ok">{fmtTime(today!.at)}</p>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="btn"
                onClick={confirm}
                onPointerDown={() => setHolding(true)}
                onPointerUp={() => setHolding(false)}
                onPointerLeave={() => setHolding(false)}
                animate={{ scale: holding ? 0.94 : 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                className="relative grid size-48 place-items-center rounded-full bg-gradient-to-b from-lift-2 to-lift shadow-[0_20px_80px_-10px_rgb(47_107_255/0.8),inset_0_2px_0_rgb(255_255_255/0.25)]"
                aria-label="Confirmar check-in"
              >
                <div className="text-center">
                  <MapPin size={34} className="mx-auto" />
                  <p className="font-display-wide mt-2 text-[15px] font-extrabold tracking-wider uppercase">Fazer check-in</p>
                </div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {justDone && (
            <motion.div className="relative -mt-4 mb-6 text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <p className="font-display-wide text-xl font-black uppercase">Check-in confirmado</p>
              <motion.p
                className="font-display-wide mt-2 inline-block rounded-full bg-lift/15 px-4 py-1.5 text-lg font-extrabold text-lift-3"
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 12 }}
              >
                +{XP_RULES.checkin} XP
              </motion.p>
              <p className="mt-3 text-[13px] text-ink-2">🔥 Sequência: {streak} {streak === 1 ? 'dia' : 'dias'}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="card-surface relative w-full divide-y divide-line">
          <div className="flex items-center gap-3 p-4">
            <MapPin size={18} className="text-lift-2" />
            <div className="flex-1">
              <p className="text-[11px] text-muted uppercase">Unidade</p>
              <p className="text-[14px] font-semibold">{LIFT_CONFIG.UNITS[0].name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Clock size={18} className="text-lift-2" />
            <div className="flex-1">
              <p className="text-[11px] text-muted uppercase">Horário</p>
              <p className="text-[14px] font-semibold tabular">{fmtTime(now.toISOString())}</p>
            </div>
          </div>
        </div>

        <div className="relative mt-auto w-full pt-6 pb-[max(var(--safe-bottom),20px)]">
          <IntegrationNotice className="mb-4">
            Modo demonstração: o check-in é salvo neste dispositivo. A validação real (QR Code da recepção ou localização) será feita pelo servidor.
          </IntegrationNotice>
          {done && (
            <Button block size="lg" variant="secondary" onClick={() => navigate('/treino')}>
              Ir para o treino
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

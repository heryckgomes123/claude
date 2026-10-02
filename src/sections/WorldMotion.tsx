import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Pause, Play } from '../components/Icons'
import { PieceCaption } from '../components/PieceCaption'
import { Reveal } from '../components/Reveal'
import { WORLDS } from '../config/content'
import { FILM, PORTFOLIO_BY_ID } from '../config/portfolio'
import { SERVICE_BY_ID } from '../config/quote'
import { useProjectActions } from '../state/actions'
import { useProject } from '../state/project'
import { useUI } from '../state/ui'

const W = WORLDS.motion

function formatTime(t: number): string {
  const s = Math.max(0, t)
  const frames = Math.floor((s % 1) * 24)
  return `00:${String(Math.floor(s)).padStart(2, '0')}:${String(frames).padStart(2, '0')}`
}

/** Barras de “forma de onda” decorativas (determinísticas). */
const WAVE = Array.from({ length: 64 }, (_, i) => 0.25 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)) * 0.75)

export function WorldMotion() {
  const { state } = useProject()
  const ui = useUI()
  const { startQuoteWith } = useProjectActions()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const film = PORTFOLIO_BY_ID[FILM.id]
  const recommended = state.interest === 'video'
  const { setVideoPlaying } = ui

  // Playhead suave enquanto toca.
  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => {
      if (videoRef.current) setTime(videoRef.current.currentTime)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  useEffect(() => setVideoPlaying(playing), [playing, setVideoPlaying])

  const seek = (t: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = t
    setTime(t)
    setStarted(true)
  }

  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    setStarted(true)
    if (v.paused) void v.play().catch(() => setPlaying(false))
    else v.pause()
  }

  const pct = (t: number) => `${(t / FILM.duration) * 100}%`
  const activeScene = FILM.scenes.find((s) => time >= s.start && time < s.end) ?? FILM.scenes[0]

  return (
    <section id="videos" data-scene="videos" aria-labelledby="videos-title" className="relative isolate overflow-hidden bg-ink-900 py-20 md:py-28">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.035)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_70%_40%,black,transparent_75%)]"
      />
      <div aria-hidden="true" className="absolute -right-40 top-10 -z-10 h-[520px] w-[520px] rounded-full bg-ion-500/10 blur-[120px]" />

      <div className="container-x grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
        <Reveal className="lg:col-span-5">
          <p className="eyebrow flex items-center gap-3 text-ion-300">
            <span className="text-mute-600">{W.index}</span> {W.eyebrow}
            {recommended && <span className="rounded-full bg-ion-400 px-2 py-0.5 text-[0.65rem] text-ink-950">Para você</span>}
          </p>
          <h2 id="videos-title" className="display mt-4 text-[2.2rem] text-bone md:text-[3.1rem]">
            {W.title}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-mute">{W.text}</p>
          <ul className="mt-7 flex flex-wrap gap-2">
            {SERVICE_BY_ID.video.deliverables.map((d) => (
              <li key={d} className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[0.85rem] text-bone/85">
                {d}
              </li>
            ))}
          </ul>
          <div className="mt-8 border-t border-white/10 pt-2">
            <PieceCaption item={film} />
          </div>
          <button type="button" className="btn btn-primary mt-8" onClick={() => startQuoteWith('video', 'world_motion')}>
            {W.cta}
            <ArrowRight size={18} />
          </button>
        </Reveal>

        {/* Ilha de edição */}
        <Reveal delay={0.08} className="lg:col-span-7">
          <div className="glass chrome-edge overflow-hidden rounded-[22px] shadow-[0_50px_100px_-50px_rgb(0_0_0/0.9)]">
            <div className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-2.5">
              <span aria-hidden="true" className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-coral-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              </span>
              <span className="eyebrow ml-2 truncate text-mute">intelra-film.mp4 · 9:16 · 24 fps</span>
              <span className="eyebrow ml-auto tabular-nums text-ion-300" aria-hidden="true">
                {formatTime(time)}
              </span>
            </div>

            <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
              {/* Monitor de programa */}
              <div className="relative mx-auto w-full max-w-[300px] sm:order-2 sm:w-[260px] md:w-[290px]">
                <div className="relative overflow-hidden rounded-xl bg-black ring-1 ring-white/10" style={{ aspectRatio: '9 / 16' }}>
                  <video
                    ref={videoRef}
                    className="absolute inset-0 h-full w-full object-cover"
                    poster={FILM.poster.src}
                    preload="none"
                    playsInline
                    controls={started}
                    width={720}
                    height={1280}
                    aria-label="INTELRA — filme do mascote (10 segundos, com áudio)"
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => setPlaying(false)}
                    onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                  >
                    {FILM.sources.map((s) => (
                      <source key={s.src} src={s.src} type={s.type} />
                    ))}
                  </video>
                  {!started && (
                    <button
                      type="button"
                      onClick={toggle}
                      className="group absolute inset-0 grid place-items-center bg-gradient-to-t from-black/50 via-transparent to-transparent"
                      aria-label="Reproduzir o filme do mascote (com áudio)"
                    >
                      <span className="grid h-16 w-16 place-items-center rounded-full bg-white/90 text-ink-950 shadow-[0_10px_40px_rgb(0_0_0/0.5)] transition-transform group-hover:scale-105">
                        <Play size={26} />
                      </span>
                      <span className="eyebrow absolute bottom-4 left-4 text-bone/85">Play · 10 s · com som</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Cenas */}
              <div className="sm:order-1">
                <p className="eyebrow text-mute-600">Cenas</p>
                <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-1">
                  {FILM.scenes.map((scene, i) => {
                    const active = started && activeScene === scene
                    return (
                      <li key={scene.label}>
                        <button
                          type="button"
                          onClick={() => seek(scene.start)}
                          aria-current={active ? 'true' : undefined}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                            active ? 'border-ion-400/70 bg-ion-400/10 text-bone' : 'border-white/10 text-bone/80 hover:border-white/25'
                          }`}
                        >
                          <span className="eyebrow text-mute-600">{String(i + 1).padStart(2, '0')}</span>
                          <span className="font-medium">{scene.label}</span>
                          <span className="ml-auto tabular-nums text-[0.75rem] text-mute">{scene.start.toFixed(1).replace('.', ',')}s</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <button type="button" onClick={toggle} className="btn btn-ghost btn-sm mt-4 w-full">
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                  {playing ? 'Pausar' : started ? 'Continuar' : 'Reproduzir'}
                </button>
              </div>
            </div>

            {/* Linha do tempo */}
            <div className="border-t border-white/[0.08] px-4 pb-5 pt-4 sm:px-5">
              <div className="relative rounded-md has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-4 has-[input:focus-visible]:outline-ion-400">
                <div aria-hidden="true" className="grid gap-1.5">
                  <div className="relative h-5">
                    <span className="eyebrow absolute -left-0.5 top-0.5 text-[0.6rem] text-mute-600">FX</span>
                    <span className="absolute inset-y-0 rounded-md bg-ion-400/25 ring-1 ring-ion-400/50" style={{ left: pct(6.2), width: pct(1.8) }} />
                  </div>
                  <div className="relative flex h-9 gap-1">
                    {FILM.scenes.map((s, i) => (
                      <span
                        key={s.label}
                        className={`flex items-center overflow-hidden rounded-md px-2 text-[0.7rem] font-semibold ${
                          i % 2 ? 'bg-volt-600/55 text-volt-100' : 'bg-volt-500/35 text-volt-100'
                        }`}
                        style={{ width: pct(s.end - s.start) }}
                      >
                        <span className="truncate">{s.label}</span>
                      </span>
                    ))}
                  </div>
                  <div className="flex h-7 items-center gap-[2px] rounded-md bg-white/[0.03] px-1">
                    {WAVE.map((h, i) => (
                      <span key={i} className="flex-1 rounded-full bg-coral-400/60" style={{ height: `${h * 100}%` }} />
                    ))}
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-1 bottom-0 w-0.5 bg-coral-300 shadow-[0_0_10px_rgb(255_135_99/0.8)]"
                  style={{ left: pct(time) }}
                >
                  <span className="absolute -left-[5px] -top-1 h-3 w-3 rotate-45 bg-coral-300" />
                </span>
                <label htmlFor="film-timeline" className="sr-only">
                  Linha do tempo do filme
                </label>
                <input
                  id="film-timeline"
                  type="range"
                  min={0}
                  max={FILM.duration}
                  step={0.1}
                  value={Math.min(time, FILM.duration)}
                  onChange={(e) => seek(Number(e.target.value))}
                  aria-valuetext={`${time.toFixed(1).replace('.', ',')} de ${FILM.duration} segundos, cena ${activeScene.label}`}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

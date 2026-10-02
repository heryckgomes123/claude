import { ArrowRight, WhatsApp } from '../components/Icons'
import { Reveal } from '../components/Reveal'
import { CLOSING, CTA } from '../config/content'
import { whatsappLink } from '../config/site'
import { track } from '../lib/analytics'
import { whatsappMessage } from '../lib/quote/summary'
import { Mascot } from '../mascot/Mascot'
import { useMascotLine } from '../mascot/useMascotLine'
import { useProject } from '../state/project'
import { useUI } from '../state/ui'

export function Closing() {
  const ui = useUI()
  const { state } = useProject()
  const line = useMascotLine()
  const wa = whatsappLink(whatsappMessage(state))

  return (
    <section id="fechamento" data-scene="fechamento" aria-labelledby="fechamento-title" className="relative isolate overflow-hidden py-24 md:py-32">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_70%_at_50%_100%,rgb(122_69_255/0.35),transparent_70%),radial-gradient(ellipse_40%_40%_at_80%_20%,rgb(34_230_246/0.12),transparent_70%)]"
      />
      <div className="container-x flex flex-col items-center text-center">
        <Reveal className="flex flex-col items-center">
          <Mascot state={line.state === 'confirmed' ? 'confirmed' : 'welcome'} size={128} alt="Robô anfitrião da INTELRA" />
          <h2 id="fechamento-title" className="display mt-8 max-w-3xl text-[2.4rem] text-bone md:text-[3.8rem]">
            {CLOSING.title}
          </h2>
          <p className="mt-5 max-w-xl text-lg text-mute">{CLOSING.text}</p>
          <div className="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <button type="button" className="btn btn-primary" onClick={() => ui.openQuote({ source: 'closing' })}>
              {CTA.primary}
              <ArrowRight size={18} />
            </button>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                onClick={() => track('whatsapp_clicked', { source: 'closing' })}
              >
                <WhatsApp size={18} />
                {CTA.whatsapp}
              </a>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

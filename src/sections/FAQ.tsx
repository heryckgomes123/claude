import { AnimatePresence, m } from 'framer-motion'
import { useId, useState } from 'react'
import { CtaButton } from '../components/CtaButton'
import { Plus } from '../components/Icons'
import { Reveal } from '../components/Reveal'
import { SectionHeader } from '../components/SectionHeader'
import { FAQ as FAQ_ITEMS } from '../data/faq'

const EASE = [0.22, 1, 0.36, 1] as const

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" aria-labelledby="faq-title" className="relative border-t border-gold-300/10">
      <div className="container-x grid gap-14 py-24 md:py-36 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <SectionHeader
              id="faq-title"
              eyebrow="FAQ"
              title={
                <>
                  Perguntas
                  <br />
                  <span className="slant text-gold">frequentes.</span>
                </>
              }
            />
            <Reveal delay={0.2} className="mt-8">
              <p className="text-mute">Ficou alguma dúvida? Pergunta direto pra gente.</p>
              <CtaButton icon="whatsapp" className="mt-4">
                Tirar dúvida no WhatsApp
              </CtaButton>
            </Reveal>
          </div>
        </div>

        <div className="border-b border-white/10 lg:col-span-7 lg:col-start-6">
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem
              key={item.q}
              question={item.q}
              answer={item.a}
              open={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function FaqItem({
  question,
  answer,
  open,
  onToggle,
  index,
}: {
  question: string
  answer: string
  open: boolean
  onToggle: () => void
  index: number
}) {
  const id = useId()
  return (
    <Reveal delay={index * 0.04} blur={false} className="border-t border-white/10">
      <h3>
        <button
          type="button"
          id={`${id}-q`}
          aria-expanded={open}
          aria-controls={`${id}-a`}
          onClick={onToggle}
          className="group flex w-full items-center justify-between gap-6 py-6 text-left md:py-7"
        >
          <span
            className={`text-lg font-medium tracking-[-0.02em] transition-colors duration-500 md:text-[1.35rem] ${open ? 'text-gold-100' : 'text-bone/80 group-hover:text-bone'}`}
          >
            {question}
          </span>
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-full transition-all duration-500 ease-premium ${
              open ? 'btn-gold rotate-45' : 'bg-white/[0.05] text-bone/70 ring-1 ring-white/10 group-hover:ring-gold-300/50'
            }`}
          >
            <Plus className="size-4" />
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            id={`${id}-a`}
            role="region"
            aria-labelledby={`${id}-q`}
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <p className="max-w-2xl pb-7 pr-12 text-pretty leading-relaxed text-mute">{answer}</p>
          </m.div>
        )}
      </AnimatePresence>
    </Reveal>
  )
}

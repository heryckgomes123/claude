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
    <section id="faq" aria-labelledby="faq-title" className="relative border-t border-ink-950/10 bg-bone text-ink-950">
      <div className="container-x grid gap-14 py-24 md:py-36 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <SectionHeader id="faq-title" tone="light" eyebrow="FAQ" title="Perguntas frequentes." />
            <Reveal delay={0.2} className="mt-8">
              <p className="text-ink-950/60">Ficou alguma dúvida?</p>
              <CtaButton variant="dark" icon="whatsapp" className="mt-4">
                Falar com a INTELRA
              </CtaButton>
            </Reveal>
          </div>
        </div>

        <div className="border-b border-ink-950/10 lg:col-span-7 lg:col-start-6">
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
    <Reveal delay={index * 0.04} blur={false} className="border-t border-ink-950/10">
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
            className={`text-lg font-medium tracking-[-0.02em] transition-colors duration-500 md:text-[1.35rem] ${open ? 'text-ink-950' : 'text-ink-950/75 group-hover:text-ink-950'}`}
          >
            {question}
          </span>
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-full transition-all duration-500 ease-premium ${
              open ? 'rotate-45 bg-ink-950 text-bone' : 'bg-ink-950/[0.05] text-ink-950/70 group-hover:bg-ink-950/10'
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
            <p className="max-w-2xl pb-7 pr-12 text-pretty leading-relaxed text-ink-950/60">{answer}</p>
          </m.div>
        )}
      </AnimatePresence>
    </Reveal>
  )
}

import { CtaButton } from '../components/CtaButton'
import { Instagram, WhatsApp } from '../components/Icons'
import { Logo } from '../components/Logo'
import { SITE, whatsappLink } from '../config/site'

const LINKS = [
  { label: 'Soluções', href: '#solucoes' },
  { label: 'Monte seu plano', href: '#monte' },
  { label: 'Projetos', href: '#projetos' },
  { label: 'Sobre', href: '#sobre' },
  { label: 'Contato', href: '#contato' },
]

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-gold-300/15 pb-28 pt-16 md:pb-12 md:pt-20">
      <div className="container-x">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <a href="#inicio" aria-label="INTELRA — voltar ao início">
              <Logo size="lg" />
            </a>
            <p className="eyebrow mt-5 text-gold-200/80">{SITE.pillars.join(' • ')}</p>
            <p className="mt-3 max-w-xs text-mute">{SITE.tagline}</p>
            <CtaButton icon="whatsapp" className="mt-6">
              Falar com a INTELRA
            </CtaButton>
          </div>

          <nav aria-label="Rodapé" className="md:col-span-3 md:col-start-7">
            <p className="eyebrow text-mute-600">Navegação</p>
            <ul className="mt-5 space-y-3">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-bone/75 transition-colors hover:text-gold-200">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-3">
            <p className="eyebrow text-mute-600">Redes</p>
            <ul className="mt-5 space-y-3">
              <li>
                <a
                  href={SITE.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-bone/75 transition-colors hover:text-gold-200"
                >
                  <Instagram className="size-4" /> Instagram
                </a>
              </li>
              <li>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-bone/75 transition-colors hover:text-gold-200"
                >
                  <WhatsApp className="size-4" /> WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 overflow-hidden" aria-hidden="true">
          <p className="poster text-outline-gold select-none text-center text-[26vw] leading-[0.8] opacity-40 lg:text-[22vw] 3xl:text-[20rem]">
            INTELRA
          </p>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-3 border-t border-white/[0.07] pt-6 text-sm text-mute-600 md:flex-row">
          <p>© {SITE.year} INTELRA. Todos os direitos reservados.</p>
          <p>Estratégia · Conteúdo · Tráfego · IA · Tecnologia</p>
        </div>
      </div>
    </footer>
  )
}

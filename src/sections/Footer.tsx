import { Instagram, WhatsApp } from '../components/Icons'
import { Logo } from '../components/Logo'
import { SITE, whatsappLink } from '../config/site'

const LINKS = [
  { label: 'Soluções', href: '#solucoes' },
  { label: 'Projetos', href: '#projetos' },
  { label: 'Sobre', href: '#sobre' },
  { label: 'Contato', href: '#contato' },
]

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.07] pb-28 pt-16 md:pb-12 md:pt-20">
      <div className="container-x">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <a href="#inicio" aria-label="INTELRA — voltar ao início" className="text-lg text-bone">
              <Logo />
            </a>
            <p className="mt-4 max-w-xs text-mute">{SITE.tagline}</p>
          </div>

          <nav aria-label="Rodapé" className="md:col-span-3 md:col-start-7">
            <p className="eyebrow text-mute-600">Navegação</p>
            <ul className="mt-5 space-y-3">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-bone/75 transition-colors hover:text-bone">
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
                  className="inline-flex items-center gap-2.5 text-bone/75 transition-colors hover:text-bone"
                >
                  <Instagram className="size-4" /> Instagram
                </a>
              </li>
              <li>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-bone/75 transition-colors hover:text-bone"
                >
                  <WhatsApp className="size-4" /> WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 overflow-hidden" aria-hidden="true">
          <p className="display select-none bg-gradient-to-b from-bone/[0.09] to-transparent bg-clip-text text-center text-[22vw] leading-[0.8] text-transparent lg:text-[18.5vw] 3xl:text-[17rem]">
            INTELRA
          </p>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-3 border-t border-white/[0.07] pt-6 text-sm text-mute-600 md:flex-row">
          <p>© {SITE.year} INTELRA. Todos os direitos reservados.</p>
          <p>Soluções digitais · Marketing · IA · Tecnologia</p>
        </div>
      </div>
    </footer>
  )
}

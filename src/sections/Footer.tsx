import { Logo } from '../components/Logo'
import { NAV_LINKS } from '../config/content'
import { CONTACT, SITE, SOCIAL, WHATSAPP_ENABLED, whatsappLink } from '../config/site'
import { track } from '../lib/analytics'

export function Footer() {
  const wa = whatsappLink('Olá, INTELRA! Vim pelo site.')
  return (
    <footer className="border-t border-white/[0.08] bg-ink-950 py-12">
      <div className="container-x grid grid-cols-1 gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo className="h-9 w-auto" />
          <p className="mt-4 max-w-sm text-[0.95rem] leading-relaxed text-mute">{SITE.description}</p>
        </div>
        <nav aria-label="Rodapé" className="md:col-span-3">
          <p className="eyebrow text-mute-600">Navegar</p>
          <ul className="mt-3 grid gap-2">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-bone/80 hover:text-bone">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-4">
          <p className="eyebrow text-mute-600">Contato</p>
          <ul className="mt-3 grid gap-2">
            {WHATSAPP_ENABLED && wa && (
              <li>
                <a href={wa} target="_blank" rel="noopener noreferrer" className="text-bone/80 hover:text-bone" onClick={() => track('whatsapp_clicked', { source: 'footer' })}>
                  WhatsApp
                </a>
              </li>
            )}
            {CONTACT.email && (
              <li>
                <a href={`mailto:${CONTACT.email}`} className="text-bone/80 hover:text-bone">
                  {CONTACT.email}
                </a>
              </li>
            )}
            {SOCIAL.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-bone/80 hover:text-bone">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="container-x mt-12 flex flex-col gap-2 border-t border-white/[0.06] pt-6 text-[0.82rem] text-mute-600 md:flex-row md:justify-between">
        <p>
          © {SITE.year} {SITE.name}. Todos os direitos reservados.
        </p>
        <p className="max-w-md">Os dados enviados pelo orçamento são usados só para responder à sua solicitação.</p>
      </div>
    </footer>
  )
}

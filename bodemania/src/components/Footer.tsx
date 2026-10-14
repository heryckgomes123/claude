import { useState } from 'react'
import { CATEGORIES } from '../data/catalog'
import { STORE, whatsappLink } from '../config/store'
import { isEmail } from '../lib/validate'
import { Link } from '../router'
import { toast } from '../state/shop'
import { Barcode, Card, Instagram, Lock, Pix, Whatsapp } from './Icons'
import Logo from './Logo'

export default function Footer() {
  const [email, setEmail] = useState('')
  return (
    <footer className="mt-20 bg-navy-950 text-white/80">
      <div className="dots">
        <div className="wrap grid gap-8 py-12 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="eyebrow text-gold-300">Clube Bodemania</p>
            <h2 className="display mt-2 text-3xl font-semibold text-white md:text-4xl">Lançamentos e ofertas antes de todo mundo.</h2>
            <p className="mt-2 text-sm text-white/60">Sem spam. Só novidades boas, uma ou duas vezes por mês.</p>
          </div>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              if (!isEmail(email)) return toast('Digite um e-mail válido.', 'err')
              setEmail('')
              toast('Pronto! Você está no Clube Bodemania.')
            }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              aria-label="Seu e-mail"
              className="h-12 flex-1 rounded-full border border-white/15 bg-white/5 px-5 text-white placeholder:text-white/40 focus:border-gold-300 focus:outline-none"
            />
            <button className="btn btn-gold">Quero receber</button>
          </form>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="wrap grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo dark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              Artigos maçônicos com acabamento de respeito e um ateliê de impressão 3D que transforma qualquer ideia em peça.
            </p>
            <div className="mt-5 flex gap-2">
              <a href={STORE.instagram} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full bg-white/8 hover:bg-white/15" aria-label="Instagram">
                <Instagram />
              </a>
              <a href={whatsappLink()} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full bg-white/8 hover:bg-white/15" aria-label="WhatsApp">
                <Whatsapp />
              </a>
            </div>
          </div>
          <FooterCol title="Maçonaria" links={CATEGORIES.filter((c) => c.universe === 'maconaria').map((c) => [`/c/${c.id}`, c.name])} />
          <FooterCol title="Impressão 3D" links={[...CATEGORIES.filter((c) => c.universe === '3d').map((c) => [`/c/${c.id}`, c.name]), ['/orcamento-3d', 'Orçamento instantâneo']]} />
          <FooterCol
            title="Atendimento"
            links={[
              ['/conta', 'Minha conta'],
              ['/rastreio', 'Rastrear pedido'],
              ['/ajuda', 'Perguntas frequentes'],
              ['/politicas/trocas', 'Trocas e devoluções'],
              ['/politicas/entrega', 'Prazos e entrega'],
              ['/politicas/privacidade', 'Privacidade (LGPD)'],
              ['/politicas/termos', 'Termos de uso'],
              ['/sobre', 'Sobre nós'],
              ['/admin', 'Painel da loja'],
            ]}
          />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="wrap flex flex-col gap-4 py-6 text-xs text-white/45 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1">Pagamento:</span>
            {[
              [<Pix size={16} key="p" />, 'Pix'],
              [<Card size={16} key="c" />, 'Cartão'],
              [<Barcode size={16} key="b" />, 'Boleto'],
            ].map(([icon, label]) => (
              <span key={label as string} className="flex items-center gap-1.5 rounded-md bg-white/8 px-2 py-1 text-white/70">
                {icon}
                {label}
              </span>
            ))}
            <span className="ml-2 flex items-center gap-1.5">
              <Lock size={14} /> Site seguro
            </span>
          </div>
          <p>
            © {STORE.year} {STORE.legalName} · CNPJ {STORE.cnpj} · {STORE.address}
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: string[][] }) {
  return (
    <div>
      <p className="mb-4 text-sm font-semibold text-white">{title}</p>
      <ul className="space-y-2.5 text-sm">
        {links.map(([to, label]) => (
          <li key={to}>
            <Link to={to} className="text-white/60 hover:text-gold-300">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

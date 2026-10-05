import { useEffect, useState } from 'react'
import { CATEGORIES, UNIVERSES, type Universe } from '../data/catalog'
import { RULES } from '../config/store'
import { Link, useRoute } from '../router'
import { favStore, openCart, uiStore, useCart, useUser } from '../state/shop'
import { Bag, ChevronDown, Cube, Heart, Menu, Truck, User } from './Icons'
import Logo from './Logo'
import ProductArt from './ProductArt'
import SearchBox from './SearchBox'
import { Sheet } from './ui'

const PROMOS = [
  `Frete grátis acima de R$ ${RULES.freeShippingFrom}`,
  `${RULES.pixDiscount * 100}% de desconto no Pix`,
  `Até ${RULES.maxInstallments}x sem juros no cartão`,
  'Primeira compra? Use o cupom BEMVINDO10',
]

function PromoBar() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setI((x) => (x + 1) % PROMOS.length), 3800)
    return () => window.clearInterval(t)
  }, [])
  return (
    <div className="bg-navy-900 text-white">
      <div className="wrap flex h-9 items-center justify-center gap-6 text-[0.78rem] font-medium">
        <span className="md:hidden" key={i}>
          {PROMOS[i]}
        </span>
        <div className="hidden items-center gap-8 md:flex">
          {PROMOS.map((p, k) => (
            <span key={p} className="flex items-center gap-8">
              {k > 0 && <span className="h-1 w-1 rounded-full bg-gold-300" />}
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function MegaMenu({ universe }: { universe: Universe }) {
  const cats = CATEGORIES.filter((c) => c.universe === universe)
  return (
    <div className="group relative">
      <Link
        to={`/loja?u=${universe}`}
        className="flex h-12 items-center gap-1 text-[0.92rem] font-medium text-ink hover:text-navy-600"
        aria-haspopup="true"
      >
        {UNIVERSES[universe].name}
        <ChevronDown size={16} className="transition group-hover:rotate-180" />
      </Link>
      <div className="invisible absolute top-full left-0 z-50 w-[620px] translate-y-2 rounded-3xl border border-line bg-white p-5 opacity-0 shadow-2xl transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <p className="mb-4 max-w-md text-sm text-mute">{UNIVERSES[universe].blurb}</p>
        <div className="grid grid-cols-2 gap-2">
          {cats.map((c) => (
            <Link key={c.id} to={`/c/${c.id}`} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-paper">
              <ProductArt art={c.art} color={c.tone} universe={universe} className="h-14 w-14 shrink-0 rounded-xl" />
              <span>
                <span className="block text-sm font-semibold">{c.name}</span>
                <span className="block text-xs text-mute">{c.blurb}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function MobileMenu() {
  const open = uiStore.use((s) => s.menuOpen)
  const user = useUser()
  const close = () => uiStore.set({ menuOpen: false })
  return (
    <Sheet open={open} onClose={close} side="left" title={<Logo compact />}>
      <nav className="p-3" onClick={(e) => (e.target as HTMLElement).closest('a') && close()}>
        <Link to={user ? '/conta' : '/entrar'} className="mb-3 flex items-center gap-3 rounded-2xl bg-navy-900 p-4 text-white">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
            <User />
          </span>
          <span>
            <span className="block text-sm font-semibold">{user ? `Olá, ${user.name.split(' ')[0]}` : 'Entrar ou criar conta'}</span>
            <span className="text-xs text-white/60">{user ? 'Pedidos, endereços e dados' : 'Acompanhe pedidos e compre mais rápido'}</span>
          </span>
        </Link>
        {(['maconaria', '3d'] as Universe[]).map((u) => (
          <div key={u} className="mb-3">
            <p className="eyebrow px-3 pt-3 pb-2 text-gold-600">{UNIVERSES[u].name}</p>
            {CATEGORIES.filter((c) => c.universe === u).map((c) => (
              <Link key={c.id} to={`/c/${c.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-paper-2">
                <ProductArt art={c.art} color={c.tone} universe={u} className="h-9 w-9 rounded-lg" />
                <span className="text-[15px] font-medium">{c.name}</span>
              </Link>
            ))}
          </div>
        ))}
        <div className="border-t border-line pt-3">
          {[
            ['/orcamento-3d', 'Orçamento 3D instantâneo'],
            ['/rastreio', 'Rastrear pedido'],
            ['/favoritos', 'Favoritos'],
            ['/ajuda', 'Ajuda e perguntas frequentes'],
            ['/sobre', 'Sobre a Bodemania'],
          ].map(([to, label]) => (
            <Link key={to} to={to} className="block rounded-xl px-3 py-3 text-[15px] font-medium hover:bg-paper-2">
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </Sheet>
  )
}

export default function Header() {
  const { totals } = useCart()
  const user = useUser()
  const favCount = favStore.use((s) => s.ids.length)
  const { path } = useRoute()
  const [scrolled, setScrolled] = useState(false)
  const checkout = path.startsWith('/checkout')

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  if (checkout)
    return (
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
        <div className="wrap flex h-16 items-center justify-between">
          <Link to="/" aria-label="Bodemania — início">
            <Logo compact />
          </Link>
          <span className="flex items-center gap-2 text-xs font-medium text-mute">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="5" y="10" width="14" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            Compra 100% segura
          </span>
        </div>
      </header>
    )

  return (
    <>
      <PromoBar />
      <header className={`sticky top-0 z-40 border-b bg-paper/92 backdrop-blur-md transition-shadow ${scrolled ? 'border-line shadow-[0_8px_30px_-18px_rgba(13,26,43,.35)]' : 'border-transparent'}`}>
        <div className="wrap flex h-16 items-center gap-3 md:h-[72px] md:gap-6">
          <button type="button" className="-ml-2 grid h-11 w-11 place-items-center rounded-full hover:bg-paper-2 lg:hidden" onClick={() => uiStore.set({ menuOpen: true })} aria-label="Abrir menu">
            <Menu size={22} />
          </button>
          <Link to="/" aria-label="Bodemania — início" className="shrink-0">
            <Logo />
          </Link>
          <div className="hidden flex-1 md:block md:max-w-xl lg:mx-auto">
            <SearchBox />
          </div>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Link to={user ? '/conta' : '/entrar'} className="hidden h-11 items-center gap-2 rounded-full px-3 hover:bg-paper-2 sm:flex" aria-label="Minha conta">
              <User size={22} />
              <span className="hidden text-left text-xs leading-tight xl:block">
                <span className="block text-mute">{user ? `Olá, ${user.name.split(' ')[0]}` : 'Olá, visitante'}</span>
                <span className="font-semibold">{user ? 'Minha conta' : 'Entrar / Cadastrar'}</span>
              </span>
            </Link>
            <Link to="/favoritos" className="relative hidden h-11 w-11 place-items-center rounded-full hover:bg-paper-2 sm:grid" aria-label={`Favoritos (${favCount})`}>
              <Heart size={22} />
              {favCount > 0 && <span className="absolute top-1.5 right-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-filament px-1 text-[10px] font-bold text-white">{favCount}</span>}
            </Link>
            <button type="button" onClick={openCart} className="relative grid h-11 w-11 place-items-center rounded-full hover:bg-paper-2" aria-label={`Carrinho (${totals.count} itens)`}>
              <Bag size={23} />
              {totals.count > 0 && <span className="absolute top-1 right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-navy-950">{totals.count}</span>}
            </button>
          </div>
        </div>
        <div className="wrap pb-3 md:hidden">
          <SearchBox />
        </div>
        <nav className="hidden border-t border-line lg:block" aria-label="Categorias">
          <div className="wrap flex items-center gap-7">
            <MegaMenu universe="maconaria" />
            <MegaMenu universe="3d" />
            <Link to="/c/personalizados" className="text-[0.92rem] font-medium hover:text-navy-600">
              Personalizados
            </Link>
            <Link to="/c/presentes-maconicos" className="text-[0.92rem] font-medium hover:text-navy-600">
              Presentes
            </Link>
            <Link to="/orcamento-3d" className="flex items-center gap-1.5 text-[0.92rem] font-semibold text-filament">
              <Cube size={18} /> Orçamento 3D na hora
            </Link>
            <Link to="/rastreio" className="ml-auto flex items-center gap-1.5 text-[0.85rem] text-mute hover:text-ink">
              <Truck size={17} /> Rastrear pedido
            </Link>
          </div>
        </nav>
      </header>
      <MobileMenu />
    </>
  )
}

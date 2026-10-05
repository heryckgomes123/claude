/** Elementos fixos da interface: avisos (toasts), WhatsApp, LGPD e barra inferior do celular. */
import { AnimatePresence, m } from 'framer-motion'
import { STORE, whatsappLink } from '../config/store'
import { Link, useRoute } from '../router'
import { favStore, prefsStore, uiStore, useUser } from '../state/shop'
import { Check, Cube, Grid, Heart, Home, Info, User, Whatsapp, X } from './Icons'

export function Toasts() {
  const toasts = uiStore.use((s) => s.toasts)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <m.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            className={`pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium shadow-xl ${
              t.tone === 'err' ? 'bg-err text-white' : t.tone === 'info' ? 'bg-navy-900 text-white' : 'bg-ok text-white'
            }`}
          >
            {t.tone === 'err' ? <X size={16} /> : t.tone === 'info' ? <Info size={16} /> : <Check size={16} />}
            {t.text}
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function WhatsAppFab() {
  const { path } = useRoute()
  if (path.startsWith('/checkout') || path.startsWith('/admin')) return null
  const raised = path.startsWith('/orcamento')
  return (
    <a
      href={whatsappLink()}
      target="_blank"
      rel="noreferrer"
      className={`fixed right-4 ${raised ? 'bottom-[150px]' : 'bottom-[86px]'} z-30 grid h-14 w-14 place-items-center rounded-full bg-[#25d366] text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,.8)] transition hover:scale-105 lg:bottom-6`}
      aria-label="Falar no WhatsApp"
    >
      <Whatsapp size={28} />
    </a>
  )
}

export function CookieBanner() {
  const cookies = prefsStore.use((s) => s.cookies)
  if (cookies) return null
  return (
    <div className="fixed inset-x-3 bottom-[84px] z-50 mx-auto max-w-xl rounded-2xl border border-line bg-white p-4 shadow-2xl lg:bottom-4">
      <p className="text-[13px] leading-snug text-ink sm:text-sm">
        Usamos cookies essenciais para o carrinho e a sua conta funcionarem e, com a sua permissão, cookies de medição para melhorar a loja.{' '}
        <Link to="/politicas/privacidade" className="font-medium text-navy-700 underline">
          Saiba mais
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn btn-primary btn-sm flex-1" onClick={() => prefsStore.set({ cookies: 'all' })}>
          Aceitar todos
        </button>
        <button type="button" className="btn btn-ghost btn-sm flex-1" onClick={() => prefsStore.set({ cookies: 'essential' })}>
          Só essenciais
        </button>
      </div>
    </div>
  )
}

export function MobileTabBar() {
  const { path } = useRoute()
  const user = useUser()
  const favs = favStore.use((s) => s.ids.length)
  if (path.startsWith('/checkout') || path.startsWith('/p/')) return null
  const tabs = [
    { to: '/', label: 'Início', icon: Home, active: path === '/' },
    { to: '/loja', label: 'Loja', icon: Grid, active: path.startsWith('/loja') || path.startsWith('/c/') },
    { to: '/orcamento-3d', label: 'Orçar 3D', icon: Cube, active: path.startsWith('/orcamento') },
    { to: '/favoritos', label: 'Favoritos', icon: Heart, active: path.startsWith('/favoritos'), badge: favs },
    { to: user ? '/conta' : '/entrar', label: user ? 'Conta' : 'Entrar', icon: User, active: path.startsWith('/conta') || path.startsWith('/entrar') },
  ]
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur lg:hidden" aria-label="Navegação principal">
      <div className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon, active, badge }) => (
          <Link key={to} to={to} className={`relative flex h-[62px] flex-col items-center justify-center gap-1 text-[0.68rem] font-medium ${active ? 'text-navy-900' : 'text-mute'}`}>
            {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-gold" />}
            <Icon size={22} />
            {label}
            {!!badge && <span className="absolute top-2 left-[calc(50%+6px)] grid h-4 min-w-4 place-items-center rounded-full bg-filament px-1 text-[9px] font-bold text-white">{badge}</span>}
          </Link>
        ))}
      </div>
    </nav>
  )
}

export function DemoRibbon() {
  if (!STORE.demo) return null
  return (
    <div className="bg-gold-100 text-center text-[0.72rem] font-medium text-gold-700">
      <div className="wrap py-1.5">
        Demonstração<span className="hidden sm:inline"> · pagamentos simulados, nenhum valor é cobrado</span>
      </div>
    </div>
  )
}

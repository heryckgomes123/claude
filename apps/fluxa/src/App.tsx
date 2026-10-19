import { lazy, Suspense, useEffect, useState } from 'react'
import mark from './assets/mark.webp'
import { Icon, type IconName } from './components/Icon'
import { Toaster } from './components/ui'
import { navigate, useRoute } from './lib/router'
import { timeAgo } from './lib/util'
import { initRuntime } from './store/runtime'
import { useStore } from './store/store'
import { Dashboard } from './pages/Dashboard'
import { Automations } from './pages/Automations'
import { Inbox } from './pages/Inbox'
import { Contacts } from './pages/Contacts'
import { Broadcasts } from './pages/Broadcasts'
import { Sequences } from './pages/Sequences'
import { Growth } from './pages/Growth'
import { SettingsPage } from './pages/Settings'

const Builder = lazy(() => import('./pages/builder/Builder'))

const NAV: { path: string; label: string; icon: IconName }[] = [
  { path: 'painel', label: 'Painel', icon: 'dashboard' },
  { path: 'automacoes', label: 'Automações', icon: 'flow' },
  { path: 'inbox', label: 'Inbox', icon: 'inbox' },
  { path: 'contatos', label: 'Contatos', icon: 'users' },
  { path: 'transmissoes', label: 'Transmissões', icon: 'megaphone' },
  { path: 'sequencias', label: 'Sequências', icon: 'repeat' },
  { path: 'crescimento', label: 'Crescimento', icon: 'rocket' },
  { path: 'configuracoes', label: 'Configurações', icon: 'settings' },
]

function Brand() {
  return (
    <a href="#/painel" className="flex items-center gap-2.5 px-2">
      <img src={mark} alt="" className="size-9 object-contain drop-shadow-[0_0_14px_rgba(226,174,58,.35)]" />
      <span className="leading-none">
        <span className="block font-poster text-[19px] uppercase tracking-wider">
          Intelra <span className="gold-text">Fluxa</span>
        </span>
        <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-mute-600">Automação de conversas</span>
      </span>
    </a>
  )
}

function Notifications() {
  const [open, setOpen] = useState(false)
  const notifications = useStore((s) => s.notifications)
  const markRead = useStore((s) => s.markNotificationsRead)
  const unread = notifications.filter((n) => !n.read).length
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notificações${unread ? ` (${unread} novas)` : ''}`}
        onClick={() => {
          setOpen(!open)
          if (!open) setTimeout(markRead, 1500)
        }}
        className="relative grid size-9 place-items-center rounded-xl border border-ink-700 bg-ink-850 text-mute transition hover:text-bone"
      >
        <Icon name="bell" size={17} />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-gold-300 px-1 text-[10px] font-bold text-ink-950">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="pop-in absolute bottom-12 left-0 z-50 w-[min(86vw,340px)] overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl">
            <div className="border-b border-ink-800 px-4 py-3 text-[13px] font-semibold">Notificações do time</div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-mute-600">Tudo em dia por aqui.</p>}
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    if (n.contactId) navigate(`/inbox/${n.contactId}`)
                  }}
                  className={`block w-full border-b border-ink-850 px-4 py-3 text-left text-[13px] transition hover:bg-ink-850 ${n.read ? 'text-mute' : 'text-bone'}`}
                >
                  {!n.read && <span className="mr-2 inline-block size-1.5 rounded-full bg-gold-300 align-middle" />}
                  {n.text}
                  <span className="mt-1 block text-[11px] text-mute-600">{timeAgo(n.ts)}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Sidebar({ current, onNavigate }: { current: string; onNavigate?: () => void }) {
  const unread = useStore((s) => s.contacts.reduce((sum, c) => sum + (c.isTest ? 0 : c.unread), 0))
  const aiOn = useStore((s) => s.settings.ai.apiKey.trim() !== '')
  return (
    <nav className="flex h-full flex-col gap-1 p-3" aria-label="Navegação principal">
      <div className="mb-5 mt-1">
        <Brand />
      </div>
      {NAV.map((item) => {
        const active = current === item.path
        return (
          <a
            key={item.path}
            href={`#/${item.path}`}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition ${active ? 'bg-gradient-to-r from-gold/15 to-transparent text-bone shadow-[inset_2px_0_0_var(--color-gold-300)]' : 'text-mute hover:bg-ink-850 hover:text-bone'}`}
          >
            <span className={active ? 'text-gold-300' : 'text-mute-600 group-hover:text-mute'}>
              <Icon name={item.icon} size={18} />
            </span>
            {item.label}
            {item.path === 'inbox' && unread > 0 && <span className="ml-auto rounded-full bg-gold-300 px-1.5 text-[11px] font-bold text-ink-950">{unread}</span>}
          </a>
        )
      })}
      <div className="mt-auto flex items-center justify-between gap-2 rounded-xl border border-ink-800 bg-ink-900 p-2.5">
        <Notifications />
        <a href="#/configuracoes" className="min-w-0 flex-1 text-right text-[11px] leading-tight text-mute-600 hover:text-mute">
          <span className={`inline-flex items-center gap-1 ${aiOn ? 'text-neon' : ''}`}>
            <Icon name="sparkles" size={12} /> {aiOn ? 'IA conectada' : 'IA local'}
          </span>
          <span className="block">um app INTELRA</span>
        </a>
      </div>
    </nav>
  )
}

export function App() {
  const route = useRoute()
  const [menuOpen, setMenuOpen] = useState(false)
  const section = route[0] ?? 'painel'

  useEffect(() => {
    initRuntime()
  }, [])
  useEffect(() => {
    if (!route.length) navigate('/painel')
  }, [route.length])

  const fullBleed = section === 'automacoes' && route[1] && route[1] !== 'novo'

  let page
  switch (section) {
    case 'automacoes':
      page = fullBleed ? (
        <Suspense fallback={<div className="grid h-full place-items-center text-mute">Carregando construtor…</div>}>
          <Builder id={route[1]} />
        </Suspense>
      ) : (
        <Automations gallery={route[1] === 'novo'} />
      )
      break
    case 'inbox':
      page = <Inbox contactId={route[1]} />
      break
    case 'contatos':
      page = <Contacts />
      break
    case 'transmissoes':
      page = <Broadcasts />
      break
    case 'sequencias':
      page = <Sequences />
      break
    case 'crescimento':
      page = <Growth />
      break
    case 'configuracoes':
      page = <SettingsPage />
      break
    default:
      page = <Dashboard />
  }

  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 border-r border-ink-800 bg-ink-950 lg:block">
        <Sidebar current={section} />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setMenuOpen(false)}>
          <aside className="pop-in h-full w-64 border-r border-ink-800 bg-ink-950" onClick={(e) => e.stopPropagation()}>
            <Sidebar current={section} onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ink-800 px-4 py-3 lg:hidden">
          <Brand />
          <button type="button" aria-label="Abrir menu" onClick={() => setMenuOpen(true)} className="grid size-9 place-items-center rounded-xl border border-ink-700 text-mute">
            <Icon name="menu" />
          </button>
        </header>
        <main className={`min-h-0 flex-1 ${fullBleed || section === 'inbox' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {fullBleed || section === 'inbox' ? page : <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{page}</div>}
        </main>
      </div>
      <Toaster />
    </div>
  )
}

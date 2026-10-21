import { lazy, Suspense, useEffect, useState } from 'react'
import wordmark from './assets/logo-wordmark.png'
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

const NAV: { title?: string; items: { path: string; label: string; icon: IconName }[] }[] = [
  { items: [{ path: 'painel', label: 'Painel', icon: 'dashboard' }] },
  {
    title: 'Conversas',
    items: [
      { path: 'inbox', label: 'Inbox', icon: 'inbox' },
      { path: 'automacoes', label: 'Automações', icon: 'flow' },
      { path: 'transmissoes', label: 'Transmissões', icon: 'megaphone' },
      { path: 'sequencias', label: 'Sequências', icon: 'repeat' },
    ],
  },
  {
    title: 'Audiência',
    items: [
      { path: 'contatos', label: 'Contatos', icon: 'users' },
      { path: 'crescimento', label: 'Crescimento', icon: 'rocket' },
    ],
  },
]

function Brand() {
  return (
    <a href="#/painel" className="block px-1.5" aria-label="INTELRA Fluxa, ir para o painel">
      <img src={wordmark} alt="Intelra Fluxa" className="h-8 w-auto" />
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
        className="relative grid size-8 place-items-center rounded-lg text-white/60 transition hover:bg-white/8 hover:text-white"
      >
        <Icon name="bell" size={17} />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-[16px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-4 text-navy">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="pop-in absolute bottom-11 left-0 z-50 w-[min(86vw,340px)] overflow-hidden rounded-xl border border-line bg-surface text-fg shadow-pop">
            <div className="border-b border-line px-4 py-3 text-[13px] font-semibold">Notificações do time</div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-faint">Tudo em dia por aqui.</p>}
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    if (n.contactId) navigate(`/inbox/${n.contactId}`)
                  }}
                  className={`block w-full border-b border-line px-4 py-3 text-left text-[13px] transition last:border-0 hover:bg-sunken ${n.read ? 'text-muted' : 'text-fg'}`}
                >
                  {!n.read && <span className="mr-2 inline-block size-1.5 rounded-full bg-brand-500 align-middle" />}
                  {n.text}
                  <span className="mt-1 block text-[11px] text-faint">{timeAgo(n.ts)}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function NavLink({ path, label, icon, active, badge, onNavigate }: { path: string; label: string; icon: IconName; active: boolean; badge?: number; onNavigate?: () => void }) {
  return (
    <a
      href={`#/${path}`}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] transition ${active ? 'bg-white/10 font-medium text-white' : 'text-white/65 hover:bg-white/6 hover:text-white'}`}
    >
      {active && <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-brand" />}
      <span className={active ? 'text-brand' : 'text-white/45 group-hover:text-white/75'}>
        <Icon name={icon} size={17} />
      </span>
      {label}
      {badge ? <span className="ml-auto rounded-md bg-brand px-1.5 text-[11px] font-semibold leading-[18px] text-navy">{badge}</span> : null}
    </a>
  )
}

function Sidebar({ current, onNavigate }: { current: string; onNavigate?: () => void }) {
  const unread = useStore((s) => s.contacts.reduce((sum, c) => sum + (c.isTest ? 0 : c.unread), 0))
  const aiOn = useStore((s) => s.settings.ai.apiKey.trim() !== '')
  const businessName = useStore((s) => s.settings.businessName)
  const agentName = useStore((s) => s.settings.agentName)
  return (
    <nav className="flex h-full flex-col bg-navy px-3 pb-3 pt-5 text-white" aria-label="Navegação principal">
      <Brand />
      <div className="mt-5 flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2">
        <span className="grid size-7 place-items-center rounded-md bg-gradient-to-br from-brand to-violet text-[12px] font-bold text-white">{(businessName || 'I').slice(0, 1).toUpperCase()}</span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[13px] font-medium">{businessName || 'Meu negócio'}</span>
          <span className="block text-[11px] text-white/50">Espaço de trabalho</span>
        </span>
      </div>
      <div className="mt-4 flex flex-1 flex-col gap-4 overflow-y-auto">
        {NAV.map((group, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {group.title && <span className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">{group.title}</span>}
            {group.items.map((item) => (
              <NavLink key={item.path} {...item} active={current === item.path} badge={item.path === 'inbox' ? unread : undefined} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-0.5 border-t border-white/10 pt-3">
        <NavLink path="configuracoes" label="Configurações" icon="settings" active={current === 'configuracoes'} onNavigate={onNavigate} />
        <div className="mt-2 flex items-center gap-2.5 px-1.5">
          <span className="grid size-8 place-items-center rounded-full bg-white/10 text-[12px] font-semibold">{(agentName || 'T').slice(0, 1).toUpperCase()}</span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-medium">{agentName || 'Time'}</span>
            <a href="#/configuracoes" className={`inline-flex items-center gap-1 text-[11px] ${aiOn ? 'text-brand' : 'text-white/50 hover:text-white/75'}`}>
              <Icon name="sparkles" size={11} /> {aiOn ? 'IA do Claude conectada' : 'IA local'}
            </a>
          </span>
          <Notifications />
        </div>
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
        <Suspense fallback={<div className="grid h-full place-items-center text-muted">Carregando construtor…</div>}>
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
      <aside className="hidden w-[248px] shrink-0 lg:block">
        <Sidebar current={section} />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-navy/50 lg:hidden" onClick={() => setMenuOpen(false)}>
          <aside className="pop-in h-full w-[264px]" onClick={(e) => e.stopPropagation()}>
            <Sidebar current={section} onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between bg-navy px-4 py-3 lg:hidden">
          <Brand />
          <button type="button" aria-label="Abrir menu" onClick={() => setMenuOpen(true)} className="grid size-9 place-items-center rounded-lg text-white/75 hover:bg-white/10">
            <Icon name="menu" />
          </button>
        </header>
        <main className={`min-h-0 flex-1 ${fullBleed || section === 'inbox' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {fullBleed || section === 'inbox' ? page : <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{page}</div>}
        </main>
      </div>
      <Toaster />
    </div>
  )
}

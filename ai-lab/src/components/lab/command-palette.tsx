'use client'
import { ArrowRight, CornerDownLeft, Loader2, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { CONTENT_TYPE_META, contentHref } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { SearchResult } from '@/server/services/search/types'
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog'
import { Kbd } from '../ui/misc'
import { ContentTypeIcon } from './content-icons'
import { Highlight } from './highlight'
import { PRIMARY_NAV, STUDIO_NAV } from './nav-config'

export function useCommandPalette() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((v) => !v)
      } else if (event.key === '/' && !typing) {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return { open, setOpen }
}

type Item = { key: string; href: string; title: string; subtitle?: string; result?: SearchResult; icon?: React.ReactNode }

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const abortRef = useRef<AbortController | null>(null)

  function onQueryChange(value: string) {
    setQuery(value)
    setLoading(Boolean(value.trim()))
  }

  useEffect(() => {
    const q = query.trim()
    if (!q) return
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=10`, { signal: controller.signal })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as { results: SearchResult[] }
        setResults(data.results)
        setFailed(false)
        setActive(0)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setFailed(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 180)
    return () => window.clearTimeout(timer)
  }, [query])

  const items: Item[] = query.trim()
    ? [
        ...results.map((r) => ({
          key: r.id,
          href: contentHref(r.type, r.slug),
          title: r.title,
          subtitle: r.summary,
          result: r,
        })),
        {
          key: 'all',
          href: `/lab/search?q=${encodeURIComponent(query.trim())}`,
          title: `Ver todos os resultados para “${query.trim()}”`,
          icon: <ArrowRight className="size-4 text-gold-300" />,
        },
      ]
    : [...PRIMARY_NAV, ...STUDIO_NAV].map((n) => ({
        key: n.href,
        href: n.href,
        title: n.label,
        icon: <n.icon className="size-4 text-mute" />,
      }))

  const go = useCallback(
    (href: string) => {
      onOpenChange(false)
      onQueryChange('')
      router.push(href)
    },
    [onOpenChange, router],
  )

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(i + 1, items.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const item = items[active]
      if (item) go(item.href)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[12dvh] max-w-2xl translate-y-0 overflow-hidden p-0 sm:top-[14dvh]"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Buscar no Lab</DialogTitle>
        <div className="flex items-center gap-3 border-b border-border px-4">
          {loading ? <Loader2 className="size-4 animate-spin text-mute" /> : <Search className="size-4 text-mute" />}
          <input
            autoFocus
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Busque prompts, workflows, ferramentas…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-mute-600"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={items[active] ? `${listId}-${active}` : undefined}
            aria-label="Buscar no Lab"
            maxLength={120}
          />
        </div>
        <ul id={listId} role="listbox" className="max-h-[60dvh] overflow-y-auto p-2">
          {!query.trim() && <li className="eyebrow px-3 pb-1 pt-2 !text-[10px]">Ir para</li>}
          {items.map((item, index) => (
            <li
              key={item.key}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onClick={() => go(item.href)}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors',
                index === active ? 'bg-bone/[0.06]' : '',
              )}
            >
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-border bg-ink-800">
                {item.result ? <ContentTypeIcon type={item.result.type} className="size-3.5 text-gold-300" /> : item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{item.title}</span>
                  {item.result && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-mute-600">
                      {CONTENT_TYPE_META[item.result.type].label}
                    </span>
                  )}
                </span>
                {item.result && (
                  <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-mute">
                    {item.result.highlight ? <Highlight text={item.result.highlight} /> : item.subtitle}
                  </span>
                )}
              </span>
              {index === active && <CornerDownLeft className="mt-1 size-3.5 shrink-0 text-mute-600" aria-hidden />}
            </li>
          ))}
          {query.trim() && !loading && results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-mute">
              {failed ? 'A busca falhou. Tente novamente.' : 'Nada encontrado. Tente outros termos — ex.: “produto”, “vídeo”, “retrato”.'}
            </li>
          )}
        </ul>
        <div className="hidden items-center gap-4 border-t border-border px-4 py-2.5 text-[11px] text-mute-600 sm:flex">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navegar
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> abrir
          </span>
          <span className="flex items-center gap-1">
            <Kbd>esc</Kbd> fechar
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import Form from 'next/form'
import Link from 'next/link'
import { useRef, useState } from 'react'
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  MEDIA_LABELS,
  MEDIA_TYPES,
  PRICING_LABELS,
  PRICING_STATUSES,
  SORTS,
  SORT_LABELS,
  TIME_BUCKETS,
  TIME_BUCKET_LABELS,
} from '@/lib/labels'
import type { ParsedListParams } from '@/lib/list-params'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { NativeSelect } from '../ui/input'

type Option = { slug: string; name?: string; title?: string; count?: number }
type FilterKey = 'category' | 'tag' | 'tool' | 'difficulty' | 'media' | 'pricing' | 'time'

export function FilterBar({
  action,
  values,
  filters,
  options,
  searchPlaceholder = 'Buscar…',
  mediaOptions = MEDIA_TYPES,
}: {
  action: string
  values: ParsedListParams
  filters: FilterKey[]
  options: { categories?: Option[]; tags?: Option[]; tools?: Option[] }
  searchPlaceholder?: string
  mediaOptions?: readonly (typeof MEDIA_TYPES)[number][]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [showFilters, setShowFilters] = useState(false)
  const submit = () => formRef.current?.requestSubmit()

  const active = filters.filter((f) => values[f])
  const labelFor = (key: FilterKey, value: string) => {
    switch (key) {
      case 'category':
        return options.categories?.find((o) => o.slug === value)?.name ?? value
      case 'tag':
        return `#${options.tags?.find((o) => o.slug === value)?.name ?? value}`
      case 'tool':
        return options.tools?.find((o) => o.slug === value)?.title ?? value
      case 'difficulty':
        return DIFFICULTY_LABELS[value as keyof typeof DIFFICULTY_LABELS]
      case 'media':
        return MEDIA_LABELS[value as keyof typeof MEDIA_LABELS]
      case 'pricing':
        return PRICING_LABELS[value as keyof typeof PRICING_LABELS]
      case 'time':
        return TIME_BUCKET_LABELS[value as keyof typeof TIME_BUCKET_LABELS]
    }
  }

  const withoutParam = (key: string) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(values)) if (k !== key && k !== 'page' && v) params.set(k, String(v))
    const s = params.toString()
    return s ? `${action}?${s}` : action
  }

  const select = (key: FilterKey, label: string, entries: { value: string; label: string }[]) => (
    <label className="grid gap-1" key={key}>
      <span className="sr-only">{label}</span>
      <NativeSelect name={key} defaultValue={values[key] ?? ''} onChange={submit} className="h-9 min-w-40 text-[13px]" aria-label={label}>
        <option value="">{label}</option>
        {entries.map((e) => (
          <option key={e.value} value={e.value}>
            {e.label}
          </option>
        ))}
      </NativeSelect>
    </label>
  )

  return (
    <div className="grid gap-3">
      <Form ref={formRef} action={action} className="grid gap-3" role="search">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-mute-600" aria-hidden />
            <input
              type="search"
              name="q"
              defaultValue={values.q ?? ''}
              placeholder={searchPlaceholder}
              maxLength={120}
              aria-label="Buscar"
              className="h-11 w-full rounded-xl border border-input bg-ink-900/80 pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-mute-600 hover:border-bone/20 focus:border-gold-300/60 focus:ring-2 focus:ring-gold-300/20"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            className="relative h-11 w-11 px-0 md:hidden"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-controls="filters"
            aria-label={`Filtros${active.length ? ` (${active.length} ativos)` : ''}`}
          >
            <SlidersHorizontal />
            {active.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-gold-300 text-[10px] font-semibold text-ink-950">
                {active.length}
              </span>
            )}
          </Button>
          <NativeSelect name="sort" defaultValue={values.sort ?? ''} onChange={submit} className="h-11 w-32 sm:w-44" aria-label="Ordenar">
            <option value="">{SORT_LABELS.recent}</option>
            {SORTS.filter((s) => s !== 'recent').map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div id="filters" className={cn('flex-wrap gap-2', showFilters ? 'flex' : 'hidden md:flex')}>
          {filters.includes('category') &&
            options.categories?.length !== 0 &&
            select(
              'category',
              'Categoria',
              (options.categories ?? []).map((c) => ({ value: c.slug, label: `${c.name}${c.count ? ` (${c.count})` : ''}` })),
            )}
          {filters.includes('tool') &&
            options.tools?.length !== 0 &&
            select('tool', 'Ferramenta', (options.tools ?? []).map((t) => ({ value: t.slug, label: t.title ?? t.slug })))}
          {filters.includes('difficulty') &&
            select('difficulty', 'Dificuldade', DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] })))}
          {filters.includes('media') && select('media', 'Mídia', mediaOptions.map((m) => ({ value: m, label: MEDIA_LABELS[m] })))}
          {filters.includes('pricing') &&
            select('pricing', 'Preço', PRICING_STATUSES.map((p) => ({ value: p, label: PRICING_LABELS[p] })))}
          {filters.includes('time') && select('time', 'Tempo', TIME_BUCKETS.map((t) => ({ value: t, label: TIME_BUCKET_LABELS[t] })))}
          {filters.includes('tag') &&
            options.tags?.length !== 0 &&
            select('tag', 'Tag', (options.tags ?? []).map((t) => ({ value: t.slug, label: t.name ?? t.slug })))}
          <noscript>
            <Button type="submit" size="sm">
              Aplicar
            </Button>
          </noscript>
        </div>
      </Form>

      {(active.length > 0 || values.q) && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          {values.q && (
            <Link href={withoutParam('q')} className="inline-flex items-center gap-1 rounded-full border border-gold-300/25 bg-gold-300/10 px-3 py-1 text-gold-100">
              “{values.q}” <X className="size-3" aria-label="remover" />
            </Link>
          )}
          {active.map((key) => (
            <Link
              key={key}
              href={withoutParam(key)}
              className="inline-flex items-center gap-1 rounded-full border border-gold-300/25 bg-gold-300/10 px-3 py-1 text-gold-100"
            >
              {labelFor(key, String(values[key]))} <X className="size-3" aria-label="remover filtro" />
            </Link>
          ))}
          <Link href={action} className="px-2 text-mute hover:text-bone">
            Limpar tudo
          </Link>
        </div>
      )}
    </div>
  )
}

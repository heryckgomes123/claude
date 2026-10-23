import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { CATEGORIES, useProducts, type Product } from '../data/catalog'
import { money } from '../lib/format'
import { resizeImage } from '../lib/image'
import { addPhotos, hasBundledPhotos, photoStore, removePhoto, storedPhotosBytes } from '../state/photos'
import { messageOf, toast } from '../state/shop'
import { Link } from '../router'
import { Plus, Trash, Upload } from '../components/Icons'
import ProductImage from '../components/ProductImage'
import { Field } from '../components/ui'

export function AdminProducts() {
  return api.mode === 'supabase' ? <DbProducts /> : <LocalPhotos />
}

const num = (v: string) => {
  const n = Number(String(v).replace(',', '.'))
  return String(v).trim() !== '' && Number.isFinite(n) ? n : null
}

// ───────────────────────── Produção: produtos no banco ─────────────────────────

function DbProducts() {
  const [list, setList] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState('')
  const [creating, setCreating] = useState(false)
  const reload = async () => {
    try {
      setList(await api.admin.loadProducts())
    } catch (e) {
      toast(messageOf(e), 'err')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => void reload(), [])

  const shown = useMemo(() => list.filter((p) => !q.trim() || p.name.toLowerCase().includes(q.toLowerCase())), [list, q])
  const lowStock = list.filter((p) => p.active !== false && p.stock !== undefined && p.stock <= 3).length

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-3xl font-semibold">Produtos</h1>
          <p className="mt-1 text-sm text-mute">
            {list.length} produtos{lowStock > 0 && <span className="font-semibold text-filament-600"> · {lowStock} com estoque baixo</span>}. Produto inativo não aparece na loja.
          </p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
          <Plus size={16} /> Novo produto
        </button>
      </div>

      {creating && (
        <NewProduct
          onCancel={() => setCreating(false)}
          onCreated={async (p) => {
            setCreating(false)
            await reload()
            setEditing(p.id)
          }}
        />
      )}

      <input className="field mt-5 max-w-sm" placeholder="Buscar produto…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar produto" />

      <div className="mt-4 space-y-3">
        {loading && <p className="rounded-3xl border border-line bg-white p-10 text-center text-sm text-mute">Carregando produtos…</p>}
        {shown.map((p) => (
          <ProductRow key={p.id} p={p} open={editing === p.id} onToggle={() => setEditing(editing === p.id ? '' : p.id)} onChanged={reload} />
        ))}
      </div>
    </div>
  )
}

function NewProduct({ onCancel, onCreated }: { onCancel: () => void; onCreated: (p: Product) => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].id as string)
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="mt-5 grid gap-4 rounded-3xl border border-line bg-white p-5 md:grid-cols-[2fr_1.5fr_1fr_auto] md:items-end"
      onSubmit={async (e) => {
        e.preventDefault()
        const p = num(price)
        if (!name.trim() || p === null || p < 0) return toast('Informe nome e preço.', 'err')
        setBusy(true)
        try {
          const created = await api.admin.createProduct({ name: name.trim(), category: category as Product['category'], price: p })
          toast('Produto criado como inativo. Complete os dados e ative.')
          onCreated(created)
        } catch (err) {
          toast(messageOf(err), 'err')
        } finally {
          setBusy(false)
        }
      }}
    >
      <Field label="Nome do produto" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Categoria</span>
        <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <Field label="Preço (R$)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} required />
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={busy}>
          Criar
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function ProductRow({ p, open, onToggle, onChanged }: { p: Product; open: boolean; onToggle: () => void; onChanged: () => Promise<void> }) {
  const [price, setPrice] = useState(String(p.price))
  const [stock, setStock] = useState(p.stock === undefined ? '' : String(p.stock))
  const [busy, setBusy] = useState(false)
  const newPrice = num(price)
  const newStock = stock.trim() === '' ? undefined : num(stock)
  const dirty = newPrice !== p.price || newStock !== p.stock
  const valid = newPrice !== null && newPrice >= 0 && (stock.trim() === '' || (newStock != null && Number.isInteger(newStock) && newStock >= 0))

  const patch = async (change: Partial<Product>, ok = 'Salvo') => {
    setBusy(true)
    try {
      await api.admin.saveProduct({ id: p.id, ...change })
      toast(ok)
      await onChanged()
    } catch (e) {
      toast(messageOf(e), 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`rounded-3xl border bg-white ${p.active === false ? 'border-dashed border-line-2 opacity-90' : 'border-line'}`}>
      <div className="flex flex-wrap items-center gap-3 p-3 md:p-4">
        <ProductImage p={p} className="h-14 w-14 shrink-0 rounded-xl" />
        <div className="min-w-[10rem] flex-1">
          <button type="button" onClick={onToggle} className="line-clamp-2 text-left text-sm leading-snug font-semibold hover:underline" aria-expanded={open}>
            {p.name}
          </button>
          <p className="text-xs text-mute">
            {CATEGORIES.find((c) => c.id === p.category)?.name} · {p.images?.length ?? 0} foto(s)
            {p.stock !== undefined && p.stock <= 3 && <span className="font-semibold text-filament-600"> · estoque baixo</span>}
          </p>
        </div>
        <label className="w-24">
          <span className="block text-[0.65rem] font-semibold text-mute uppercase">Preço R$</span>
          <input className="field !min-h-10 !px-2.5 text-sm" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} aria-label={`Preço de ${p.name}`} />
        </label>
        <label className="w-20">
          <span className="block text-[0.65rem] font-semibold text-mute uppercase">Estoque</span>
          <input className="field !min-h-10 !px-2.5 text-sm" inputMode="numeric" placeholder="∞" value={stock} onChange={(e) => setStock(e.target.value)} aria-label={`Estoque de ${p.name}`} />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-5 w-5 accent-navy-900" checked={p.active !== false} disabled={busy} onChange={(e) => patch({ active: e.target.checked }, e.target.checked ? 'Produto publicado na loja' : 'Produto tirado da loja')} />
          Ativo
        </label>
        {dirty && (
          <button type="button" className="btn btn-primary btn-sm" disabled={busy || !valid} onClick={() => patch({ price: newPrice!, stock: newStock ?? undefined }, 'Preço e estoque salvos')}>
            Salvar
          </button>
        )}
      </div>
      {open && <ProductEditor p={p} onChanged={onChanged} />}
    </div>
  )
}

const BADGES = ['', 'Novo', 'Mais vendido', 'Sob encomenda', 'Personalizável', 'Exclusivo']

function ProductEditor({ p, onChanged }: { p: Product; onChanged: () => Promise<void> }) {
  const [f, setF] = useState({
    name: p.name,
    slug: p.slug,
    category: p.category as string,
    short: p.short,
    description: p.description.join('\n\n'),
    highlights: p.highlights.join('\n'),
    tags: p.tags.join(', '),
    compareAt: p.compareAt ? String(p.compareAt) : '',
    leadDays: String(p.leadDays),
    weight: String(p.weight),
    w: String(p.dims?.widthCm ?? 16),
    h: String(p.dims?.heightCm ?? 6),
    l: String(p.dims?.lengthCm ?? 22),
    badge: p.badge ?? '',
    options: JSON.stringify(p.options ?? [], null, 1),
    personalization: p.personalization ? JSON.stringify(p.personalization, null, 1) : '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }))

  const save = async () => {
    setError('')
    let options: unknown = []
    let personalization: unknown = null
    try {
      options = f.options.trim() ? JSON.parse(f.options) : []
      personalization = f.personalization.trim() ? JSON.parse(f.personalization) : null
    } catch {
      return setError('As opções avançadas (JSON) têm um erro de digitação. Confira vírgulas e aspas.')
    }
    const leadDays = num(f.leadDays)
    const weight = num(f.weight)
    if (!f.name.trim() || leadDays === null || weight === null) return setError('Confira nome, prazo e peso.')
    setBusy(true)
    try {
      await api.admin.saveProduct({
        id: p.id,
        name: f.name.trim(),
        slug: f.slug.trim(),
        category: f.category as Product['category'],
        short: f.short.trim(),
        description: f.description.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean),
        highlights: f.highlights.split('\n').map((x) => x.trim()).filter(Boolean),
        tags: f.tags.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean),
        compareAt: num(f.compareAt) ?? undefined,
        leadDays: Math.round(leadDays),
        weight,
        dims: { widthCm: num(f.w) ?? 16, heightCm: num(f.h) ?? 6, lengthCm: num(f.l) ?? 22 },
        badge: (f.badge || undefined) as Product['badge'],
        options: options as Product['options'],
        personalization: (personalization ?? undefined) as Product['personalization'],
      })
      toast('Produto salvo')
      await onChanged()
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  const images = p.images ?? []
  const savePhotos = async (next: string[]) => {
    try {
      await api.admin.saveProduct({ id: p.id, images: next })
      await onChanged()
    } catch (e) {
      toast(messageOf(e), 'err')
    }
  }
  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      const urls = await api.admin.uploadProductImages(p.id, Array.from(files))
      await savePhotos([...images, ...urls])
      toast(urls.length === 1 ? 'Foto adicionada' : `${urls.length} fotos adicionadas`)
    } catch (e) {
      toast(messageOf(e), 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 border-t border-line p-4 md:p-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold">Fotos</h3>
        <p className="mb-3 text-xs text-mute">A primeira é a capa. Fotos quadradas, com fundo liso e boa luz, vendem mais.</p>
        <div className="flex flex-wrap gap-3">
          {images.map((src, i) => (
            <div key={src} className="relative">
              <img src={src} alt={`Foto ${i + 1} de ${p.name}`} className="h-24 w-24 rounded-xl object-cover ring-1 ring-line" />
              {i === 0 ? (
                <span className="absolute bottom-1 left-1 rounded bg-navy-900/85 px-1.5 text-[10px] font-bold text-white">CAPA</span>
              ) : (
                <button type="button" onClick={() => savePhotos([src, ...images.filter((x) => x !== src)])} className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 text-[10px] font-bold text-navy-900 shadow">
                  Usar de capa
                </button>
              )}
              <button type="button" onClick={() => savePhotos(images.filter((x) => x !== src))} className="absolute -top-2 -right-2 grid h-8 w-8 place-items-center rounded-full bg-white text-err shadow ring-1 ring-line" aria-label={`Remover foto ${i + 1}`}>
                <Trash size={14} />
              </button>
            </div>
          ))}
          <label className={`grid h-24 w-24 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line-2 text-center text-xs font-semibold text-navy-700 hover:border-navy-700 ${busy ? 'opacity-60' : ''}`}>
            <span>
              <Upload size={20} className="mx-auto" />
              Enviar
            </span>
            <input type="file" accept="image/*" multiple hidden disabled={busy} onChange={(e) => (void upload(e.target.files), (e.target.value = ''))} />
          </label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Field label="Nome" value={f.name} onChange={set('name')} maxLength={120} />
        <Field label="Endereço na loja (slug)" value={f.slug} onChange={set('slug')} hint="Só letras minúsculas, números e hífens. Mudar quebra links antigos." />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Categoria</span>
          <select className="field" value={f.category} onChange={set('category')}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Selo</span>
          <select className="field" value={f.badge} onChange={set('badge')}>
            {BADGES.map((b) => (
              <option key={b} value={b}>
                {b || 'Nenhum'}
              </option>
            ))}
          </select>
        </label>
        <Field label="Resumo (aparece abaixo do nome)" value={f.short} onChange={set('short')} maxLength={200} className="md:col-span-2" />
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-sm font-medium">Descrição (separe parágrafos com uma linha em branco)</span>
          <textarea className="field" rows={6} value={f.description} onChange={set('description')} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Destaques (um por linha)</span>
          <textarea className="field" rows={4} value={f.highlights} onChange={set('highlights')} />
        </label>
        <Field label="Palavras de busca (separe por vírgula)" value={f.tags} onChange={set('tags')} />
        <Field label="Preço “de” (riscado, opcional)" inputMode="decimal" value={f.compareAt} onChange={set('compareAt')} />
        <Field label="Prazo de produção (dias úteis)" inputMode="numeric" value={f.leadDays} onChange={set('leadDays')} />
        <Field label="Peso com embalagem (kg)" inputMode="decimal" value={f.weight} onChange={set('weight')} hint="Usado no frete dos Correios." />
        <div>
          <span className="mb-1.5 block text-sm font-medium">Caixa de envio (cm)</span>
          <div className="grid grid-cols-3 gap-2">
            <input className="field" inputMode="decimal" value={f.l} onChange={set('l')} aria-label="Comprimento" placeholder="Comprim." />
            <input className="field" inputMode="decimal" value={f.w} onChange={set('w')} aria-label="Largura" placeholder="Largura" />
            <input className="field" inputMode="decimal" value={f.h} onChange={set('h')} aria-label="Altura" placeholder="Altura" />
          </div>
        </div>
      </section>

      <details className="rounded-2xl bg-paper p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Opções avançadas (variações e personalização)</summary>
        <p className="mt-2 text-xs text-mute">
          Para quem sabe editar: variações como rito, tamanho e cor (com acréscimo de preço) e o campo de texto personalizado. Se tiver dúvida, deixe como está ou peça ajuda.
        </p>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-mute uppercase">Variações (JSON)</span>
          <textarea className="field font-mono text-xs" rows={8} value={f.options} onChange={set('options')} spellCheck={false} />
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-mute uppercase">Personalização (JSON, opcional)</span>
          <textarea className="field font-mono text-xs" rows={4} value={f.personalization} onChange={set('personalization')} spellCheck={false} />
        </label>
      </details>

      {error && (
        <p role="alert" className="rounded-xl bg-err-50 px-3 py-2 text-sm font-medium text-err">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
          Salvar produto
        </button>
        {p.active !== false && (
          <Link to={`/p/${p.slug}`} className="btn btn-ghost">
            Ver na loja
          </Link>
        )}
        <span className="text-xs text-mute">Preço atual {money(p.price)}</span>
      </div>
    </div>
  )
}

// ───────────────────────── Demonstração: fotos só neste navegador ─────────────────────────

function LocalPhotos() {
  const byId = photoStore.use((s) => s.byId)
  const products = useProducts()
  const [busy, setBusy] = useState('')
  const usedMb = storedPhotosBytes() / 1_000_000

  const upload = async (productId: string, files: FileList | null) => {
    if (!files?.length) return
    setBusy(productId)
    try {
      const urls: string[] = []
      for (const f of Array.from(files)) urls.push(await resizeImage(f, 1000))
      addPhotos(productId, urls)
      toast(urls.length === 1 ? 'Foto adicionada' : `${urls.length} fotos adicionadas`)
    } catch (e) {
      toast(messageOf(e), 'err')
    } finally {
      setBusy('')
    }
  }

  return (
    <div>
      <h1 className="display text-3xl font-semibold">Produtos e fotos</h1>
      <div className="mt-3 max-w-3xl space-y-1 text-sm text-mute">
        <p>Tire as fotos com o celular e envie aqui: elas aparecem na hora na loja. A primeira foto é a capa.</p>
        <p>
          Na demonstração, as fotos ficam guardadas só neste navegador (usado: {usedMb.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de ~4,5 MB). No site de verdade
          (com banco de dados) elas ficam salvas para todos os clientes.
        </p>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => {
          const mine = byId[p.id] ?? []
          return (
            <div key={p.id} className="flex flex-col gap-3 rounded-3xl border border-line bg-white p-4">
              <div className="flex items-center gap-3">
                <ProductImage p={p} className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <Link to={p.href ?? `/p/${p.slug}`} className="line-clamp-2 text-sm leading-snug font-semibold hover:underline">
                    {p.name}
                  </Link>
                  <p className="text-xs text-mute">
                    {money(p.price)} · estoque {p.stock ?? '—'} · {mine.length ? `${mine.length} foto(s) enviada(s)` : hasBundledPhotos(p.slug) ? 'fotos do projeto' : 'sem foto'}
                  </p>
                </div>
              </div>
              {mine.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mine.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-line" />
                      {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-navy-900/80 px-1 text-[9px] font-bold text-white">CAPA</span>}
                      <button type="button" onClick={() => removePhoto(p.id, i)} className="absolute -top-2 -right-2 grid h-7 w-7 place-items-center rounded-full bg-white text-err shadow ring-1 ring-line" aria-label={`Remover foto ${i + 1} de ${p.name}`}>
                        <Trash size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className={`btn btn-ghost btn-sm mt-auto cursor-pointer ${busy === p.id ? 'opacity-60' : ''}`}>
                <Upload size={16} /> {busy === p.id ? 'Enviando…' : mine.length ? 'Adicionar mais fotos' : 'Enviar fotos'}
                <input type="file" accept="image/*" multiple hidden onChange={(e) => (void upload(p.id, e.target.files), (e.target.value = ''))} />
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

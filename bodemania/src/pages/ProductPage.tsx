import { useEffect, useMemo, useRef, useState } from 'react'
import { UNIVERSES, categoryById, productBySlug, universeOf, useCatalogStatus, useProducts } from '../data/catalog'
import { RULES, STORE, whatsappLink } from '../config/store'
import { money } from '../lib/format'
import { resizeImage } from '../lib/image'
import { setPageMeta } from '../lib/seo'
import { Link, navigate } from '../router'
import { addToCart, favStore, openCart, pixPrice, toast, toggleFav } from '../state/shop'
import { Bag, Check, Clock, Heart, Pix, Refresh, Shield, Upload, Whatsapp, X } from '../components/Icons'
import ProductArt from '../components/ProductArt'
import { useProductPhotos } from '../state/photos'
import ProductCard, { defaultOptions, installmentsText } from '../components/ProductCard'
import ShippingEstimator from '../components/ShippingEstimator'
import { Badge, Breadcrumbs, Price, QtyStepper } from '../components/ui'
import NotFound from './NotFound'

export default function ProductPage({ slug }: { slug: string }) {
  useProducts() // volta a renderizar quando o catálogo carregar
  const status = useCatalogStatus()
  const p = productBySlug(slug)
  if (!p && status === 'loading') return <div className="wrap py-24 text-center text-mute" aria-busy="true">Carregando produto…</div>
  if (!p) return <NotFound />
  return <ProductView key={p.id} slug={slug} />
}

function ProductView({ slug }: { slug: string }) {
  const products = useProducts()
  const p = productBySlug(slug)!
  const universe = universeOf(p)
  const cat = categoryById(p.category)!
  const [opts, setOpts] = useState<Record<string, string>>(() => defaultOptions(p))
  const [qty, setQty] = useState(1)
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<string>('')
  const [view, setView] = useState(0)
  const [tab, setTab] = useState<'desc' | 'specs' | 'entrega'>('desc')
  const [error, setError] = useState('')
  const fav = favStore.use((s) => s.ids.includes(p.id))
  const fileRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)

  const artOpt = p.options?.find((o) => o.affectsArt)
  const color = (artOpt && artOpt.values.find((v) => v.id === opts[artOpt.id])?.hex) ?? p.tone
  const photos = useProductPhotos(p)
  type SlideT = { kind: 'photo'; src: string; alt: string } | { kind: 'art'; view: 0 | 1 | 2 }
  const slides: SlideT[] = [
    ...(photos.length
      ? photos.map((src, i) => ({ kind: 'photo' as const, src, alt: `${p.name} — foto ${i + 1}` }))
      : ([0, 1, 2] as const).map((v) => ({ kind: 'art' as const, view: v }))),
    ...(photo ? [{ kind: 'photo' as const, src: photo, alt: 'Sua foto' }] : []),
  ]
  const slide = (sl: SlideT, className: string) =>
    sl.kind === 'photo' ? (
      <img src={sl.src} alt={sl.alt} className={`object-cover ${className}`} />
    ) : (
      <ProductArt art={p.art} color={color} universe={universe} view={sl.view} className={className} label={p.name} />
    )

  const unit = useMemo(() => {
    let price = p.price
    for (const o of p.options ?? []) price += o.values.find((v) => v.id === opts[o.id])?.priceDelta ?? 0
    if (text.trim() && p.personalization) price += p.personalization.price
    return price
  }, [p, opts, text])

  const related = useMemo(
    () =>
      products
        .filter((x) => x.category === p.category && x.id !== p.id)
        .concat(products.filter((x) => universeOf(x) === universe && x.category !== p.category))
        .slice(0, 4),
    [products, p, universe],
  )

  const validate = () => {
    if (p.personalization?.required && !text.trim()) return `Preencha: ${p.personalization.label.toLowerCase()}.`
    if (p.photoUpload?.required && !photo) return 'Envie a foto para personalizarmos a sua peça.'
    return ''
  }

  const add = (buyNow: boolean) => {
    const err = validate()
    setError(err)
    if (err) {
      document.getElementById('personalizacao')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    addToCart({ productId: p.id, qty, options: opts, personalization: text.trim() || undefined, photo: photo || undefined })
    if (buyNow) navigate('/checkout')
    else {
      toast('Adicionado ao carrinho')
      openCart()
    }
  }

  const onPhoto = async (file?: File) => {
    if (!file) return
    try {
      setPhoto(await resizeImage(file))
      setError('')
    } catch (e) {
      toast((e as Error).message, 'err')
    }
  }

  // título, descrição, imagem e dados estruturados (Google Shopping/resultados com preço)
  const cover = photos[0]
  useEffect(() => {
    const abs = (u: string) => (u.startsWith('http') ? u : `${STORE.url.replace(/\/$/, '')}${u.startsWith('/') ? '' : '/'}${u}`)
    setPageMeta({
      title: p.name,
      description: p.short,
      image: cover && !cover.startsWith('data:') ? abs(cover) : undefined,
      path: `/p/${p.slug}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        description: p.short,
        ...(cover && !cover.startsWith('data:') ? { image: [abs(cover)] } : {}),
        sku: p.id,
        brand: { '@type': 'Brand', name: 'Bodemania' },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'BRL',
          price: p.price.toFixed(2),
          availability: p.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          url: `${STORE.url.replace(/\/$/, '')}/p/${p.slug}`,
        },
      },
    })
  }, [p, cover])

  const inst = installmentsText(unit)
  const stockLow = p.stock !== undefined && p.stock <= 8

  return (
    <div className="wrap pb-28 lg:pb-0">
      <Breadcrumbs
        items={[
          { label: 'Início', to: '/' },
          { label: UNIVERSES[universe].name, to: `/loja?u=${universe}` },
          { label: cat.name, to: `/c/${cat.id}` },
          { label: p.name },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        {/* Galeria */}
        <div className="lg:sticky lg:top-36 lg:self-start">
          <div
            ref={galleryRef}
            className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto sm:mx-0 sm:overflow-hidden sm:rounded-[28px]"
            onScroll={(e) => {
              const el = e.currentTarget
              setView(Math.round(el.scrollLeft / el.clientWidth))
            }}
          >
            {slides.map((sl, v) => (
              <div key={v} className={`relative aspect-square w-full shrink-0 snap-center bg-paper-2 ${v !== view ? 'sm:hidden' : ''}`}>
                {slide(sl, 'h-full w-full')}
                {p.badge && v === 0 && (
                  <span className="absolute top-4 left-4">
                    <Badge tone={p.badge === 'Mais vendido' ? 'gold' : p.badge === 'Novo' ? 'filament' : 'navy'}>{p.badge}</Badge>
                  </span>
                )}
              </div>
            ))}
          </div>
          {slides.length > 1 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {slides.map((sl, v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setView(v)
                    const el = galleryRef.current
                    if (el && el.scrollWidth > el.clientWidth) el.scrollTo({ left: v * el.clientWidth, behavior: 'smooth' })
                  }}
                  className={`h-2.5 w-2.5 overflow-hidden rounded-xl transition sm:h-20 sm:w-20 ${view === v ? 'ring-2 ring-navy-900' : 'opacity-70 ring-1 ring-line hover:opacity-100'}`}
                  aria-label={`Imagem ${v + 1}`}
                >
                  <span className="hidden sm:block">{slide(sl, 'h-20 w-20')}</span>
                  <span className={`block h-full w-full rounded-full sm:hidden ${view === v ? 'bg-navy-900' : 'bg-line-2'}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Informações */}
        <div>
          <Link to={`/c/${cat.id}`} className="eyebrow text-gold-600 hover:underline">
            {cat.name}
          </Link>
          <div className="mt-2 flex items-start justify-between gap-4">
            <h1 className="display text-[1.9rem] leading-[1.1] font-semibold md:text-[2.6rem]">{p.name}</h1>
            <button
              type="button"
              onClick={() => toggleFav(p.id)}
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line-2 bg-white transition hover:scale-105 ${fav ? 'text-filament' : ''}`}
              aria-label={fav ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
              aria-pressed={fav}
            >
              <Heart filled={fav} />
            </button>
          </div>
          <p className="mt-3 text-mute">{p.short}</p>

          <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-line">
            <Price value={unit} compareAt={p.compareAt && unit === p.price ? p.compareAt : undefined} size="lg" />
            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-ok">
              <Pix size={16} /> {money(pixPrice(unit))} no Pix ({RULES.pixDiscount * 100}% off)
            </p>
            {inst && <p className="mt-0.5 text-sm text-mute">ou {inst} no cartão</p>}
          </div>

          {/* Opções */}
          <div className="mt-6 space-y-5">
            {p.options?.map((o) => (
              <fieldset key={o.id}>
                <legend className="mb-2.5 text-sm font-semibold">
                  {o.label}: <span className="font-normal text-mute">{o.values.find((v) => v.id === opts[o.id])?.label}</span>
                </legend>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={o.label}>
                  {o.values.map((v) =>
                    o.type === 'color' ? (
                      <button
                        key={v.id}
                        type="button"
                        role="radio"
                        aria-checked={opts[o.id] === v.id}
                        aria-label={v.label}
                        title={v.label}
                        onClick={() => setOpts((s) => ({ ...s, [o.id]: v.id }))}
                        className={`grid h-11 w-11 place-items-center rounded-full ring-offset-2 ring-offset-paper transition ${opts[o.id] === v.id ? 'ring-2 ring-navy-900' : 'ring-1 ring-line-2 hover:ring-navy-600'}`}
                      >
                        <span className="h-8 w-8 rounded-full shadow-inner" style={{ background: v.hex }} />
                      </button>
                    ) : (
                      <button
                        key={v.id}
                        type="button"
                        role="radio"
                        aria-checked={opts[o.id] === v.id}
                        className="chip !min-h-11 !px-4"
                        onClick={() => setOpts((s) => ({ ...s, [o.id]: v.id }))}
                      >
                        {v.label}
                        {v.priceDelta ? <span className="text-xs opacity-70">+{money(v.priceDelta)}</span> : null}
                      </button>
                    ),
                  )}
                </div>
              </fieldset>
            ))}

            {(p.personalization || p.photoUpload) && (
              <div id="personalizacao" className="rounded-2xl border border-dashed border-gold-300 bg-gold-50 p-4">
                {p.personalization && (
                  <label className="block">
                    <span className="mb-1.5 flex items-center justify-between text-sm font-semibold">
                      <span>
                        {p.personalization.label}
                        {p.personalization.price > 0 && (
                          <span className="ml-1 font-normal text-mute">(+{money(p.personalization.price)})</span>
                        )}
                      </span>
                      <span className="text-xs font-normal text-mute tabular-nums">
                        {text.length}/{p.personalization.maxLength}
                      </span>
                    </span>
                    {p.personalization.maxLength > 60 ? (
                      <textarea
                        value={text}
                        maxLength={p.personalization.maxLength}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={p.personalization.placeholder}
                        rows={4}
                        className="field"
                        aria-invalid={!!error && !text.trim() && p.personalization.required}
                      />
                    ) : (
                      <input
                        value={text}
                        maxLength={p.personalization.maxLength}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={p.personalization.placeholder}
                        className="field"
                        aria-invalid={!!error && !text.trim() && p.personalization.required}
                      />
                    )}
                  </label>
                )}
                {p.photoUpload && (
                  <div>
                    <p className="mb-2 text-sm font-semibold">{p.photoUpload.label}</p>
                    {photo ? (
                      <div className="flex items-center gap-3">
                        <img src={photo} alt="Foto enviada" className="h-20 w-20 rounded-xl object-cover" />
                        <div className="text-sm">
                          <p className="flex items-center gap-1 font-medium text-ok">
                            <Check size={16} /> Foto recebida
                          </p>
                          <button type="button" className="mt-1 flex items-center gap-1 text-mute underline" onClick={() => setPhoto('')}>
                            <X size={14} /> Trocar foto
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault()
                          onPhoto(e.dataTransfer.files[0])
                        }}
                        className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-line-2 bg-white px-4 py-6 text-sm hover:border-navy-600"
                      >
                        <Upload />
                        <span className="font-semibold">Toque para escolher a foto</span>
                        <span className="text-xs text-mute">JPG ou PNG · rostos grandes e boa luz ficam melhores</span>
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
                  </div>
                )}
                <p className="mt-2 text-xs text-mute">Enviamos uma prévia pelo WhatsApp antes de produzir, quando necessário.</p>
              </div>
            )}

            {error && <p className="rounded-xl bg-err-50 px-3 py-2 text-sm font-medium text-err">{error}</p>}

            <div className="flex items-center gap-3 text-sm">
              {p.stock !== undefined && (
                <span className={`flex items-center gap-1.5 font-medium ${stockLow ? 'text-filament-600' : 'text-ok'}`}>
                  <span className={`h-2 w-2 rounded-full ${stockLow ? 'bg-filament' : 'bg-ok'}`} />
                  {stockLow ? `Últimas ${p.stock} unidades` : 'Em estoque'}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-mute">
                <Clock size={15} />
                {p.kind === 'digital'
                  ? `Entrega digital em até ${p.leadDays + 2} dias úteis`
                  : p.leadDays <= 1
                    ? 'Envio em 24h úteis'
                    : `Produção: ${p.leadDays} dias úteis`}
              </span>
            </div>

            <div className="hidden gap-3 lg:flex">
              <QtyStepper value={qty} onChange={setQty} />
              <button type="button" className="btn btn-ghost flex-1" onClick={() => add(false)}>
                <Bag size={18} /> Adicionar
              </button>
              <button type="button" className="btn btn-primary flex-1" onClick={() => add(true)}>
                Comprar agora
              </button>
            </div>
            <div className="flex items-center gap-3 lg:hidden">
              <span className="text-sm font-medium">Quantidade</span>
              <QtyStepper value={qty} onChange={setQty} />
            </div>
          </div>

          <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-3">
            {p.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-line">
                <Check size={16} className="mt-0.5 shrink-0 text-gold-600" />
                {h}
              </li>
            ))}
          </ul>

          {p.kind === 'physical' && (
            <div className="mt-6">
              <ShippingEstimator items={[{ key: 'pdp', productId: p.id, qty, options: opts }]} goods={unit * qty} weight={p.weight * qty} leadDays={p.leadDays} />
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-mute">
            <span className="flex flex-col items-center gap-1 rounded-xl p-2">
              <Shield size={20} className="text-navy-700" /> Compra segura
            </span>
            <span className="flex flex-col items-center gap-1 rounded-xl p-2">
              <Refresh size={20} className="text-navy-700" />{' '}
              {p.personalization || p.photoUpload ? 'Garantia de qualidade' : '7 dias para troca'}
            </span>
            <a
              href={whatsappLink(`Olá! Tenho uma dúvida sobre: ${p.name}`)}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-1 rounded-xl p-2 hover:bg-white"
            >
              <Whatsapp size={20} className="text-[#1faa59]" /> Tirar dúvida
            </a>
          </div>

          {/* Abas */}
          <div className="mt-8">
            <div className="flex gap-1 border-b border-line" role="tablist">
              {(
                [
                  ['desc', 'Descrição'],
                  ['specs', 'Detalhes'],
                  ['entrega', 'Entrega e trocas'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`-mb-px border-b-2 px-3 py-3 text-sm font-semibold transition ${tab === id ? 'border-navy-900 text-ink' : 'border-transparent text-mute hover:text-ink'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="py-5 text-[0.95rem] leading-relaxed text-ink/85" role="tabpanel">
              {tab === 'desc' &&
                p.description.map((d) => (
                  <p key={d} className="mb-3">
                    {d}
                  </p>
                ))}
              {tab === 'specs' && (
                <dl className="divide-y divide-line rounded-2xl border border-line bg-white">
                  {p.specs.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
                      <dt className="text-mute">{k}</dt>
                      <dd className="text-right font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {tab === 'entrega' && (
                <div className="space-y-3 text-sm">
                  <p>
                    <b>Envio:</b> Correios (PAC ou SEDEX) com código de rastreio, ou retirada no ateliê em Dourados/MS. Frete grátis no PAC
                    acima de {money(RULES.freeShippingFrom)}.
                  </p>
                  <p>
                    <b>Produção:</b> peças feitas sob encomenda entram em produção após a confirmação do pagamento. O prazo total aparece no
                    cálculo de frete.
                  </p>
                  <p>
                    <b>Trocas:</b> você tem 7 dias após o recebimento para desistir da compra (Código de Defesa do Consumidor). Itens
                    personalizados só são trocados em caso de defeito.{' '}
                    <Link to="/politicas/trocas" className="font-medium text-navy-700 underline">
                      Política completa
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="display mb-6 text-2xl font-semibold md:text-3xl">Você também pode gostar</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-4">
            {related.map((r) => (
              <ProductCard key={r.id} p={r} />
            ))}
          </div>
        </section>
      )}

      {/* Barra fixa de compra no celular */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur lg:hidden">
        <div className="wrap flex items-center gap-3 py-3">
          <div className="min-w-0">
            <p className="text-lg leading-none font-bold tabular-nums">{money(unit * qty)}</p>
            <p className="mt-1 text-xs text-ok">{money(pixPrice(unit * qty))} no Pix</p>
          </div>
          <button type="button" className="btn btn-ghost !px-4" onClick={() => add(false)} aria-label="Adicionar ao carrinho">
            <Bag size={20} />
          </button>
          <button type="button" className="btn btn-primary flex-1" onClick={() => add(true)}>
            Comprar
          </button>
        </div>
      </div>
    </div>
  )
}

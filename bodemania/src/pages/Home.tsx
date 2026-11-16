import { m } from 'framer-motion'
import { CATEGORIES, UNIVERSES, useCatalogStatus, useProducts, type Category, type CategoryId, type Product, type Universe } from '../data/catalog'
import { RULES, whatsappLink } from '../config/store'
import { money } from '../lib/format'
import { Link } from '../router'
import { ArrowRight, Box, Card, Cube, Gift, Pix, Refresh, Shield, Sparkle, Truck, Upload, Whatsapp } from '../components/Icons'
import ProductArt, { Goat } from '../components/ProductArt'
import ProductCard from '../components/ProductCard'
import { SectionTitle } from '../components/ui'
import { CatalogPlaceholder } from '../components/CatalogStatus'
import ProductImage from '../components/ProductImage'
import { hasBundledPhotos } from '../state/photos'

const EASE = [0.22, 1, 0.36, 1] as const

/** Produto com foto real (do banco ou da pasta do projeto). */
const hasPhoto = (p: Product) => !p.href && !!(p.images?.length || hasBundledPhotos(p.slug))

/**
 * Escolhe até `n` produtos: primeiro os da lista preferida (se tiverem foto), depois os demais com foto.
 * Com `fill`, completa com produtos sem foto (modo demonstração) para a vitrine nunca ficar vazia.
 */
function pick(products: Product[], preferred: string[], n: number, fill = false) {
  const withPhoto = products.filter(hasPhoto)
  const out: Product[] = []
  for (const slug of preferred) {
    const p = withPhoto.find((x) => x.slug === slug)
    if (p && !out.includes(p)) out.push(p)
  }
  for (const p of withPhoto) if (out.length < n && !out.includes(p)) out.push(p)
  if (fill) for (const p of products) if (out.length < n && !p.href && !out.includes(p)) out.push(p)
  return out.slice(0, n)
}

/* ───────────────────────── Hero ───────────────────────── */

const HERO_PICKS = [
  'conjunto-comab-segundo-vigilante',
  'boton-esquadro-e-compasso-redondo-azul-bt005a',
  'malhete-trabalhado',
  'bt-1-e-2-diacono-gob-2-diacono-gl-dourado',
  'bt-rosa-vermelha-com-esquadro-e-compasso',
]

const TILE_LAYOUT = [
  'col-span-4 row-span-4',
  'col-span-2 row-span-2',
  'col-span-2 row-span-2',
  'col-span-3 row-span-2',
  'col-span-3 row-span-2',
]

function HeroGallery({ picks }: { picks: Product[] }) {
  if (!picks.length) return null
  return (
    <div className="grid aspect-square w-full grid-cols-6 grid-rows-6 gap-3 md:gap-4">
      {picks.map((p, i) => (
        <m.div
          key={p.id}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15 + i * 0.08, ease: EASE }}
          className={TILE_LAYOUT[i]}
        >
          <Link
            to={`/p/${p.slug}`}
            className="group relative block h-full w-full overflow-hidden rounded-[22px] bg-white shadow-[0_30px_60px_-34px_rgba(13,26,43,.4)] ring-1 ring-line transition duration-300 hover:-translate-y-1 md:rounded-[28px]"
          >
            <ProductImage
              p={p}
              fit={i >= 3 ? 'contain' : 'cover'}
              className={`h-full w-full transition duration-700 ease-out group-hover:scale-[1.06] ${i >= 3 ? 'p-2' : ''}`}
            />
            {i === 0 && (
              <span className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-2xl bg-navy-950/75 px-4 py-3 text-white backdrop-blur-md md:inset-x-4 md:bottom-4">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{p.name}</span>
                  <span className="block text-xs text-gold-300 tabular-nums">{money(p.price)}</span>
                </span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold text-navy-950 transition group-hover:translate-x-0.5">
                  <ArrowRight size={16} />
                </span>
              </span>
            )}
          </Link>
        </m.div>
      ))}
    </div>
  )
}

function Hero({ products }: { products: Product[] }) {
  const picks = pick(products, HERO_PICKS, 5, true)
  const total = products.filter((p) => !p.href).length
  const stats: [string, string][] = [
    [`${RULES.pixDiscount * 100}%`, 'de desconto no Pix'],
    [`${RULES.maxInstallments}x`, 'sem juros no cartão'],
    [`R$ ${RULES.freeShippingFrom}`, 'frete grátis a partir de'],
  ]
  return (
    <section className="relative isolate overflow-hidden border-b border-line bg-gradient-to-b from-white via-white to-paper text-ink">
      <div className="dots-dark absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      <div className="absolute -top-48 -left-40 -z-10 h-[560px] w-[560px] rounded-full bg-gold-100/70 blur-[130px]" />
      <div className="absolute -right-40 -bottom-56 -z-10 h-[520px] w-[520px] rounded-full bg-navy-100/80 blur-[130px]" />
      <div className="wrap grid items-center gap-12 pt-12 pb-24 md:pt-16 md:pb-28 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-20 lg:pb-32">
        <m.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-navy-700 shadow-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
            {total > 0 ? `${total} peças na coleção` : 'A loja do Maçom'}
          </span>
          <h1 className="display mt-6 text-[2.7rem] leading-[1] font-semibold text-navy-950 sm:text-6xl lg:text-[4.6rem]">
            Símbolos que se usam <span className="text-gold-deep italic">com orgulho.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base text-mute md:text-lg">
            Botons, joias de cargo, paramentos e presentes maçônicos — com acabamento de respeito e envio para todo o Brasil.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/loja?u=maconaria" className="btn btn-primary">
              Ver a coleção <ArrowRight size={18} />
            </Link>
            <a href={whatsappLink('Olá, Bodemania! Quero tirar uma dúvida.')} target="_blank" rel="noreferrer" className="btn btn-ghost">
              <Whatsapp size={18} className="text-ok" /> Falar no WhatsApp
            </a>
          </div>
          <div className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-6">
            {stats.map(([k, v]) => (
              <div key={v}>
                <p className="display text-2xl font-semibold text-gold-600 md:text-3xl">{k}</p>
                <p className="mt-1 text-xs leading-snug text-mute">{v}</p>
              </div>
            ))}
          </div>
        </m.div>
        <HeroGallery picks={picks} />
      </div>
    </section>
  )
}

/* ───────────────────────── Vantagens ───────────────────────── */

function TrustStrip() {
  const items = [
    { icon: Truck, title: 'Frete grátis', text: `acima de R$ ${RULES.freeShippingFrom}` },
    { icon: Pix, title: `${RULES.pixDiscount * 100}% off no Pix`, text: 'aprovação na hora' },
    { icon: Card, title: `${RULES.maxInstallments}x sem juros`, text: 'em todos os cartões' },
    { icon: Refresh, title: 'Troca fácil', text: '7 dias para se arrepender' },
    { icon: Shield, title: 'Compra segura', text: 'dados protegidos (LGPD)' },
  ]
  return (
    <section className="wrap relative z-10 -mt-12 md:-mt-14">
      <div className="no-scrollbar flex snap-x overflow-x-auto rounded-3xl border border-line bg-white/95 shadow-[0_24px_60px_-32px_rgba(13,26,43,.45)] backdrop-blur md:grid md:grid-cols-5 md:overflow-visible">
        {items.map(({ icon: Icon, title, text }, i) => (
          <div key={title} className={`flex min-w-[210px] snap-start items-center gap-3 px-5 py-4 md:min-w-0 md:py-5 ${i > 0 ? 'border-l border-line' : ''}`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold-50 text-gold-700">
              <Icon size={20} />
            </span>
            <span>
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-xs text-mute">{text}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ───────────────────────── Categorias ───────────────────────── */

/** Produto preferido como capa de cada categoria (precisa ter foto). Sem foto ou sem produto, vale o primeiro com foto; sem nenhum, a ilustração. */
const CATEGORY_COVERS: Partial<Record<CategoryId, string>> = {
  paramentos: 'conjunto-comab-segundo-vigilante',
  'joias-acessorios': 'boton-esquadro-e-compasso-redondo-azul-bt005a',
  'presentes-maconicos': 'malhete-trabalhado',
}

function CategoryCover({ c, products, className }: { c: Category; products: Product[]; className: string }) {
  const withPhoto = products.filter((p) => p.category === c.id && hasPhoto(p))
  const cover = withPhoto.find((p) => p.slug === CATEGORY_COVERS[c.id]) ?? withPhoto[0]
  if (cover) return <ProductImage p={cover} className={className} label={c.name} />
  return <ProductArt art={c.art} color={c.tone} universe={c.universe} className={className} label={c.name} />
}

function countLabel(n: number) {
  return n === 1 ? '1 produto' : `${n} produtos`
}

function CategoryGroup({ universe, products, large }: { universe: Universe; products: Product[]; large?: boolean }) {
  const cats = CATEGORIES.filter((c) => c.universe === universe)
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <p className={`eyebrow ${universe === '3d' ? 'text-filament' : 'text-gold-600'}`}>{UNIVERSES[universe].name}</p>
        <Link to={`/loja?u=${universe}`} className="text-xs font-semibold text-navy-700 hover:underline">
          Ver tudo
        </Link>
      </div>
      <div className={`grid gap-3 md:gap-4 ${large ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'}`}>
        {cats.map((c, i) => {
          const n = products.filter((p) => p.category === c.id && !p.href).length
          return (
            <m.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: EASE }}
            >
              <Link
                to={`/c/${c.id}`}
                className="group relative block overflow-hidden rounded-3xl bg-white ring-1 ring-line transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(13,26,43,.45)] hover:ring-gold/60"
              >
                <div className={large ? 'aspect-[4/5]' : 'aspect-square'}>
                  <CategoryCover c={c} products={products} className="h-full w-full transition duration-700 ease-out group-hover:scale-[1.05]" />
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-navy-950/85 via-navy-950/35 to-transparent p-4 pt-14 text-white">
                  <span>
                    <span className={`block leading-tight font-semibold ${large ? 'text-base md:text-lg' : 'text-sm'}`}>{c.name}</span>
                    {n > 0 && <span className="mt-0.5 block text-xs text-white/70">{countLabel(n)}</span>}
                  </span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur transition group-hover:bg-gold group-hover:text-navy-950">
                    <ArrowRight size={15} />
                  </span>
                </div>
              </Link>
            </m.div>
          )
        })}
      </div>
    </div>
  )
}

function Categories({ products }: { products: Product[] }) {
  return (
    <section className="wrap mt-16 md:mt-24">
      <SectionTitle
        eyebrow="Navegue por categoria"
        title="Do Templo à estante"
        action={
          <Link to="/loja" className="hidden items-center gap-1 text-sm font-semibold text-navy-700 hover:underline sm:flex">
            Ver tudo <ArrowRight size={16} />
          </Link>
        }
      />
      <div className="space-y-10">
        <CategoryGroup universe="maconaria" products={products} large />
        <CategoryGroup universe="3d" products={products} />
      </div>
    </section>
  )
}

/* ───────────────────────── Vitrines ───────────────────────── */

function Grid({ items }: { items: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
      {items.map((p) => (
        <ProductCard key={p.id} p={p} />
      ))}
    </div>
  )
}

const SHOWCASE_PICKS = ['conjunto-comab-segundo-vigilante', 'punho-de-veneravel-mestre-comab', 'cinto-em-couro-sintetico']

/** Faixa editorial: paramentos de cargo com fotos reais (só aparece se houver fotos). */
function Showcase({ products }: { products: Product[] }) {
  const items = pick(
    products.filter((p) => p.category === 'paramentos'),
    SHOWCASE_PICKS,
    3,
  )
  if (items.length < 2) return null
  return (
    <section className="wrap mt-16 md:mt-24">
      <div className="relative isolate grid items-center gap-10 overflow-hidden rounded-[32px] bg-gold-50 p-6 ring-1 ring-gold-100 md:p-12 lg:grid-cols-[1fr_1.15fr]">
        <div className="absolute -top-32 -right-20 -z-10 h-96 w-96 rounded-full bg-white blur-[90px]" />
        <div>
          <p className="eyebrow text-gold-700">Coleção de paramentos</p>
          <h2 className="display mt-3 text-4xl leading-[1.05] font-semibold text-navy-950 md:text-5xl">
            Para a sessão, <span className="text-gold-deep italic">o cargo e a posse.</span>
          </h2>
          <p className="mt-4 max-w-md text-mute">
            Conjuntos, punhos e acessórios confeccionados com cetim, galão e bordado dourado. Peças sob encomenda conforme o rito e a Potência.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/c/paramentos" className="btn btn-primary">
              Ver paramentos <ArrowRight size={18} />
            </Link>
            <a href={whatsappLink('Olá, Bodemania! Quero encomendar paramentos.')} target="_blank" rel="noreferrer" className="btn btn-ghost">
              <Whatsapp size={18} className="text-ok" /> Encomendar
            </a>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {items.map((p, i) => (
            <Link
              key={p.id}
              to={`/p/${p.slug}`}
              className={`group relative block overflow-hidden rounded-3xl bg-white shadow-[0_24px_50px_-32px_rgba(13,26,43,.4)] ring-1 ring-line transition duration-300 hover:-translate-y-1 ${i === 0 ? 'row-span-2' : 'aspect-square'}`}
            >
              <ProductImage
                p={p}
                fit={i === 0 ? 'contain' : 'cover'}
                className={`h-full w-full transition duration-700 ease-out group-hover:scale-[1.05] ${i === 0 ? 'p-4' : ''}`}
              />
              <span className="absolute inset-x-2 bottom-2 rounded-xl bg-white/90 px-3 py-2 text-navy-950 ring-1 ring-line backdrop-blur md:inset-x-3 md:bottom-3">
                <span className="block truncate text-xs font-semibold md:text-sm">{p.name}</span>
                <span className="block text-xs font-bold text-gold-700 tabular-nums">{money(p.price)}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function QuoteBanner() {
  const steps = [
    { icon: Upload, title: 'Envie o arquivo', text: 'STL de até 50 MB — ou descreva a peça' },
    { icon: Sparkle, title: 'Veja o preço na hora', text: 'material, cor, qualidade e quantidade' },
    { icon: Box, title: 'Receba em casa', text: 'produção em 2–5 dias úteis' },
  ]
  return (
    <section className="wrap mt-16 md:mt-24">
      <div className="relative isolate overflow-hidden rounded-[32px] bg-[#121317] px-6 py-10 text-white md:px-12 md:py-14">
        <div className="layers absolute inset-0 -z-10" />
        <div className="absolute top-1/2 -right-20 -z-10 h-96 w-96 -translate-y-1/2 rounded-full bg-filament/30 blur-3xl" />
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="eyebrow text-filament">Universo 3D · Orçamento instantâneo</p>
            <h2 className="display mt-3 text-4xl leading-[1.05] font-semibold md:text-5xl">
              Tem um arquivo 3D? <br className="hidden sm:block" />O preço sai em segundos.
            </h2>
            <p className="mt-4 max-w-lg text-white/70">
              Nosso orçamento lê o seu STL direto no navegador, calcula volume e medidas e mostra o valor em 5 materiais. Sem esperar resposta de e-mail.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link to="/orcamento-3d" className="btn btn-filament">
                <Cube size={18} /> Fazer orçamento agora
              </Link>
              <Link to="/p/modelagem-3d-sob-medida" className="btn border border-white/20 text-white hover:bg-white/10">
                Não tenho arquivo
              </Link>
            </div>
          </div>
          <ol className="grid gap-3">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.04] p-4 backdrop-blur">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-filament/15 text-filament">
                  <Icon size={22} />
                </span>
                <span>
                  <span className="block font-semibold">
                    <span className="mr-2 text-white/40 tabular-nums">0{i + 1}</span>
                    {title}
                  </span>
                  <span className="text-sm text-white/60">{text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function LithoBanner() {
  return (
    <section className="wrap mt-16 md:mt-24">
      <div className="grid overflow-hidden rounded-[32px] border border-line bg-white md:grid-cols-2">
        <div className="relative aspect-[4/3] md:aspect-auto">
          <ProductArt art="lithophane" color="#f3eadb" universe="3d" className="absolute inset-0 h-full w-full" label="Luminária com foto" />
        </div>
        <div className="p-7 md:p-12">
          <p className="eyebrow text-gold-600">Presente que emociona</p>
          <h2 className="display mt-3 text-3xl leading-tight font-semibold md:text-[2.6rem]">A foto aparece quando a luz acende.</h2>
          <p className="mt-4 text-mute">
            Envie uma foto da família, do casamento ou da sua iniciação. Transformamos em uma luminária lithophane — apagada é uma escultura branca; acesa, a lembrança surge em detalhes.
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            {['Prévia aprovada por WhatsApp antes de imprimir', 'Base de LED inclusa', 'Embalagem para presente'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-ok-50 text-ok">✓</span>
                {t}
              </li>
            ))}
          </ul>
          <Link to="/p/luminaria-lithophane-foto" className="btn btn-primary mt-7">
            <Gift size={18} /> Criar a minha
          </Link>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    ['Escolha', 'Produto pronto, personalizado ou orçamento do seu arquivo.'],
    ['Pague', `Pix com ${RULES.pixDiscount * 100}% off, cartão em até ${RULES.maxInstallments}x ou boleto.`],
    ['Produzimos', 'Bordado, gravado ou impresso — conferido peça a peça.'],
    ['Entregamos', 'Correios com rastreio para todo o Brasil.'],
  ]
  return (
    <section className="wrap mt-16 md:mt-24">
      <SectionTitle eyebrow="Do clique à sua porta" title="Como funciona" />
      <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([t, d], i) => (
          <div key={t} className="group rounded-3xl border border-line bg-white p-6 transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-30px_rgba(13,26,43,.4)]">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-navy-900 font-semibold text-gold-300 tabular-nums">0{i + 1}</span>
            <h3 className="mt-5 text-lg font-semibold">{t}</h3>
            <p className="mt-1 text-sm text-mute">{d}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ForLodges() {
  return (
    <section className="wrap mt-16 mb-4 md:mt-24">
      <div className="relative isolate grid items-center gap-8 overflow-hidden rounded-[32px] bg-gold-50 p-7 ring-1 ring-gold-100 md:grid-cols-[auto_1fr_auto] md:p-12">
        <svg viewBox="0 0 100 100" className="h-24 w-24 md:h-32 md:w-32" aria-hidden>
          <Goat fill="#0d1a2b" eye="#f4e7c4" />
        </svg>
        <div>
          <p className="eyebrow text-gold-700">Para Lojas, Potências e eventos</p>
          <h2 className="display mt-2 text-3xl leading-tight font-semibold md:text-4xl">Compras em quantidade e brindes personalizados.</h2>
          <p className="mt-3 max-w-xl text-mute">
            Botons e joias de cargo para toda a diretoria, lembranças para sessões brancas e presentes de posse. Condições especiais para a Loja.
          </p>
        </div>
        <a href={whatsappLink('Olá, Bodemania! Quero um orçamento para a minha Loja.')} target="_blank" rel="noreferrer" className="btn btn-primary">
          <Whatsapp size={18} /> Pedir orçamento
        </a>
      </div>
    </section>
  )
}

export default function Home() {
  const products = useProducts()
  const status = useCatalogStatus()
  const shelf = products.filter((p) => !p.href)
  const featured = [...shelf.filter((p) => p.badge === 'Mais vendido'), ...shelf.filter((p) => p.badge !== 'Mais vendido')].slice(0, 8)
  const gifts = shelf.filter((p) => p.category === 'presentes-maconicos').slice(0, 4)
  return (
    <>
      <Hero products={products} />
      <TrustStrip />
      <Categories products={products} />
      <section className="wrap mt-16 md:mt-24">
        <SectionTitle
          eyebrow="Escolhidos a dedo"
          title="Destaques da coleção"
          action={
            <Link to="/loja" className="hidden items-center gap-1 text-sm font-semibold text-navy-700 hover:underline sm:flex">
              Ver todos <ArrowRight size={16} />
            </Link>
          }
        />
        {products.length ? <Grid items={featured} /> : <CatalogPlaceholder status={status} />}
      </section>
      <Showcase products={products} />
      <section className="wrap mt-16 md:mt-24">
        <SectionTitle
          eyebrow="Para presentear um Irmão"
          title="Presentes com significado"
          action={
            <Link to="/c/presentes-maconicos" className="hidden items-center gap-1 text-sm font-semibold text-navy-700 hover:underline sm:flex">
              Ver presentes <ArrowRight size={16} />
            </Link>
          }
        />
        {gifts.length ? <Grid items={gifts} /> : null}
      </section>
      <QuoteBanner />
      <LithoBanner />
      <HowItWorks />
      <ForLodges />
    </>
  )
}

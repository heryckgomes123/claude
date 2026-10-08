import { m } from 'framer-motion'
import { CATEGORIES, UNIVERSES, universeOf, useCatalogStatus, useProducts, type Product } from '../data/catalog'
import { RULES, whatsappLink } from '../config/store'
import { Link } from '../router'
import { ArrowRight, Box, Card, Cube, Gift, Pix, Refresh, Shield, Sparkle, Truck, Upload, Whatsapp } from '../components/Icons'
import ProductArt, { Goat, SquareCompass } from '../components/ProductArt'
import ProductCard from '../components/ProductCard'
import { SectionTitle } from '../components/ui'
import { CatalogPlaceholder } from '../components/CatalogStatus'
import ProductImage from '../components/ProductImage'


function Hero({ products }: { products: Product[] }) {
  const masonic = products.filter((p) => universeOf(p) === 'maconaria').slice(0, 3)
  const print3d = products.filter((p) => universeOf(p) === '3d' && !p.href).slice(0, 3)
  return (
    <section className="wrap pt-4 md:pt-8">
      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        {/* Maçonaria */}
        <m.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative isolate flex flex-col overflow-hidden rounded-[28px] bg-navy-900 p-6 text-white sm:p-8 md:min-h-[540px] md:p-10"
        >
          <div className="dots absolute inset-0 -z-10" />
          <div className="absolute -right-16 -bottom-20 -z-10 h-80 w-80 opacity-[.14] md:h-[420px] md:w-[420px]">
            <svg viewBox="0 0 100 100">
              <SquareCompass color="#e3c475" w={5} />
            </svg>
          </div>
          <p className="eyebrow text-gold-300">{UNIVERSES.maconaria.short}</p>
          <h1 className="display mt-3 max-w-md text-[2.4rem] leading-[1.02] font-semibold sm:text-5xl lg:text-[3.6rem]">
            Tradição <span className="text-gold-grad italic">com acabamento</span> de respeito.
          </h1>
          <p className="mt-4 max-w-sm text-[0.95rem] text-white/70">Aventais bordados à mão, paramentos, joias e presentes para Irmãos, Lojas e famílias.</p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link to="/loja?u=maconaria" className="btn btn-gold">
              Comprar artigos maçônicos <ArrowRight size={18} />
            </Link>
          </div>
          <div className="mt-auto flex gap-3 pt-8 md:justify-end">
            {masonic.map((p, i) => (
              <Link key={p.id} to={`/p/${p.slug}`} className={`block overflow-hidden rounded-2xl ring-1 ring-white/15 transition hover:-translate-y-1 ${i === 0 ? 'h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28' : 'h-20 w-20 sm:h-24 sm:w-24'} self-end`}>
                <ProductImage p={p} view={1} className="h-full w-full" />
              </Link>
            ))}
          </div>
        </m.div>

        {/* 3D */}
        <m.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="relative isolate flex flex-col overflow-hidden rounded-[28px] bg-[#121317] p-6 text-white sm:p-8 md:min-h-[540px] md:p-10"
        >
          <div className="layers absolute inset-0 -z-10" />
          <div className="absolute -top-24 -right-24 -z-10 h-72 w-72 rounded-full bg-filament/35 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 -z-10 h-64 w-64 rounded-full bg-mint/25 blur-3xl" />
          <p className="eyebrow text-filament">{UNIVERSES['3d'].short}</p>
          <h2 className="display mt-3 max-w-md text-[2.4rem] leading-[1.02] font-semibold sm:text-5xl lg:text-[3.6rem]">
            Se dá pra imaginar, <span className="italic text-filament">dá pra imprimir.</span>
          </h2>
          <p className="mt-4 max-w-sm text-[0.95rem] text-white/70">Decoração, colecionáveis, presentes com foto e peças sob medida — com orçamento na hora.</p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link to="/loja?u=3d" className="btn btn-filament">
              Ver produtos 3D <ArrowRight size={18} />
            </Link>
            <Link to="/orcamento-3d" className="btn border border-white/20 text-white hover:bg-white/10">
              <Upload size={18} /> Orçar meu arquivo
            </Link>
          </div>
          <div className="mt-auto flex gap-3 pt-8 md:justify-end">
            {print3d.map((p, i) => (
              <Link key={p.id} to={`/p/${p.slug}`} className={`block overflow-hidden rounded-2xl ring-1 ring-white/15 transition hover:-translate-y-1 ${i === 0 ? 'h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28' : 'h-20 w-20 sm:h-24 sm:w-24'} self-end`}>
                <ProductImage p={p} view={1} className="h-full w-full" />
              </Link>
            ))}
          </div>
        </m.div>
      </div>
    </section>
  )
}

function TrustStrip() {
  const items = [
    { icon: Truck, title: 'Frete grátis', text: `acima de R$ ${RULES.freeShippingFrom}` },
    { icon: Pix, title: `${RULES.pixDiscount * 100}% off no Pix`, text: 'aprovação na hora' },
    { icon: Card, title: `${RULES.maxInstallments}x sem juros`, text: 'em todos os cartões' },
    { icon: Refresh, title: 'Troca fácil', text: '7 dias para se arrepender' },
    { icon: Shield, title: 'Compra segura', text: 'dados protegidos (LGPD)' },
  ]
  return (
    <section className="wrap mt-4">
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-5 md:px-0">
        {items.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex min-w-[200px] snap-start items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-50 text-gold-700">
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

function Categories() {
  return (
    <section className="wrap mt-14 md:mt-20">
      <SectionTitle
        eyebrow="Navegue por categoria"
        title="Do Templo à estante"
        action={
          <Link to="/loja" className="hidden items-center gap-1 text-sm font-semibold text-navy-700 hover:underline sm:flex">
            Ver tudo <ArrowRight size={16} />
          </Link>
        }
      />
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:px-0 lg:grid-cols-9">
        {CATEGORIES.map((c) => (
          <Link key={c.id} to={`/c/${c.id}`} className="group w-[124px] shrink-0 snap-start text-center md:w-auto">
            <span className="block overflow-hidden rounded-full ring-1 ring-line transition group-hover:ring-2 group-hover:ring-gold">
              <ProductArt art={c.art} color={c.tone} universe={c.universe} className="aspect-square w-full transition duration-500 group-hover:scale-105" label={c.name} />
            </span>
            <span className="mt-2.5 block text-[0.85rem] leading-tight font-semibold">{c.name}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function Grid({ items }: { items: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
      {items.map((p) => (
        <ProductCard key={p.id} p={p} />
      ))}
    </div>
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
      <div className="relative isolate overflow-hidden rounded-[28px] bg-[#121317] px-6 py-10 text-white md:px-12 md:py-14">
        <div className="layers absolute inset-0 -z-10" />
        <div className="absolute top-1/2 -right-20 -z-10 h-96 w-96 -translate-y-1/2 rounded-full bg-filament/30 blur-3xl" />
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="eyebrow text-filament">Orçamento instantâneo</p>
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
      <div className="grid overflow-hidden rounded-[28px] border border-line bg-white md:grid-cols-2">
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
    ['Pague', 'Pix com 5% off, cartão em até 6x ou boleto.'],
    ['Produzimos', 'Bordado, gravado ou impresso — conferido peça a peça.'],
    ['Entregamos', 'Correios com rastreio, retirada em SP ou entrega digital.'],
  ]
  return (
    <section className="wrap mt-16 md:mt-24">
      <SectionTitle eyebrow="Do clique à sua porta" title="Como funciona" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([t, d], i) => (
          <div key={t} className="rounded-3xl border border-line bg-white p-6">
            <span className="display text-5xl font-semibold text-gold">{i + 1}</span>
            <h3 className="mt-3 text-lg font-semibold">{t}</h3>
            <p className="mt-1 text-sm text-mute">{d}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ForLodges() {
  return (
    <section className="wrap mt-16 md:mt-24">
      <div className="relative isolate grid items-center gap-8 overflow-hidden rounded-[28px] bg-gold-50 p-7 ring-1 ring-gold-100 md:grid-cols-[auto_1fr_auto] md:p-12">
        <svg viewBox="0 0 100 100" className="h-24 w-24 md:h-32 md:w-32" aria-hidden>
          <Goat fill="#0d1a2b" eye="#f4e7c4" />
        </svg>
        <div>
          <p className="eyebrow text-gold-700">Para Lojas, Potências e eventos</p>
          <h2 className="display mt-2 text-3xl leading-tight font-semibold md:text-4xl">Compras em quantidade e brindes personalizados.</h2>
          <p className="mt-3 max-w-xl text-mute">
            Aventais para iniciações, chaveiros e lembranças para sessões brancas, troféus e placas de homenagem. Condições especiais e nota fiscal para a Loja.
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
  const best = [...shelf.filter((p) => p.badge === 'Mais vendido'), ...shelf.filter((p) => p.badge !== 'Mais vendido')].slice(0, 8)
  const gifts = shelf.filter((p) => p.category === 'presentes-maconicos').slice(0, 4)
  return (
    <>
      <Hero products={products} />
      <TrustStrip />
      <Categories />
      <section className="wrap mt-14 md:mt-20">
        <SectionTitle
          eyebrow="Os queridinhos"
          title="Mais vendidos"
          action={
            <Link to="/loja?sort=populares" className="hidden items-center gap-1 text-sm font-semibold text-navy-700 hover:underline sm:flex">
              Ver todos <ArrowRight size={16} />
            </Link>
          }
        />
        {products.length ? <Grid items={best} /> : <CatalogPlaceholder status={status} />}
      </section>
      <QuoteBanner />
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
      <LithoBanner />
      <HowItWorks />
      <ForLodges />
    </>
  )
}

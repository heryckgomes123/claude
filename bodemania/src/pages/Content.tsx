import { useState, type ReactNode } from 'react'
import { useProducts } from '../data/catalog'
import { RULES, STORE, whatsappLink } from '../config/store'
import { isEmail } from '../lib/validate'
import { Link, navigate } from '../router'
import { api } from '../api'
import { dbStore, favStore, useSessionReady, useUser } from '../state/shop'
import { AuthForms } from './Auth'
import { ChevronDown, Heart, Truck, Whatsapp } from '../components/Icons'
import { Goat, SquareCompass } from '../components/ProductArt'
import ProductCard from '../components/ProductCard'
import { Breadcrumbs, Empty, Field } from '../components/ui'

export function Favorites() {
  const ids = favStore.use((s) => s.ids)
  const products = useProducts()
  const items = products.filter((p) => ids.includes(p.id))
  return (
    <div className="wrap">
      <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Favoritos' }]} />
      <h1 className="display mb-6 text-3xl font-semibold md:text-4xl">Favoritos</h1>
      {items.length ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <Empty
          icon={<Heart size={28} />}
          title="Nenhum favorito ainda"
          text="Toque no coração dos produtos para salvar aqui e comparar depois."
          action={
            <Link to="/loja" className="btn btn-primary">
              Explorar a loja
            </Link>
          }
        />
      )}
    </div>
  )
}

export function Tracking() {
  const user = useUser()
  const ready = useSessionReady()
  const [id, setId] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  if (api.mode === 'supabase')
    return (
      <div className="wrap max-w-lg py-10">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold-50 text-gold-700">
            <Truck size={26} />
          </span>
          <h1 className="display mt-4 text-3xl font-semibold md:text-4xl">Acompanhar pedido</h1>
          <p className="mt-2 text-mute">Por segurança, o andamento aparece na sua conta: produção, código de rastreio e entrega.</p>
        </div>
        {!ready ? (
          <p className="text-center text-mute" aria-busy="true">Carregando…</p>
        ) : user ? (
          <Link to="/conta" className="btn btn-primary w-full">
            Ver meus pedidos
          </Link>
        ) : (
          <div className="rounded-3xl border border-line bg-white p-6">
            <AuthForms onDone={() => navigate('/conta')} />
          </div>
        )}
      </div>
    )
  return (
    <div className="wrap max-w-lg py-10">
      <div className="mb-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold-50 text-gold-700">
          <Truck size={26} />
        </span>
        <h1 className="display mt-4 text-3xl font-semibold md:text-4xl">Rastrear pedido</h1>
        <p className="mt-2 text-mute">Use o número do pedido (ex.: BM-10412) e o e-mail da compra.</p>
      </div>
      <form
        className="space-y-4 rounded-3xl border border-line bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault()
          const code = id.trim().toUpperCase()
          const o = dbStore.get().orders.find((x) => x.id === code)
          if (!o || !isEmail(email) || o.customer.email !== email.trim().toLowerCase()) return setError('Não encontramos um pedido com esses dados. Confira e tente de novo.')
          navigate(`/pedido/${o.id}?email=${encodeURIComponent(o.customer.email)}`)
        }}
      >
        <Field label="Número do pedido" value={id} onChange={(e) => setId(e.target.value)} placeholder="BM-00000" />
        <Field label="E-mail da compra" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {error && <p className="rounded-xl bg-err-50 px-3 py-2 text-sm font-medium text-err">{error}</p>}
        <button className="btn btn-primary w-full">Ver andamento</button>
      </form>
      <p className="mt-4 text-center text-sm text-mute">
        Tem conta?{' '}
        <Link to="/conta" className="font-semibold text-navy-700 underline">
          Veja todos os seus pedidos
        </Link>
      </p>
    </div>
  )
}

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Quais formas de pagamento vocês aceitam?',
    a: `Pix (com ${RULES.pixDiscount * 100}% de desconto e aprovação na hora), cartão de crédito em até ${RULES.maxInstallments}x sem juros e boleto bancário.`,
  },
  {
    q: 'Qual o prazo de entrega?',
    a: 'É a soma do prazo de produção (aparece na página de cada produto) com o prazo dos Correios para o seu CEP. Você vê a data estimada antes de pagar, no cálculo de frete.',
  },
  { q: 'O frete é grátis?', a: `Sim, no PAC para compras a partir de R$ ${RULES.freeShippingFrom}. Em São Paulo/SP você também pode retirar no ateliê sem custo.` },
  {
    q: 'Os aventais seguem o padrão do meu rito e da minha Potência?',
    a: 'Trabalhamos com os principais ritos praticados no Brasil (REAA, York, Moderno, Brasileiro e Schröder). Se a sua Potência tiver alguma particularidade, escreva nas observações do pedido ou fale com a gente antes de comprar.',
  },
  {
    q: 'Como funciona o orçamento de impressão 3D?',
    a: 'Envie o arquivo STL na página de orçamento: calculamos volume e medidas na hora e mostramos o preço por material, qualidade e quantidade. Antes de imprimir, nossa equipe revisa o arquivo e avisa se algo precisar de ajuste.',
  },
  {
    q: 'Não tenho arquivo 3D. Vocês fazem o projeto?',
    a: 'Sim! No serviço de Modelagem 3D sob medida você descreve a peça (com fotos e medidas, se tiver), aprova uma prévia e recebe os arquivos na sua conta. Se quiser, já imprimimos.',
  },
  {
    q: 'Posso trocar ou devolver?',
    a: 'Você tem 7 dias após o recebimento para desistir da compra, conforme o Código de Defesa do Consumidor. Itens personalizados (com nome, foto ou medidas sob encomenda) são trocados apenas em caso de defeito.',
  },
  { q: 'Vocês vendem para Lojas e emitem nota fiscal?', a: 'Sim. Atendemos Lojas, Potências e eventos com condições para quantidade e nota fiscal em nome da Loja. Fale com a gente pelo WhatsApp.' },
]

export function Help() {
  const [open, setOpen] = useState(0)
  return (
    <div className="wrap max-w-3xl">
      <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Ajuda' }]} />
      <h1 className="display text-3xl font-semibold md:text-5xl">Como podemos ajudar?</h1>
      <p className="mt-2 text-mute">As dúvidas mais comuns. Não achou? Chama no WhatsApp — respondemos rápido.</p>
      <div className="mt-8 divide-y divide-line rounded-3xl border border-line bg-white">
        {FAQ.map((f, i) => (
          <div key={f.q}>
            <button type="button" className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
              {f.q}
              <ChevronDown size={18} className={`shrink-0 transition ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && <p className="px-5 pb-5 text-[0.95rem] leading-relaxed text-mute">{f.a}</p>}
          </div>
        ))}
      </div>
      <a href={whatsappLink()} target="_blank" rel="noreferrer" className="btn btn-primary mt-8">
        <Whatsapp size={18} /> Falar com o atendimento
      </a>
    </div>
  )
}

export function About() {
  return (
    <div>
      <section className="bg-navy-900 text-white">
        <div className="dots">
          <div className="wrap grid items-center gap-10 py-16 md:grid-cols-[1fr_auto] md:py-24">
            <div>
              <p className="eyebrow text-gold-300">Sobre a {STORE.name}</p>
              <h1 className="display mt-3 max-w-2xl text-4xl leading-[1.05] font-semibold md:text-6xl">Uma loja feita por quem entende a piada interna.</h1>
              <p className="mt-5 max-w-xl text-white/70">
                Todo maçom já ouviu: “virou bode”. A gente abraçou o apelido com orgulho e bom humor — e montou um lugar onde tradição e tecnologia andam juntas.
              </p>
            </div>
            <svg viewBox="0 0 100 100" className="mx-auto h-40 w-40 md:h-56 md:w-56" aria-hidden>
              <Goat fill="#f4e7c4" eye="#0d1a2b" />
            </svg>
          </div>
        </div>
      </section>
      <div className="wrap mt-14 grid gap-4 md:grid-cols-3">
        {[
          ['Respeito à tradição', 'Paramentos produzidos com cuidado, conferidos peça a peça e respeitando as particularidades de cada rito.'],
          ['Ateliê 3D próprio', 'Impressoras FDM e resina para decoração, presentes, colecionáveis e peças técnicas sob medida.'],
          ['Para todos', 'Para Irmãos, cunhadas, sobrinhos, Lojas — e para qualquer pessoa que queira tirar uma ideia do papel.'],
        ].map(([t, d]) => (
          <div key={t} className="rounded-3xl border border-line bg-white p-6">
            <svg viewBox="0 0 100 100" className="h-10 w-10" aria-hidden>
              <SquareCompass color="#c79b3b" w={8} />
            </svg>
            <h2 className="mt-4 text-lg font-semibold">{t}</h2>
            <p className="mt-1 text-sm text-mute">{d}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const POLICIES: Record<string, { title: string; body: ReactNode }> = {
  trocas: {
    title: 'Trocas e devoluções',
    body: (
      <>
        <p>
          <b>Direito de arrependimento:</b> em compras pela internet, você pode desistir em até 7 dias corridos após o recebimento (art. 49 do Código de Defesa do Consumidor). Devolvemos o valor integral, incluindo o frete.
        </p>
        <p>
          <b>Itens personalizados:</b> peças com nome, foto, gravação ou feitas a partir do seu arquivo/medidas são produzidas exclusivamente para você e, por isso, são trocadas apenas em caso de defeito de fabricação ou divergência com o pedido aprovado.
        </p>
        <p>
          <b>Defeitos:</b> avise em até 90 dias pelo WhatsApp ou e-mail, com fotos. Enviamos a etiqueta de postagem reversa sem custo.
        </p>
        <p>
          <b>Reembolso:</b> Pix e boleto em até 5 dias úteis após o recebimento da devolução; cartão, conforme o ciclo da operadora.
        </p>
      </>
    ),
  },
  entrega: {
    title: 'Prazos e entrega',
    body: (
      <>
        <p>O prazo total é a soma do prazo de produção (informado em cada produto) com o prazo de transporte. A contagem começa após a confirmação do pagamento.</p>
        <p>Enviamos pelos Correios (PAC e SEDEX) com código de rastreio, disponível na sua conta assim que o pedido é despachado. Em São Paulo/SP há a opção de retirada no ateliê, com hora marcada.</p>
        <p>Serviços digitais (modelagem 3D) são entregues na sua conta e por e-mail, sem frete.</p>
        <p>Frete grátis no PAC para compras a partir de R$ {RULES.freeShippingFrom}.</p>
      </>
    ),
  },
  privacidade: {
    title: 'Política de privacidade (LGPD)',
    body: (
      <>
        <p>Coletamos apenas os dados necessários para processar o seu pedido: nome, CPF (nota fiscal), e-mail, telefone e endereço de entrega.</p>
        <p>Os dados de cartão são processados diretamente pelo gateway de pagamento e nunca ficam armazenados na {STORE.name}.</p>
        <p>Não vendemos nem compartilhamos seus dados com terceiros, exceto transportadoras e meios de pagamento, para cumprir o pedido.</p>
        <p>
          Você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados a qualquer momento pelo e-mail <b>{STORE.email}</b>.
        </p>
      </>
    ),
  },
  termos: {
    title: 'Termos de uso',
    body: (
      <>
        <p>
          Ao usar a loja, você concorda com estes termos. Os preços e condições podem mudar sem aviso, mas valem sempre os do momento da compra. Imagens são ilustrativas.
        </p>
        <p>Arquivos enviados para impressão devem ser de sua autoria ou ter licença de uso. Não imprimimos armas, réplicas de armas ou itens que violem direitos de terceiros.</p>
        <p>
          {STORE.legalName} · CNPJ {STORE.cnpj} · {STORE.city} · {STORE.email}
        </p>
      </>
    ),
  },
}

export function Policy({ slug }: { slug: string }) {
  const p = POLICIES[slug]
  if (!p) return null
  return (
    <div className="wrap max-w-3xl">
      <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: p.title }]} />
      <h1 className="display text-3xl font-semibold md:text-5xl">{p.title}</h1>
      <div className="mt-8 space-y-4 rounded-3xl border border-line bg-white p-6 text-[0.95rem] leading-relaxed text-ink/85 md:p-8">{p.body}</div>
      <p className="mt-4 text-xs text-mute">Texto-base — revise com o seu contador/advogado antes de publicar.</p>
    </div>
  )
}

export const policyExists = (slug: string) => slug in POLICIES

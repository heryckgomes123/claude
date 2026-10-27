import type { ReactNode } from 'react'
import { RULES, STORE, whatsappLink } from '../config/store'
import { Link } from '../router'
import { prefsStore } from '../state/stores'
import { Instagram, Mail, Whatsapp } from '../components/Icons'
import { Breadcrumbs } from '../components/ui'

const UPDATED = '23 de outubro de 2026'
const PIX_OFF = Math.round(RULES.pixDiscount * 100)
const mailto = (subject: string) => `mailto:${STORE.email}?subject=${encodeURIComponent(subject)}`

function H({ children }: { children: ReactNode }) {
  return <h2 className="!mt-8 text-lg font-semibold text-navy-900">{children}</h2>
}
function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  )
}
const A = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="font-medium text-navy-700 underline">
    {children}
  </Link>
)
const Mail_ = () => (
  <a href={mailto('Atendimento Bodemania')} className="font-medium text-navy-700 underline">
    {STORE.email}
  </a>
)

function Identity() {
  return (
    <p>
      <b>{STORE.legalName}</b> · CNPJ {STORE.cnpj}
      <br />
      {STORE.address}
      <br />
      E-mail: <Mail_ /> · WhatsApp: {STORE.phone}
    </p>
  )
}

function CookieControls() {
  const cookies = prefsStore.use((s) => s.cookies)
  const label =
    cookies === 'all'
      ? 'Você aceitou os cookies de medição.'
      : cookies === 'essential'
        ? 'Você está usando só os cookies essenciais.'
        : 'Você ainda não escolheu.'
  return (
    <div className="rounded-2xl border border-line bg-paper-2 p-4">
      <p className="text-sm font-semibold">Sua escolha atual: {label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => prefsStore.set({ cookies: 'all' })}>
          Aceitar cookies de medição
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => prefsStore.set({ cookies: 'essential' })}>
          Só essenciais
        </button>
      </div>
      <p className="mt-2 text-xs text-mute">
        Se você desligar a medição, ela deixa de funcionar na hora. Você pode mudar de ideia quando quiser.
      </p>
    </div>
  )
}

export const POLICIES: Record<string, { title: string; summary: string; body: ReactNode }> = {
  privacidade: {
    title: 'Política de privacidade',
    summary: 'Como a Bodemania coleta, usa e protege os seus dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).',
    body: (
      <>
        <p>
          Respeitamos a sua privacidade. Esta política explica, em linguagem simples, quais dados usamos, por quê, com quem compartilhamos e
          como você controla tudo isso.
        </p>

        <H>1. Quem é o responsável pelos seus dados</H>
        <Identity />
        <p>
          Canal de privacidade (encarregado pelo tratamento de dados): <Mail_ />.
        </p>

        <H>2. Quais dados coletamos</H>
        <UL
          items={[
            <>
              <b>Cadastro e compra:</b> nome, CPF (necessário para a nota fiscal), e-mail, telefone/WhatsApp, endereços de entrega e
              histórico de pedidos.
            </>,
            <>
              <b>Pagamento:</b> os dados do cartão são digitados direto no ambiente do Mercado Pago e nunca passam pelos nossos servidores.
              Guardamos apenas o status, a forma e o identificador do pagamento.
            </>,
            <>
              <b>Arquivos que você envia:</b> modelos 3D (STL), fotos para peças personalizadas, medidas e descrições do que deseja.
            </>,
            <>
              <b>Atendimento:</b> as mensagens que você troca com a gente por WhatsApp e e-mail.
            </>,
            <>
              <b>Navegação:</b> endereço IP, tipo de aparelho e páginas visitadas. Os cookies de medição só funcionam se você permitir (veja
              a <A to="/politicas/cookies">política de cookies</A>).
            </>,
          ]}
        />

        <H>3. Para que usamos e em que base legal</H>
        <UL
          items={[
            <>
              Processar o pedido, receber o pagamento, produzir e entregar: <b>execução de contrato</b> (art. 7º, V).
            </>,
            <>
              Emitir nota fiscal e guardar registros fiscais: <b>obrigação legal</b> (art. 7º, II).
            </>,
            <>
              Prevenir fraudes e proteger a loja e os clientes: <b>legítimo interesse</b> (art. 7º, IX).
            </>,
            <>
              Enviar novidades e ofertas por e-mail ou WhatsApp: <b>consentimento</b> (art. 7º, I). Você pode retirar a qualquer momento.
            </>,
            <>
              Medir o uso do site para melhorá-lo: <b>consentimento</b>, apenas se você aceitar os cookies de medição.
            </>,
          ]}
        />

        <H>4. Com quem compartilhamos</H>
        <p>Não vendemos seus dados. Compartilhamos apenas o necessário com empresas que nos ajudam a operar a loja:</p>
        <UL
          items={[
            <>
              <b>Mercado Pago:</b> processamento de pagamentos (Pix, cartão e boleto).
            </>,
            <>
              <b>Correios e Melhor Envio:</b> cálculo de frete, postagem e rastreio (nome, endereço e telefone do destinatário).
            </>,
            <>
              <b>Supabase:</b> banco de dados, contas de usuário e armazenamento dos arquivos enviados.
            </>,
            <>
              <b>Netlify:</b> hospedagem do site.
            </>,
            <>
              <b>Resend:</b> envio de e-mails sobre o seu pedido e a sua conta.
            </>,
            <>
              <b>Google Analytics:</b> estatísticas de uso, somente com o seu consentimento.
            </>,
            <>Autoridades públicas, quando a lei exigir.</>,
          ]}
        />
        <p>
          Alguns desses fornecedores podem tratar dados em servidores fora do Brasil. Nesses casos, exigimos garantias adequadas de
          proteção, conforme o art. 33 da LGPD.
        </p>

        <H>5. Por quanto tempo guardamos</H>
        <UL
          items={[
            <>Dados de pedidos e notas fiscais: pelo prazo exigido pela legislação fiscal e tributária (em regra, 5 anos).</>,
            <>
              Dados da conta: enquanto ela estiver ativa. Você pode pedir a exclusão a qualquer momento, ressalvados os registros que a lei
              nos obriga a manter.
            </>,
            <>
              Arquivos enviados para impressão: enquanto forem necessários para produzir o pedido e atender a garantia, e apagados a seu
              pedido.
            </>,
          ]}
        />

        <H>6. Seus direitos</H>
        <p>Nos termos do art. 18 da LGPD, você pode, a qualquer momento:</p>
        <UL
          items={[
            'confirmar se tratamos seus dados e acessá-los;',
            'corrigir dados incompletos, inexatos ou desatualizados (você também pode editar em Minha conta → Meus dados);',
            'pedir anonimização, bloqueio ou eliminação de dados desnecessários ou tratados sem base legal;',
            'pedir a portabilidade dos dados;',
            'saber com quem compartilhamos seus dados;',
            'retirar o consentimento e se opor a um tratamento;',
            'reclamar à Autoridade Nacional de Proteção de Dados (ANPD).',
          ]}
        />
        <p>
          Para exercer qualquer um desses direitos, escreva para <Mail_ />. Respondemos em até 15 dias.
        </p>

        <H>7. Segurança</H>
        <p>
          Usamos conexão criptografada (HTTPS), senhas armazenadas de forma protegida, acesso restrito aos dados e um gateway de pagamento
          certificado. Nenhum sistema é 100% imune a falhas; se houver um incidente que possa afetar você, avisaremos você e a ANPD, como
          manda a lei.
        </p>

        <H>8. Crianças e adolescentes</H>
        <p>A loja é destinada a maiores de 18 anos. Compras por menores devem ser feitas com a participação de um responsável legal.</p>

        <H>9. Mudanças nesta política</H>
        <p>Podemos atualizar esta política. A versão em vigor é sempre a desta página, com a data da última atualização abaixo.</p>
      </>
    ),
  },

  termos: {
    title: 'Termos de uso e venda',
    summary: 'As regras para usar o site e comprar na Bodemania.',
    body: (
      <>
        <p>
          Ao criar uma conta ou fazer uma compra, você concorda com estes termos. Leia também a{' '}
          <A to="/politicas/privacidade">política de privacidade</A>, a <A to="/politicas/trocas">política de trocas e devoluções</A> e a{' '}
          <A to="/politicas/entrega">política de entrega</A>.
        </p>

        <H>1. Quem vende</H>
        <Identity />

        <H>2. Conta e cadastro</H>
        <p>
          Para comprar, você precisa ter 18 anos ou mais e informar dados verdadeiros e atualizados. Sua senha é pessoal: não a compartilhe
          e avise a gente se suspeitar de uso indevido da sua conta.
        </p>

        <H>3. Produtos e informações</H>
        <p>
          Descrevemos cada produto com o máximo de clareza: materiais, medidas, prazo de produção e preço. As cores podem variar um pouco
          conforme a tela do seu aparelho. Peças artesanais e impressas em 3D podem ter pequenas variações de acabamento e de cor entre uma
          unidade e outra, o que não é defeito quando não compromete o uso nem a descrição do produto.
        </p>

        <H>4. Preços e pagamento</H>
        <UL
          items={[
            'Os preços estão em reais. O frete é calculado para o seu CEP e mostrado antes de você pagar.',
            `Pix: ${PIX_OFF}% de desconto, com confirmação na hora.`,
            `Cartão de crédito: em até ${RULES.maxInstallments}x sem juros (parcela mínima de R$ ${RULES.minInstallment}).`,
            'Boleto bancário: o pedido é liberado após a compensação.',
            'Pedidos com pagamento não confirmado dentro do prazo indicado no pedido são cancelados automaticamente.',
            'Em caso de erro evidente de preço, avisaremos você antes de seguir; se não houver acordo, o pedido é cancelado com reembolso integral.',
          ]}
        />

        <H>5. Confirmação do pedido e estoque</H>
        <p>
          O pedido é confirmado quando o pagamento é aprovado, e você recebe um e-mail com os detalhes. Se algum item ficar indisponível,
          avisamos você e devolvemos o valor integral, ou combinamos uma alternativa que você aceite.
        </p>

        <H>6. Produtos personalizados e impressão 3D</H>
        <UL
          items={[
            'Antes de imprimir, nossa equipe revisa o arquivo. Se ele não puder ser impresso como enviado, entramos em contato para ajustar ou devolvemos o valor.',
            'Você declara que o arquivo ou a imagem enviados são de sua autoria ou que tem licença para usá-los, e se responsabiliza por eles perante terceiros.',
            'Não imprimimos armas, réplicas de armas, itens que violem direitos de terceiros nem qualquer coisa ilegal.',
            'No serviço de modelagem 3D, você recebe uma prévia para aprovação antes da finalização.',
            <>
              As regras de cancelamento de itens personalizados estão na <A to="/politicas/trocas">política de trocas e devoluções</A>.
            </>,
          ]}
        />

        <H>7. Entrega, arrependimento e garantia</H>
        <p>
          Prazos e formas de entrega estão na <A to="/politicas/entrega">política de entrega</A>. Seu direito de desistir em até 7 dias e a
          garantia legal contra defeitos estão na <A to="/politicas/trocas">política de trocas e devoluções</A>, conforme o Código de Defesa
          do Consumidor.
        </p>

        <H>8. Propriedade intelectual</H>
        <p>
          A marca, a logo, os textos, as fotos e o desenho do site pertencem à {STORE.legalName} ou são usados com autorização. Não é
          permitido copiá-los ou usá-los comercialmente sem a nossa permissão por escrito.
        </p>

        <H>9. Responsabilidades</H>
        <p>
          Trabalhamos para manter o site no ar e seguro, mas podem ocorrer instabilidades por motivos técnicos ou de fornecedores. Isso não
          afeta os direitos que o Código de Defesa do Consumidor garante a você.
        </p>

        <H>10. Atendimento e reclamações</H>
        <p>
          Fale com a gente pelo{' '}
          <a href={whatsappLink()} target="_blank" rel="noreferrer" className="font-medium text-navy-700 underline">
            WhatsApp
          </a>{' '}
          ou por <Mail_ />. Se não ficar satisfeito com a resposta, você também pode procurar o Procon do seu estado ou o site
          consumidor.gov.br.
        </p>

        <H>11. Mudanças e lei aplicável</H>
        <p>
          Podemos atualizar estes termos. Para cada compra, valem os termos vigentes no momento do pedido. Aplica-se a lei brasileira, e o
          foro é o do domicílio do consumidor.
        </p>
      </>
    ),
  },

  trocas: {
    title: 'Trocas e devoluções',
    summary: 'Como desistir de uma compra, trocar ou devolver um produto com defeito.',
    body: (
      <>
        <div className="rounded-2xl border border-gold/40 bg-gold-50 p-4">
          <p className="font-semibold text-navy-900">Quer desistir de um pedido?</p>
          <p className="mt-1 text-sm">Avise a gente com o número do pedido. Respondemos o mais rápido possível.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              className="btn btn-primary btn-sm"
              href={whatsappLink('Olá, Bodemania! Quero exercer o meu direito de arrependimento. Número do pedido: ')}
              target="_blank"
              rel="noreferrer"
            >
              <Whatsapp size={16} /> Pedir pelo WhatsApp
            </a>
            <a className="btn btn-ghost btn-sm" href={mailto('Direito de arrependimento')}>
              <Mail size={16} /> Pedir por e-mail
            </a>
          </div>
        </div>

        <H>1. Direito de arrependimento (7 dias)</H>
        <p>
          Em compras feitas pela internet, você pode desistir em até <b>7 dias corridos</b> contados do recebimento do produto, sem precisar
          dar motivo (art. 49 do Código de Defesa do Consumidor).
        </p>
        <UL
          items={[
            'Devolvemos o valor integral pago, incluindo o frete.',
            'O custo da devolução é nosso: enviamos uma etiqueta de postagem reversa sem custo para você.',
            'Devolva o produto em bom estado e, sempre que possível, com a embalagem original.',
          ]}
        />

        <H>2. Produtos personalizados e sob medida</H>
        <p>
          Peças com nome, foto, gravação, medidas especiais ou feitas a partir do seu arquivo são produzidas exclusivamente para você e não
          podem ser revendidas.
        </p>
        <UL
          items={[
            'Você pode cancelar com reembolso integral enquanto a produção não tiver começado. Peça o quanto antes, pelos canais acima.',
            'Depois que a produção começa, a peça só é trocada ou devolvida em caso de defeito de fabricação ou se estiver diferente do pedido aprovado.',
          ]}
        />

        <H>3. Produto com defeito</H>
        <p>
          Se o produto chegar com defeito ou parar de funcionar, você tem direito à garantia legal: 30 dias para produtos não duráveis e 90
          dias para duráveis, contados do recebimento (ou da descoberta do defeito, quando ele não for aparente).
        </p>
        <UL
          items={[
            'Envie fotos e o número do pedido pelo WhatsApp ou por e-mail.',
            'Resolvemos em até 30 dias, como manda a lei. Você escolhe entre troca por outro produto igual, devolução do valor ou abatimento proporcional do preço.',
            'A etiqueta de postagem reversa também é por nossa conta.',
          ]}
        />

        <H>4. Produto errado ou danificado no transporte</H>
        <p>
          Confira o pacote ao receber. Se vier com a embalagem violada, ou um produto diferente do pedido, avise a gente o quanto antes, de
          preferência em até 7 dias, com fotos do produto e da embalagem. Fazemos a troca ou devolvemos o valor.
        </p>

        <H>5. Como devolver, passo a passo</H>
        <UL
          items={[
            'Peça a devolução pelo WhatsApp ou e-mail, com o número do pedido.',
            'Receba por e-mail a etiqueta de postagem reversa.',
            'Embale bem o produto e poste em uma agência dos Correios.',
            'Quando o produto chegar até nós, fazemos a conferência e iniciamos o reembolso.',
          ]}
        />

        <H>6. Reembolso</H>
        <UL
          items={[
            'Pix ou boleto: devolvemos por Pix, em até 5 dias úteis após o recebimento da devolução.',
            'Cartão de crédito: o estorno é solicitado à operadora e aparece na sua fatura conforme o ciclo do cartão, em geral em até duas faturas.',
          ]}
        />
      </>
    ),
  },

  entrega: {
    title: 'Prazos e entrega',
    summary: 'Como calculamos prazo e frete, como funciona a retirada e o que fazer em caso de problema.',
    body: (
      <>
        <H>1. Prazo de entrega</H>
        <p>
          O prazo total é a soma de dois prazos: o de <b>produção</b> (informado na página de cada produto) e o de <b>transporte</b>{' '}
          (calculado para o seu CEP). A contagem começa quando o pagamento é confirmado. A data estimada aparece antes de você pagar.
        </p>

        <H>2. Frete</H>
        <UL
          items={[
            'Enviamos pelos Correios, em PAC (mais econômico) ou SEDEX (mais rápido), com código de rastreio.',
            'O valor depende do CEP de destino, do peso e das medidas do pacote, e é mostrado antes do pagamento.',
            `Frete grátis no PAC para compras a partir de R$ ${RULES.freeShippingFrom}.`,
            'Você acompanha o pedido em Minha conta e em Rastrear pedido. O código de rastreio é liberado assim que o pedido é despachado.',
          ]}
        />

        <H>3. Retirada no ateliê</H>
        <p>
          Para clientes de Mato Grosso do Sul, oferecemos retirada sem custo no endereço abaixo, com hora marcada. Avisamos pelo WhatsApp
          quando o pedido estiver pronto. Leve um documento com foto e o número do pedido.
        </p>
        <p>{STORE.address}</p>

        <H>4. Serviços digitais</H>
        <p>A modelagem 3D e outros serviços digitais são entregues na sua conta e por e-mail, sem frete.</p>

        <H>5. Endereço e recebimento</H>
        <UL
          items={[
            'Confira o endereço e o CEP antes de finalizar. Se o endereço estiver incorreto ou incompleto, o reenvio pode ter novo custo de frete.',
            'Os Correios fazem até três tentativas de entrega. Depois disso, o pacote fica disponível para retirada na agência indicada.',
            'Ao receber, confira a embalagem. Se estiver violada ou amassada, recuse o pacote ou avise a gente imediatamente.',
          ]}
        />

        <H>6. Atraso, extravio ou avaria</H>
        <p>
          Se o pedido atrasar, se extraviar ou se chegar danificado, fale com a gente pelo WhatsApp ou por <Mail_ />. Abrimos o chamado com
          os Correios e, conforme o caso, reenviamos o produto ou devolvemos o valor.
        </p>
        <p>
          Mais detalhes sobre devoluções estão na <A to="/politicas/trocas">política de trocas e devoluções</A>.
        </p>
      </>
    ),
  },

  cookies: {
    title: 'Política de cookies',
    summary: 'Quais cookies e armazenamentos usamos, para quê, e como escolher.',
    body: (
      <>
        <p>
          Cookies e tecnologias parecidas (como o armazenamento local do navegador) são pequenos arquivos que guardam informações no seu
          aparelho. Usamos dois tipos.
        </p>

        <H>1. Essenciais (sempre ativos)</H>
        <p>
          Fazem o site funcionar: manter o seu carrinho, a sua sessão de login, os favoritos, o CEP informado e a sua escolha sobre cookies.
          Sem eles, a loja não funciona, e por isso não pedimos consentimento.
        </p>

        <H>2. De medição (só com a sua permissão)</H>
        <p>
          Usamos o Google Analytics 4 para entender quais páginas são mais visitadas e como melhorar a loja. Ele só é carregado se você
          clicar em “Aceitar todos”, e o seu IP é anonimizado. Não usamos cookies de publicidade.
        </p>

        <H>3. Sua escolha</H>
        <CookieControls />

        <H>4. Pelo navegador</H>
        <p>
          Você também pode apagar ou bloquear cookies nas configurações do seu navegador. Se bloquear os essenciais, o carrinho e o login
          podem deixar de funcionar.
        </p>

        <p>
          Veja também a <A to="/politicas/privacidade">política de privacidade</A>.
        </p>
      </>
    ),
  },
}

export const policyExists = (slug: string) => slug in POLICIES

export function Policy({ slug }: { slug: string }) {
  const p = POLICIES[slug]
  if (!p) return null
  return (
    <div className="wrap max-w-3xl">
      <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: p.title }]} />
      <h1 className="display text-3xl font-semibold md:text-5xl">{p.title}</h1>
      <p className="mt-2 text-mute">{p.summary}</p>
      <div className="mt-8 space-y-4 rounded-3xl border border-line bg-white p-6 text-[0.95rem] leading-relaxed text-ink/85 md:p-8">
        {p.body}
      </div>
      <p className="mt-4 text-xs text-mute">Última atualização: {UPDATED}.</p>
    </div>
  )
}

export function Contact() {
  return (
    <div className="wrap max-w-3xl">
      <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Contato' }]} />
      <h1 className="display text-3xl font-semibold md:text-5xl">Fale com a Bodemania</h1>
      <p className="mt-2 text-mute">
        Dúvidas sobre produtos, pedidos, trocas ou orçamentos 3D. Respondemos o mais rápido possível, em dias úteis.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a href={whatsappLink()} target="_blank" rel="noreferrer" className="rounded-3xl border border-line bg-white p-6 hover:border-gold">
          <Whatsapp size={26} />
          <h2 className="mt-3 font-semibold">WhatsApp</h2>
          <p className="text-sm text-mute">{STORE.phone}</p>
        </a>
        <a href={mailto('Atendimento Bodemania')} className="rounded-3xl border border-line bg-white p-6 hover:border-gold">
          <Mail size={26} />
          <h2 className="mt-3 font-semibold">E-mail</h2>
          <p className="text-sm text-mute">{STORE.email}</p>
        </a>
        <a
          href={STORE.instagram}
          target="_blank"
          rel="noreferrer"
          className="rounded-3xl border border-line bg-white p-6 hover:border-gold"
        >
          <Instagram size={26} />
          <h2 className="mt-3 font-semibold">Instagram</h2>
          <p className="text-sm text-mute">@{STORE.instagram.split('/').filter(Boolean).pop()}</p>
        </a>
        <div className="rounded-3xl border border-line bg-white p-6">
          <h2 className="font-semibold">Ateliê e dados da empresa</h2>
          <p className="mt-1 text-sm text-mute">
            {STORE.legalName}
            <br />
            CNPJ {STORE.cnpj}
            <br />
            {STORE.address}
          </p>
        </div>
      </div>
      <div className="mt-8 rounded-3xl border border-line bg-white p-6 text-sm leading-relaxed text-ink/85">
        <p>
          <b>Quer desistir de uma compra?</b> Veja a <A to="/politicas/trocas">política de trocas e devoluções</A>.
        </p>
        <p className="mt-2">
          <b>Não resolvemos o seu problema?</b> Você pode procurar o Procon do seu estado ou o site consumidor.gov.br.
        </p>
        <p className="mt-2">
          <b>Dúvidas sobre dados pessoais (LGPD)?</b> Escreva para <Mail_ /> ou leia a{' '}
          <A to="/politicas/privacidade">política de privacidade</A>.
        </p>
      </div>
    </div>
  )
}

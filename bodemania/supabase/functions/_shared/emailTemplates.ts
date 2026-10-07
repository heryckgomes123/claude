/** E-mails transacionais (HTML simples, compatível com Gmail/Outlook). Sem dependências. */

export interface MailOrder {
  id: string
  customerName: string
  customerEmail: string
  total: number
  subtotal: number
  discount: number
  pixDiscount: number
  shipping: number
  items: { name: string; qty: number; unitPrice: number; variant: string[]; personalization?: string | null }[]
  shippingLabel: string
  pickup: boolean
  digitalOnly: boolean
  estimate?: string | null
  tracking?: string | null
  address?: { street: string; number: string; district: string; city: string; uf: string; cep: string } | null
  payment: { method: string; pixCode?: string; boletoLine?: string; boletoUrl?: string }
  note?: string
}

export interface Mail {
  subject: string
  html: string
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const brl = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }) : '')

function layout(siteUrl: string, preheader: string, inner: string) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#faf7f0;font-family:Arial,Helvetica,sans-serif;color:#121722">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e6dfcf;border-radius:16px;overflow:hidden">
<tr><td style="background:#0d1a2b;padding:20px 28px"><a href="${esc(siteUrl)}" style="text-decoration:none;font-family:Georgia,serif;font-size:24px;font-weight:bold;color:#ffffff">Bode<span style="color:#e3c475">mania</span></a></td></tr>
<tr><td style="padding:28px">${inner}</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #e6dfcf;font-size:12px;color:#5d6574">Bodemania · Artigos maçônicos &amp; impressão 3D<br>Dúvidas? Responda este e-mail ou chame no WhatsApp.</td></tr>
</table></td></tr></table></body></html>`
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="display:inline-block;background:#0d1a2b;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px">${esc(label)}</a></p>`

function itemsTable(o: MailOrder) {
  const rows = o.items
    .map(
      (i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #f3eee2;font-size:14px">${esc(i.qty)}× <b>${esc(i.name)}</b>${
        i.variant.length ? `<br><span style="color:#5d6574;font-size:12px">${esc(i.variant.join(' · '))}</span>` : ''
      }${i.personalization ? `<br><span style="color:#213a5c;font-size:12px">“${esc(i.personalization)}”</span>` : ''}</td>
<td align="right" style="padding:8px 0;border-bottom:1px solid #f3eee2;font-size:14px;white-space:nowrap">${brl(i.qty * i.unitPrice)}</td></tr>`,
    )
    .join('')
  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:3px 0;font-size:14px;${bold ? 'font-weight:bold;font-size:16px' : 'color:#5d6574'}">${label}</td><td align="right" style="padding:3px 0;font-size:14px;${bold ? 'font-weight:bold;font-size:16px' : ''}">${value}</td></tr>`
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">${rows}
<tr><td colspan="2" style="padding-top:10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${line('Subtotal', brl(o.subtotal))}${o.discount > 0 ? line('Cupom', '-' + brl(o.discount)) : ''}${line(`Frete (${esc(o.shippingLabel)})`, o.shipping ? brl(o.shipping) : 'Grátis')}${
    o.pixDiscount > 0 ? line('Desconto Pix', '-' + brl(o.pixDiscount)) : ''
  }${line('Total', brl(o.total), true)}</table></td></tr></table>`
}

const orderLink = (siteUrl: string, o: MailOrder) => `${siteUrl.replace(/\/$/, '')}/pedido/${encodeURIComponent(o.id)}?email=${encodeURIComponent(o.customerEmail)}`

const first = (name: string) => esc(name.split(' ')[0])

export function orderReceived(siteUrl: string, o: MailOrder): Mail {
  let pay = ''
  if (o.payment.method === 'pix' && o.payment.pixCode)
    pay = `<p style="margin:20px 0 6px;font-weight:bold">Pague com Pix (vale por 30 minutos)</p><p style="margin:0 0 6px;font-size:13px;color:#5d6574">Copie o código e cole no app do seu banco:</p><p style="margin:0;padding:12px;background:#faf7f0;border:1px dashed #d6cdb8;border-radius:10px;font-family:monospace;font-size:12px;word-break:break-all">${esc(o.payment.pixCode)}</p>`
  if (o.payment.method === 'boleto')
    pay = `<p style="margin:20px 0 6px;font-weight:bold">Boleto bancário</p>${o.payment.boletoLine ? `<p style="margin:0 0 8px;padding:12px;background:#faf7f0;border:1px dashed #d6cdb8;border-radius:10px;font-family:monospace;font-size:12px;word-break:break-all">${esc(o.payment.boletoLine)}</p>` : ''}${
      o.payment.boletoUrl ? `<p style="margin:0"><a href="${esc(o.payment.boletoUrl)}" style="color:#213a5c">Abrir boleto em PDF</a></p>` : ''
    }`
  return {
    subject: `Recebemos o seu pedido ${o.id}`,
    html: layout(
      siteUrl,
      `Pedido ${o.id} recebido`,
      `<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px">Recebemos o seu pedido, ${first(o.customerName)}!</h1>
<p style="margin:0;color:#5d6574">Número do pedido: <b style="color:#121722">${esc(o.id)}</b></p>${pay}${itemsTable(o)}${button(orderLink(siteUrl, o), 'Acompanhar pedido')}`,
    ),
  }
}

export function orderPaid(siteUrl: string, o: MailOrder): Mail {
  return {
    subject: `Pagamento confirmado — pedido ${o.id}`,
    html: layout(
      siteUrl,
      'Pagamento aprovado',
      `<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px">Pagamento confirmado!</h1>
<p style="margin:0 0 4px">Obrigado, ${first(o.customerName)}. O pedido <b>${esc(o.id)}</b> já entrou na fila.</p>
${o.estimate ? `<p style="margin:0;color:#5d6574">Previsão ${o.pickup ? 'de retirada' : o.digitalOnly ? 'de entrega dos arquivos' : 'de entrega'}: <b style="color:#121722">${fmtDate(o.estimate)}</b></p>` : ''}${itemsTable(o)}${button(orderLink(siteUrl, o), 'Acompanhar pedido')}`,
    ),
  }
}

export function orderInProduction(siteUrl: string, o: MailOrder): Mail {
  return {
    subject: `Seu pedido ${o.id} está em produção`,
    html: layout(
      siteUrl,
      'Estamos produzindo o seu pedido',
      `<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px">Mãos à obra!</h1>
<p style="margin:0">${first(o.customerName)}, o pedido <b>${esc(o.id)}</b> está sendo produzido e conferido peça a peça. Avisamos assim que ele sair.</p>${button(orderLink(siteUrl, o), 'Acompanhar pedido')}`,
    ),
  }
}

export function orderShipped(siteUrl: string, o: MailOrder): Mail {
  const where = o.pickup
    ? '<p style="margin:0">Seu pedido está <b>pronto para retirada</b> no ateliê. Combine o horário pelo WhatsApp.</p>'
    : o.digitalOnly
      ? '<p style="margin:0">A prévia do seu projeto está disponível na sua conta para aprovação.</p>'
      : `<p style="margin:0 0 6px">Seu pedido saiu para entrega pelos Correios${o.tracking ? `. Código de rastreio: <b>${esc(o.tracking)}</b>` : '.'}</p>${
          o.tracking ? `<p style="margin:0"><a href="https://rastreamento.correios.com.br/app/index.php?objeto=${encodeURIComponent(o.tracking)}" style="color:#213a5c">Rastrear nos Correios</a></p>` : ''
        }`
  return {
    subject: o.pickup ? `Pedido ${o.id} pronto para retirada` : `Seu pedido ${o.id} foi enviado`,
    html: layout(siteUrl, 'Pedido a caminho', `<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px">${o.pickup ? 'Pronto para retirar!' : o.digitalOnly ? 'Prévia disponível' : 'Está a caminho!'}</h1>${where}${button(orderLink(siteUrl, o), 'Ver pedido')}`),
  }
}

export function orderDelivered(siteUrl: string, o: MailOrder): Mail {
  return {
    subject: `Pedido ${o.id} entregue`,
    html: layout(
      siteUrl,
      'Pedido entregue',
      `<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px">Pedido entregue. Obrigado!</h1>
<p style="margin:0">${first(o.customerName)}, esperamos que goste. Se algo não saiu como esperado, responda este e-mail — resolvemos.</p>${button(orderLink(siteUrl, o), 'Ver pedido')}`,
    ),
  }
}

export function orderCancelled(siteUrl: string, o: MailOrder): Mail {
  return {
    subject: `Pedido ${o.id} cancelado`,
    html: layout(
      siteUrl,
      'Pedido cancelado',
      `<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px">Pedido cancelado</h1>
<p style="margin:0">${first(o.customerName)}, o pedido <b>${esc(o.id)}</b> foi cancelado${o.note ? `: ${esc(o.note)}` : '.'}</p>
<p style="margin:12px 0 0;color:#5d6574">Se você já pagou, o estorno é feito automaticamente: Pix e boleto em até 5 dias úteis; cartão conforme a fatura.</p>${button(siteUrl, 'Voltar à loja')}`,
    ),
  }
}

/** Aviso para a equipe quando um pedido é pago. */
export function adminNewPaidOrder(siteUrl: string, o: MailOrder): Mail {
  return {
    subject: `Novo pedido pago ${o.id} — ${brl(o.total)}`,
    html: layout(
      siteUrl,
      `Novo pedido pago de ${o.customerName}`,
      `<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px">Novo pedido pago</h1>
<p style="margin:0">${esc(o.customerName)} · ${esc(o.customerEmail)}<br>${esc(o.shippingLabel)}${
        o.address ? ` · ${esc(o.address.street)}, ${esc(o.address.number)} — ${esc(o.address.city)}/${esc(o.address.uf)}` : ''
      }</p>${itemsTable(o)}${button(`${siteUrl.replace(/\/$/, '')}/admin`, 'Abrir painel')}`,
    ),
  }
}

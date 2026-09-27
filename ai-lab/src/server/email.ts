import 'server-only'
import { emailEnabled, serverEnv } from './env'

/**
 * E-mails transacionais via API da Resend (https://resend.com).
 * Sem RESEND_API_KEY + EMAIL_FROM, nada é enviado — e o app avisa no painel.
 */
export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  const env = serverEnv()
  if (!emailEnabled()) {
    console.warn(`[email] envio desativado (RESEND_API_KEY/EMAIL_FROM ausentes): "${subject}"`)
    return false
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html, text }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`Resend respondeu ${response.status}: ${(await response.text()).slice(0, 200)}`)
  return true
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function layout(title: string, paragraphs: string[], cta: { label: string; url: string }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.6;color:#d8d3c8">${escapeHtml(p)}</p>`).join('')
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#060606;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:40px 24px">
<p style="font-size:11px;letter-spacing:3px;color:#e2ae3a;margin:0 0 20px">INTELRA AI LAB</p>
<h1 style="font-size:22px;color:#f4f0e6;margin:0 0 18px">${escapeHtml(title)}</h1>
${body}
<p style="margin:26px 0"><a href="${escapeHtml(cta.url)}" style="background:#f7c948;color:#060606;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;display:inline-block">${escapeHtml(cta.label)}</a></p>
<p style="font-size:12px;color:#88837a;line-height:1.5">Se o botão não funcionar, copie este link: ${escapeHtml(cta.url)}</p>
</div></body></html>`
  const text = [title, '', ...paragraphs, '', `${cta.label}: ${cta.url}`].join('\n')
  return { html, text }
}

export function appUrl(): string {
  return (serverEnv().APP_URL ?? process.env.URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

export async function sendWelcomeEmail(to: string, name: string | null) {
  if (!emailEnabled()) return false
  const first = name?.split(' ')[0]
  const { html, text } = layout(
    `${first ? `${first}, seu` : 'Seu'} acesso ao INTELRA AI LAB está liberado`,
    [
      'Obrigado pela compra! Sua área de membros já está pronta: prompts, aulas e ferramentas em um só lugar.',
      `Crie sua conta usando exatamente este e-mail (${to}) — o acesso abre automaticamente.`,
    ],
    { label: 'Criar minha conta', url: `${appUrl()}/criar-conta?email=${encodeURIComponent(to)}` },
  )
  return sendEmail({ to, subject: 'Seu acesso ao INTELRA AI LAB está liberado', html, text })
}

export async function sendVerificationEmail(to: string, url: string) {
  const { html, text } = layout(
    'Confirme seu e-mail',
    ['Falta só um passo para entrar na área de membros. Confirme que este e-mail é seu:'],
    { label: 'Confirmar e-mail', url },
  )
  return sendEmail({ to, subject: 'Confirme seu e-mail — INTELRA AI LAB', html, text })
}

export async function sendResetPasswordEmail(to: string, url: string) {
  const { html, text } = layout(
    'Crie uma nova senha',
    ['Recebemos um pedido para redefinir sua senha. O link vale por 1 hora.', 'Se não foi você, ignore este e-mail.'],
    { label: 'Criar nova senha', url },
  )
  return sendEmail({ to, subject: 'Nova senha — INTELRA AI LAB', html, text })
}

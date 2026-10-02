/**
 * Eventos de analytics, sem dados pessoais.
 *
 * Os eventos são empurrados para `window.dataLayer` (Google Tag Manager), `gtag` e `plausible`
 * quando existirem na página. Nunca envie nome, e-mail, telefone ou textos livres aqui.
 */

export type AnalyticsEvent =
  | 'hero_cta_click'
  | 'service_selected'
  | 'reference_added'
  | 'quote_started'
  | 'quote_step_completed'
  | 'quote_submitted'
  | 'whatsapp_clicked'

type Props = Record<string, string | number | boolean>

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    plausible?: (event: string, options?: { props?: Props }) => void
  }
}

export function track(event: AnalyticsEvent, props: Props = {}): void {
  if (typeof window === 'undefined') return
  try {
    window.dataLayer?.push({ event, ...props })
    window.gtag?.('event', event, props)
    window.plausible?.(event, { props })
  } catch {
    // Analytics nunca pode quebrar a experiência.
  }
  if (import.meta.env.DEV) console.debug('[analytics]', event, props)
}

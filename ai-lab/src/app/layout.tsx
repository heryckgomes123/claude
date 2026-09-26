import '@fontsource-variable/geist/wght.css'
import '@fontsource-variable/geist-mono/wght.css'
import '@fontsource/anton/latin-400.css'
import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL

export const metadata: Metadata = {
  metadataBase: appUrl ? new URL(appUrl) : undefined,
  title: { default: 'INTELRA AI LAB', template: '%s · INTELRA AI LAB' },
  description: 'Seu laboratório criativo com IA: prompts, workflows, ferramentas, referências e tutoriais organizados para criar.',
  applicationName: 'INTELRA AI LAB',
  icons: { icon: '/favicon.png', apple: '/apple-touch-icon.png' },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#060606',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-dvh">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-gold-300 focus:px-4 focus:py-2 focus:text-ink-950"
        >
          Pular para o conteúdo
        </a>
        {children}
        <Toaster
          theme="dark"
          position="bottom-center"
          toastOptions={{
            classNames: {
              toast: '!bg-ink-850 !border-border !text-bone !rounded-xl',
              description: '!text-mute',
            },
          }}
        />
      </body>
    </html>
  )
}

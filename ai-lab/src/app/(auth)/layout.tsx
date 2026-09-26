import Link from 'next/link'
import { LabLogo } from '@/components/lab/logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="lab-grid-bg pointer-events-none absolute inset-x-0 top-0 h-[520px]" aria-hidden />
      <header className="relative mx-auto flex w-full max-w-6xl px-5 py-5 md:px-8">
        <Link href="/" aria-label="INTELRA AI LAB — início">
          <LabLogo />
        </Link>
      </header>
      <main id="conteudo" className="relative flex flex-1 items-start justify-center px-5 pb-16 pt-8 md:items-center md:pt-0">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}

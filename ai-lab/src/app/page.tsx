import { ArrowRight, BookOpen, Heart, Sparkles, Wrench } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LabLogo } from '@/components/lab/logo'
import { Button } from '@/components/ui/button'
import { getViewer } from '@/server/auth/viewer'
import { getSettings } from '@/server/settings'

const PILLARS = [
  { icon: Sparkles, title: 'Prompts prontos', text: 'Copie, personalize os campos e cole na sua IA favorita.' },
  { icon: BookOpen, title: 'Aulas', text: 'A técnica por trás de cada resultado, passo a passo.' },
  { icon: Wrench, title: 'Ferramentas', text: 'Qual IA usar para cada tarefa — e como usar.' },
  { icon: Heart, title: 'Favoritos', text: 'Guarde os prompts que funcionam para você.' },
]

export default async function Home() {
  const viewer = await getViewer().catch(() => null)
  if (viewer) redirect(viewer.hasLabAccess ? '/lab' : '/acesso')
  const { checkoutUrl } = await getSettings().catch(() => ({ checkoutUrl: '' }))

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="lab-grid-bg pointer-events-none absolute inset-x-0 top-0 h-[680px]" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-[-240px] size-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(247_201_72/0.14),transparent)]"
        aria-hidden
      />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <LabLogo />
        <Button asChild variant="ghost" size="sm">
          <Link href="/entrar">Entrar</Link>
        </Button>
      </header>

      <main id="conteudo" className="relative mx-auto max-w-6xl px-5 pb-24 pt-16 md:px-8 md:pt-24">
        <p className="eyebrow animate-fade-up">Área de membros · INTELRA</p>
        <h1 className="display mt-5 max-w-4xl animate-fade-up text-[clamp(2.8rem,8vw,6rem)] [animation-delay:60ms]">
          Prompts, aulas e ferramentas de IA <span className="text-gold">em um só lugar.</span>
        </h1>
        <p className="mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-mute [animation-delay:120ms]">
          Escolha o prompt, copie e cole. Aprenda a técnica nas aulas. Tudo organizado para você sair da ideia e chegar ao
          resultado.
        </p>
        <div className="mt-9 flex animate-fade-up flex-wrap gap-3 [animation-delay:180ms]">
          {checkoutUrl && (
            <Button asChild variant="primary" size="lg">
              <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
                Quero ter acesso <ArrowRight />
              </a>
            </Button>
          )}
          <Button asChild variant={checkoutUrl ? 'outline' : 'primary'} size="lg">
            <Link href="/entrar">Já sou aluno — entrar</Link>
          </Button>
        </div>
        <p className="mt-4 animate-fade-up text-sm text-mute-600 [animation-delay:220ms]">
          Comprou agora?{' '}
          <Link href="/criar-conta" className="text-gold-300 underline decoration-gold-300/40 underline-offset-4">
            Crie sua conta com o e-mail da compra
          </Link>
          .
        </p>

        <ul className="mt-20 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="lab-card rounded-2xl p-5">
              <Icon className="size-5 text-gold-300" aria-hidden />
              <h2 className="mt-4 font-medium">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-mute">{text}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

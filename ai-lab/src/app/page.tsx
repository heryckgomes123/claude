import { ArrowRight, BookOpen, Compass, FlaskConical, Sparkles, Workflow, Wrench } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LabLogo } from '@/components/lab/logo'
import { Button } from '@/components/ui/button'
import { getViewer } from '@/server/auth/viewer'

const PILLARS = [
  { icon: Sparkles, title: 'Prompts', text: 'Prontos para copiar, com variáveis, parâmetros e o resultado esperado.' },
  { icon: Workflow, title: 'Workflows', text: 'O caminho completo: da foto ao vídeo final, etapa por etapa.' },
  { icon: Wrench, title: 'Ferramentas', text: 'Qual IA usar para cada tarefa — com pontos fortes e limites.' },
  { icon: Compass, title: 'Referências', text: 'Direções visuais, paletas e conceitos para criar com intenção.' },
  { icon: BookOpen, title: 'Tutoriais', text: 'Técnicas explicadas, erros comuns e dicas profissionais.' },
  { icon: FlaskConical, title: 'Experimentos', text: 'Compare versões de prompts e registre o que funciona.' },
]

export default async function Home() {
  const viewer = await getViewer().catch(() => null)
  if (viewer) redirect(viewer.hasLabAccess ? '/lab' : '/acesso')

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="lab-grid-bg pointer-events-none absolute inset-x-0 top-0 h-[680px]" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-[-240px] size-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(247_201_72/0.14),transparent)]"
        aria-hidden
      />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <LabLogo />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/entrar">Entrar</Link>
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link href="/criar-conta">Criar conta</Link>
          </Button>
        </nav>
      </header>

      <main id="conteudo" className="relative mx-auto max-w-6xl px-5 pb-24 pt-16 md:px-8 md:pt-24">
        <p className="eyebrow animate-fade-up">Área de membros · INTELRA</p>
        <h1 className="display mt-5 max-w-4xl animate-fade-up text-[clamp(2.8rem,8vw,6.2rem)] [animation-delay:60ms]">
          Pare de procurar prompts aleatórios. <span className="text-gold">Tenha um laboratório.</span>
        </h1>
        <p className="mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-mute [animation-delay:120ms]">
          O INTELRA AI LAB conecta prompts, ferramentas, workflows, referências e tutoriais num só lugar — para você sair
          da ideia e chegar ao resultado.
        </p>
        <div className="mt-9 flex flex-wrap gap-3 animate-fade-up [animation-delay:180ms]">
          <Button asChild variant="primary" size="lg">
            <Link href="/entrar">
              Entrar no Lab <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/criar-conta">Tenho um código de acesso</Link>
          </Button>
        </div>

        <ul className="mt-20 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="lab-card rounded-2xl p-5">
              <Icon className="size-5 text-gold-300" aria-hidden />
              <h2 className="mt-4 font-medium">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-mute">{text}</p>
            </li>
          ))}
        </ul>

        <p className="mt-16 font-mono text-xs tracking-[0.2em] text-mute-600">
          DESCOBRIR → APRENDER → EXPERIMENTAR → CRIAR → SALVAR → MELHORAR
        </p>
      </main>
    </div>
  )
}

import { CtaButton } from '../components/CtaButton'
import { ArrowUpRight } from '../components/Icons'
import { ProjectArt } from '../components/ProjectArt'
import { Reveal } from '../components/Reveal'
import { SectionHeader } from '../components/SectionHeader'
import { WHATSAPP_MESSAGES } from '../config/site'
import { PROJECTS } from '../data/projects'
import type { Project } from '../data/projects'

// Layout editorial: destaque alto à esquerda + dois cards à direita, depois uma linha de três
const LAYOUT = [
  'md:row-span-2 lg:col-span-5 lg:row-span-2',
  'lg:col-span-7',
  'lg:col-span-7',
  'lg:col-span-4',
  'lg:col-span-4',
  'md:col-span-2 lg:col-span-4',
]

export function Projects() {
  return (
    <section id="projetos" aria-labelledby="projects-title" className="relative border-t border-gold-300/10">
      <div className="container-x py-24 md:py-36">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeader
            id="projects-title"
            eyebrow="Projetos"
            title={
              <>
                Trabalho que
                <br />
                <span className="slant text-gold">para o scroll.</span>
              </>
            }
          />
          <Reveal delay={0.15} className="max-w-sm">
            <p className="text-pretty leading-relaxed text-mute">
              Conteúdo, marcas, páginas e sistemas. Novos cases completos são publicados aqui conforme os projetos são entregues.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-3 md:mt-20 md:grid-cols-2 md:gap-4 lg:grid-cols-12">
          {PROJECTS.map((project, i) => (
            <Reveal key={project.id} delay={(i % 2) * 0.08} className={LAYOUT[i] ?? 'lg:col-span-4'}>
              <ProjectCard project={project} featured={i === 0} compact={i >= 3} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-14 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <CtaButton size="lg" icon="whatsapp" message={WHATSAPP_MESSAGES.project}>
            Quero um projeto assim
          </CtaButton>
          <p className="text-sm text-mute">Conte o que você quer criar — a gente mostra o caminho.</p>
        </Reveal>
      </div>
    </section>
  )
}

function ProjectCard({ project, featured, compact }: { project: Project; featured: boolean; compact: boolean }) {
  const Wrapper = project.href ? 'a' : 'div'
  const artSize = featured
    ? 'aspect-[4/5] md:aspect-auto md:flex-1 md:min-h-[520px]'
    : compact
      ? 'aspect-[4/3] lg:aspect-auto lg:h-[280px]'
      : 'aspect-[4/3] lg:aspect-auto lg:h-[300px]'
  return (
    <Wrapper {...(project.href ? { href: project.href, target: '_blank', rel: 'noopener noreferrer' } : {})} className="group block h-full">
      <article className="flex h-full flex-col">
        <div
          className={`relative overflow-hidden rounded-[1.5rem] border bg-ink-900 transition-[border-color,box-shadow] duration-700 ${artSize} ${
            featured
              ? 'border-gold-300/40 shadow-[0_40px_100px_-50px_rgb(226_174_58/0.6)] group-hover:border-gold-300/80'
              : 'border-white/[0.08] group-hover:border-gold-300/35'
          }`}
        >
          <div className="absolute inset-0 transition-transform duration-[1200ms] ease-premium group-hover:scale-[1.04]">
            {project.image ? (
              <img
                src={project.image}
                alt={project.imageAlt ?? project.title}
                loading="lazy"
                decoding="async"
                className="size-full object-cover object-top"
              />
            ) : (
              <ProjectArt type={project.art} />
            )}
          </div>
          <div className="absolute left-4 top-4 flex gap-2 md:left-5 md:top-5">
            <span
              className={`eyebrow rounded-full px-3 py-1.5 backdrop-blur-md ${
                featured ? 'bg-gold-300 text-ink-950' : 'border border-white/10 bg-ink-950/60 text-bone/80'
              }`}
            >
              {project.category}
            </span>
          </div>
          {!project.image && (
            <span className="eyebrow absolute bottom-4 right-4 rounded-full bg-ink-950/60 px-3 py-1.5 text-mute backdrop-blur-md md:bottom-5 md:right-5">
              Case em breve
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-6 px-1 pt-5">
          <div>
            <h3 className="text-lg font-medium tracking-[-0.02em] md:text-xl">{project.title}</h3>
            <p className="mt-1 text-sm text-mute">{project.client ? `${project.client} · ${project.description}` : project.description}</p>
          </div>
          {project.href && (
            <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-full border border-white/10 text-bone/60 transition-all duration-500 ease-premium group-hover:border-gold-300/50 group-hover:text-gold-300">
              <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:rotate-45" />
            </span>
          )}
        </div>
      </article>
    </Wrapper>
  )
}

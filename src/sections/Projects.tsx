import { ProjectArt } from '../components/ProjectArt'
import { ArrowUpRight } from '../components/Icons'
import { Reveal } from '../components/Reveal'
import { SectionHeader } from '../components/SectionHeader'
import { PROJECTS } from '../data/projects'
import type { Project } from '../data/projects'

// Layout editorial: 7/5 · 5/7 · 4/4/4
const LAYOUT = [
  'md:col-span-2 lg:col-span-7',
  'lg:col-span-5',
  'lg:col-span-5',
  'lg:col-span-7',
  'lg:col-span-4',
  'lg:col-span-4',
  'lg:col-span-4',
]

export function Projects() {
  return (
    <section id="projetos" aria-labelledby="projects-title" className="relative border-t border-white/[0.06]">
      <div className="container-x py-24 md:py-36">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeader
            id="projects-title"
            eyebrow="Projetos"
            title={
              <>
                Frentes em que <span className="serif-accent">construímos.</span>
              </>
            }
          />
          <Reveal delay={0.15} className="max-w-sm">
            <p className="text-pretty leading-relaxed text-mute">
              Uma seleção das áreas em que a INTELRA atua. Os cases completos serão publicados aqui em breve.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-3 md:mt-20 md:grid-cols-2 md:gap-4 lg:grid-cols-12">
          {PROJECTS.map((project, i) => (
            <Reveal key={project.id} delay={(i % 2) * 0.08} className={LAYOUT[i] ?? 'lg:col-span-6'}>
              <ProjectCard project={project} compact={i >= 4} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProjectCard({ project, compact }: { project: Project; compact: boolean }) {
  const Wrapper = project.href ? 'a' : 'div'
  return (
    <Wrapper {...(project.href ? { href: project.href, target: '_blank', rel: 'noopener noreferrer' } : {})} className="group block h-full">
      <article className="flex h-full flex-col">
        <div
          className={`relative overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-ink-900 transition-[border-color] duration-700 group-hover:border-white/20 ${
            compact ? 'aspect-[4/3] lg:aspect-auto lg:h-[300px]' : 'aspect-[4/3] lg:aspect-auto lg:h-[440px]'
          }`}
        >
          <div className="absolute inset-0 transition-transform duration-[1200ms] ease-premium group-hover:scale-[1.04]">
            {project.image ? (
              <img
                src={project.image}
                alt={`${project.title}${project.client ? ` — ${project.client}` : ''}`}
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
            ) : (
              <ProjectArt type={project.art} />
            )}
          </div>
          <div className="absolute left-4 top-4 flex gap-2 md:left-5 md:top-5">
            <span className="eyebrow rounded-full border border-white/10 bg-ink-950/60 px-3 py-1.5 text-bone/80 backdrop-blur-md">
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
            <p className="mt-1 text-sm text-mute">{project.client ?? project.description}</p>
          </div>
          {project.href && (
            <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-full border border-white/10 text-bone/60 transition-all duration-500 ease-premium group-hover:border-gold/50 group-hover:text-gold">
              <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:rotate-45" />
            </span>
          )}
        </div>
      </article>
    </Wrapper>
  )
}

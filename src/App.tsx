import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion'
import { useEffect } from 'react'
import { Toast } from './components/Toast'
import type { SceneId } from './config/mascot'
import { MascotDock } from './mascot/MascotDock'
import { ProjectSummary } from './project/ProjectSummary'
import { QuoteDialog } from './quote/QuoteDialog'
import { Closing } from './sections/Closing'
import { DirectionLab } from './sections/DirectionLab'
import { Footer } from './sections/Footer'
import { Header } from './sections/Header'
import { Hero } from './sections/Hero'
import { Process } from './sections/Process'
import { Solutions } from './sections/Solutions'
import { WorldExperiences } from './sections/WorldExperiences'
import { WorldImages } from './sections/WorldImages'
import { WorldMotion } from './sections/WorldMotion'
import { WorldsIntro } from './sections/WorldsIntro'
import { ProjectProvider } from './state/project'
import { UIProvider, useUI } from './state/ui'

/** Informa ao mascote qual cena está no centro da tela. */
function useSceneTracking() {
  const { setScene } = useUI()
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-scene]'))
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setScene(entry.target.getAttribute('data-scene') as SceneId)
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [setScene])
}

function Page() {
  useSceneTracking()
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-bone focus:px-4 focus:py-2 focus:text-ink-950"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo">
        <Hero />
        <WorldsIntro />
        <WorldImages />
        <WorldMotion />
        <WorldExperiences />
        <DirectionLab />
        <Solutions />
        <Process />
        <Closing />
      </main>
      <Footer />
      <MascotDock />
      <Toast />
      <ProjectSummary />
      <QuoteDialog />
    </>
  )
}

export default function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <ProjectProvider>
          <UIProvider>
            <Page />
          </UIProvider>
        </ProjectProvider>
      </MotionConfig>
    </LazyMotion>
  )
}

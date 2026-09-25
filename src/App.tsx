import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion'
import { StickyCTA } from './components/StickyCTA'
import { Audience } from './sections/Audience'
import { Builder } from './sections/Builder'
import { Ecosystem } from './sections/Ecosystem'
import { FAQ } from './sections/FAQ'
import { FinalCTA } from './sections/FinalCTA'
import { Footer } from './sections/Footer'
import { Hero } from './sections/Hero'
import { Navbar } from './sections/Navbar'
import { Problem } from './sections/Problem'
import { Process } from './sections/Process'
import { Projects } from './sections/Projects'
import { Statement } from './sections/Statement'
import { Systems } from './sections/Systems'
import { Tapes } from './sections/Tapes'

export default function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-gold-300 focus:px-4 focus:py-2 focus:text-ink-950"
        >
          Pular para o conteúdo
        </a>
        <Navbar />
        <main id="conteudo">
          <Hero />
          <Tapes />
          <Problem />
          <Ecosystem />
          <Systems />
          <Builder />
          <Process />
          <Projects />
          <Statement />
          <Audience />
          <FAQ />
          <FinalCTA />
        </main>
        <Footer />
        <StickyCTA />
      </MotionConfig>
    </LazyMotion>
  )
}

import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { BottomNavigation } from './BottomNavigation'
import { useEffect } from 'react'

/** Casca das telas principais: conteúdo + navegação inferior + transição de página. */
export function AppShell() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div className="relative mx-auto min-h-dvh max-w-lg overflow-x-clip">
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="pb-nav"
      >
        <Outlet />
      </motion.main>
      <BottomNavigation />
    </div>
  )
}

/** Casca de telas secundárias (sem navegação inferior). */
export function PlainShell() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div className="relative mx-auto min-h-dvh max-w-lg overflow-x-clip">
      <motion.main
        key={pathname}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="pb-10"
      >
        <Outlet />
      </motion.main>
    </div>
  )
}

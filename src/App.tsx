import { lazy, Suspense, useCallback, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig } from 'motion/react'
import { useAppStore } from '@/store/useAppStore'
import { AppShell, PlainShell } from '@/components/layout/AppShell'
import { CelebrationLayer } from '@/components/domain/Celebration'
import { LoadingState } from '@/components/ui/States'
import Splash from '@/pages/Splash'
import Home from '@/pages/Home'

// Telas carregadas sob demanda (code-splitting por rota)
const Onboarding = lazy(() => import('@/pages/Onboarding'))
const Login = lazy(() => import('@/pages/Login'))
const TreinoList = lazy(() => import('@/pages/Treino').then((m) => ({ default: m.TreinoList })))
const TreinoDetail = lazy(() => import('@/pages/Treino').then((m) => ({ default: m.TreinoDetail })))
const ModoTreino = lazy(() => import('@/pages/ModoTreino'))
const Progresso = lazy(() => import('@/pages/Progresso'))
const Ranking = lazy(() => import('@/pages/Ranking'))
const Desafios = lazy(() => import('@/pages/Desafios'))
const Conquistas = lazy(() => import('@/pages/Conquistas'))
const Metas = lazy(() => import('@/pages/Metas'))
const Agenda = lazy(() => import('@/pages/Agenda'))
const CheckIn = lazy(() => import('@/pages/CheckIn'))
const AIPage = lazy(() => import('@/pages/AI'))
const Perfil = lazy(() => import('@/pages/Perfil'))
const Plano = lazy(() => import('@/pages/Plano'))
const Notificacoes = lazy(() => import('@/pages/Notificacoes'))
const Comunidade = lazy(() => import('@/pages/Comunidade'))
const Admin = lazy(() => import('@/pages/admin/Admin'))

/** Exige sessão (demo por enquanto). Sem sessão: onboarding (1º acesso) ou login. */
function RequireSession() {
  const session = useAppStore((s) => s.session)
  const onboardingSeen = useAppStore((s) => s.onboardingSeen)
  const location = useLocation()
  if (!session) return <Navigate to={onboardingSeen ? '/login' : '/onboarding'} replace state={{ from: location.pathname }} />
  return <Outlet />
}

function PublicOnly() {
  const session = useAppStore((s) => s.session)
  return session ? <Navigate to="/" replace /> : <Outlet />
}

const PageFallback = () => (
  <div className="mx-auto max-w-lg px-4 pt-24">
    <LoadingState rows={4} />
  </div>
)

export default function App() {
  const [splash, setSplash] = useState(true)
  const done = useCallback(() => setSplash(false), [])

  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AnimatePresence>{splash && <Splash key="splash" onDone={done} />}</AnimatePresence>
        {!splash && (
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route element={<PublicOnly />}>
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/login" element={<Login />} />
              </Route>

              <Route element={<RequireSession />}>
                <Route element={<AppShell />}>
                  <Route index element={<Home />} />
                  <Route path="/treino" element={<TreinoList />} />
                  <Route path="/treino/:id" element={<TreinoDetail />} />
                  <Route path="/progresso" element={<Progresso />} />
                  <Route path="/ranking" element={<Ranking />} />
                  <Route path="/perfil" element={<Perfil />} />
                  <Route path="/desafios" element={<Desafios />} />
                  <Route path="/conquistas" element={<Conquistas />} />
                  <Route path="/metas" element={<Metas />} />
                  <Route path="/agenda" element={<Agenda />} />
                  <Route path="/plano" element={<Plano />} />
                  <Route path="/notificacoes" element={<Notificacoes />} />
                  <Route path="/comunidade" element={<Comunidade />} />
                </Route>
                <Route element={<PlainShell />}>
                  <Route path="/treino/:id/modo" element={<ModoTreino />} />
                  <Route path="/checkin" element={<CheckIn />} />
                  <Route path="/ai" element={<AIPage />} />
                </Route>
              </Route>

              {/* Estrutura futura — bloqueada sem autenticação real */}
              <Route path="/admin/*" element={<Admin />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        )}
        <CelebrationLayer />
      </BrowserRouter>
    </MotionConfig>
  )
}

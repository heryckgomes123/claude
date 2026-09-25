import { lazy, Suspense, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSession } from './lib/session';
import { AppShell } from './layout/AppShell';
import { TavernScene } from './scene/TavernScene';
import { Loader } from './components/ui';
import { Splash } from './pages/Splash';
import Entrance from './pages/Entrance';
import Home from './pages/Home';
import Play from './pages/Play';
import Room from './pages/Room';
import Game from './pages/Game';
import Clubs from './pages/Clubs';
import ClubDetail from './pages/ClubDetail';
import ClubCreate from './pages/ClubCreate';
import Profile from './pages/Profile';
import PlayerPublic from './pages/PlayerPublic';
import Ranking from './pages/Ranking';
import Achievements from './pages/Achievements';
import Notifications from './pages/Notifications';
import Tutorial from './pages/Tutorial';
import SettingsPage from './pages/Settings';
import NotFound from './pages/NotFound';

// Áreas de gestão carregadas sob demanda (menor bundle inicial para jogadores)
const ClubAdmin = lazy(() => import('./pages/club-admin/ClubAdmin'));
const Agent = lazy(() => import('./pages/Agent'));
const SuperAdmin = lazy(() => import('./pages/admin/SuperAdmin'));

function introWanted() {
  const params = new URLSearchParams(location.search);
  if (params.has('skipIntro')) return false;
  try {
    if (sessionStorage.getItem('miuda.skipIntro')) return false;
  } catch {
    /* ignore */
  }
  return true;
}

export function App() {
  const { token, me, loading } = useSession();
  const [intro, setIntro] = useState(introWanted);
  const loc = useLocation();

  if (intro) return <Splash onEnter={() => setIntro(false)} />;

  if (!token) {
    return (
      <>
        <TavernScene mood="dim" />
        <div className="entrance-wrap scene-enter">
          <Entrance />
        </div>
      </>
    );
  }

  if (loading || !me) {
    return (
      <>
        <TavernScene mood="dim" />
        <div className="entrance-wrap" style={{ display: 'grid', placeItems: 'center' }}>
          <Loader label="Abrindo as portas da Toca…" />
        </div>
      </>
    );
  }

  if (!me.tutorialDone && loc.pathname !== '/tutorial') return <Navigate to="/tutorial?primeiro=1" replace />;

  return (
    <AppShell>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jogar" element={<Play />} />
          <Route path="/sala/:code" element={<Room />} />
          <Route path="/partida/:id" element={<Game />} />
          <Route path="/clubes" element={<Clubs />} />
          <Route path="/clubes/novo" element={<ClubCreate />} />
          <Route path="/clubes/:id" element={<ClubDetail />} />
          <Route path="/clubes/:id/admin/*" element={<ClubAdmin />} />
          <Route path="/agente" element={<Agent />} />
          <Route path="/admin/*" element={me.roles.includes('SUPER_ADMIN') ? <SuperAdmin /> : <Navigate to="/" replace />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/jogador/:username" element={<PlayerPublic />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/conquistas" element={<Achievements />} />
          <Route path="/notificacoes" element={<Notifications />} />
          <Route path="/tutorial" element={<Tutorial />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

/**
 * Moldura do app: barra de recursos (perfil, Miúdas, diamantes, pontos,
 * vidas, notificações), trilho lateral no desktop e navegação inferior no
 * mobile. Itens administrativos aparecem conforme o papel do jogador.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Bell, BookOpen, Crown, Dice5, Handshake, Home, LayoutDashboard, Settings, Shield, Trophy, Users, Medal, Maximize, Minimize } from 'lucide-react';
import { useMe } from '../lib/session';
import { Portrait } from '../components/Portrait';
import { DiamondGem, MiudaCoin, PointsSeal } from '../components/Icon';
import { Lives, Countdown } from '../components/ui';
import { compact, fmt } from '../lib/format';
import { Medallion } from '../brand/Logo';
import { TavernScene, type SceneMood } from '../scene/TavernScene';
import { enterFullscreen, exitFullscreen, isFullscreen, isStandalone, canFullscreen } from '../lib/fullscreen';
import { sfx } from '../lib/sound';

function useBump(value: number) {
  const prev = useRef(value);
  const [bump, setBump] = useState(false);
  useEffect(() => {
    if (value !== prev.current) {
      if (value > prev.current) sfx.coin();
      prev.current = value;
      setBump(true);
      const t = setTimeout(() => setBump(false), 650);
      return () => clearTimeout(t);
    }
  }, [value]);
  return bump ? 'bump' : '';
}

function FullscreenButton() {
  const [fs, setFs] = useState(isFullscreen());
  useEffect(() => {
    const on = () => setFs(isFullscreen());
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  if (isStandalone() || !canFullscreen()) return null;
  return (
    <button className="icon-btn hide-mobile" aria-label={fs ? 'Sair da tela cheia' : 'Tela cheia'} onClick={() => (fs ? exitFullscreen() : enterFullscreen())}>
      {fs ? <Minimize size={18} /> : <Maximize size={18} />}
    </button>
  );
}

export function TopBar() {
  const me = useMe();
  const bumpM = useBump(me.miudas);
  const bumpD = useBump(me.diamonds);
  return (
    <header className="topbar">
      <Link to="/" className="brand-mini row gap-2" aria-label="A Toca" style={{ marginRight: 8 }}>
        <Medallion size={36} glow={false} />
      </Link>
      <Link to="/perfil" className="topbar-player" aria-label="Meu perfil">
        <Portrait avatar={me.avatar} frame={me.frame} size={42} level={me.level} />
        <span className="who">
          <b className="truncate">{me.displayName}</b>
          <span className="row gap-1">
            <Lives lives={me.lives} max={me.maxLives} size={13} />
            {me.nextLifeAt && (
              <span className="t-xs t-dim">
                <Countdown to={me.nextLifeAt} />
              </span>
            )}
          </span>
        </span>
      </Link>
      <div className="resources">
        <Link to="/perfil?aba=extrato" className={`res ${bumpM}`} aria-label={`${fmt(me.miudas)} Miúdas`}>
          <MiudaCoin size={20} />
          {compact(me.miudas)}
        </Link>
        <Link to="/perfil?aba=relicario" className={`res ${bumpD}`} aria-label={`${fmt(me.diamonds)} diamantes`} style={{ color: 'var(--c-diamond)' }}>
          <DiamondGem size={18} />
          {compact(me.diamonds)}
        </Link>
        <Link to="/ranking" className="res res--pts" aria-label={`${fmt(me.points)} pontos`}>
          <PointsSeal size={18} />
          {compact(me.points)}
        </Link>
      </div>
      <div className="topbar-actions">
        <FullscreenButton />
        <Link to="/notificacoes" className="icon-btn" aria-label={`Notificações${me.unreadNotifications ? `: ${me.unreadNotifications} novas` : ''}`}>
          <Bell size={18} />
          {me.unreadNotifications > 0 && <span className="dot">{me.unreadNotifications > 9 ? '9+' : me.unreadNotifications}</span>}
        </Link>
      </div>
    </header>
  );
}

function NavItem({ to, icon, label, end, play }: { to: string; icon: ReactNode; label: string; end?: boolean; play?: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `navlink ${play ? 'navlink--play' : ''} ${isActive ? 'active' : ''}`} onClick={() => sfx.click()}>
      {play ? <span className="play-orb">{icon}</span> : icon}
      <span>{label}</span>
    </NavLink>
  );
}

export function Rail() {
  const me = useMe();
  const adminClubs = me.clubs.filter((c) => c.role === 'owner' || c.role === 'admin');
  return (
    <nav className="rail" aria-label="Navegação principal">
      <NavItem to="/" end icon={<Home size={22} />} label="A Toca" />
      <NavItem to="/jogar" icon={<Dice5 size={24} />} label="Jogar" play />
      <NavItem to="/clubes" icon={<Shield size={22} />} label="Clubes" />
      <NavItem to="/ranking" icon={<Trophy size={22} />} label="Ranking" />
      <NavItem to="/conquistas" icon={<Medal size={22} />} label="Conquistas" />
      <NavItem to="/tutorial" icon={<BookOpen size={22} />} label="Tutorial" />
      <NavItem to="/perfil" icon={<Users size={22} />} label="Perfil" />
      <NavItem to="/configuracoes" icon={<Settings size={22} />} label="Ajustes" />
      {(adminClubs.length > 0 || me.roles.includes('AGENT') || me.roles.includes('SUPER_ADMIN')) && <div className="rail-group">Gestão</div>}
      {adminClubs.map((c) => (
        <NavItem key={c.id} to={`/clubes/${c.id}/admin`} icon={<Crown size={22} />} label={adminClubs.length > 1 ? c.name : 'Meu Clube'} />
      ))}
      {me.roles.includes('AGENT') && <NavItem to="/agente" icon={<Handshake size={22} />} label="Agente" />}
      {me.roles.includes('SUPER_ADMIN') && <NavItem to="/admin" icon={<LayoutDashboard size={22} />} label="Comando" />}
    </nav>
  );
}

export function BottomNav() {
  return (
    <nav className="bottomnav" aria-label="Navegação principal">
      <NavItem to="/" end icon={<Home size={22} />} label="Toca" />
      <NavItem to="/clubes" icon={<Shield size={22} />} label="Clubes" />
      <NavItem to="/jogar" icon={<Dice5 size={28} />} label="Jogar" play />
      <NavItem to="/ranking" icon={<Trophy size={22} />} label="Ranking" />
      <NavItem to="/perfil" icon={<Users size={22} />} label="Perfil" />
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const immersive = loc.pathname.startsWith('/partida/');
  const mood: SceneMood = loc.pathname === '/' ? 'home' : immersive ? 'dark' : 'dim';
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [loc.pathname]);
  return (
    <>
      <TavernScene mood={mood} />
      <div className="app" data-immersive={immersive || undefined}>
        <TopBar />
        {!immersive && <Rail />}
        <main className="main" ref={mainRef} id="main">
          {children}
        </main>
        {!immersive && <BottomNav />}
      </div>
    </>
  );
}

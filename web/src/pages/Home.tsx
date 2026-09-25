/**
 * A TOCA — página inicial do jogador (visual de referência do produto).
 * Cabeçalho com retrato, nível e VIP · faixa de recursos · carteira ·
 * cartões ilustrados de clube · cartões de jogo (bot, sala, código) ·
 * mesas acesas e o burburinho da taverna.
 */
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Bell, ChevronRight, DoorOpen, Eye, EyeOff, Flame, Gamepad2, Lock, Megaphone, QrCode, Settings, Sparkles, Trophy, Medal, Table2, Crown, Handshake, LayoutDashboard } from 'lucide-react';
import { get } from '../lib/api';
import { useMe } from '../lib/session';
import { Portrait } from '../components/Portrait';
import { Badge, Countdown, Lives, Panel, PanelTitle, SectionTitle, Skeleton } from '../components/ui';
import { DiamondGem, LetterSeal, LevelShield, MiudaCoin, PointsCrest } from '../components/Icon';
import { ActivityFeed, BotSetupModal, CreateRoomModal, JoinCodeModal, TableCard } from '../components/game-ui';
import { compact, fmt } from '../lib/format';
import { sfx } from '../lib/sound';
import { vipTier } from '../../../shared/catalog';
import type { RoomDto, TableDto } from '../lib/types';

interface HomeData {
  activity: any[];
  online: number;
  liveGames: number;
  top: { position: number; username: string; name: string; avatar: string; frame: string; points: number; level: number }[];
  activeGame: { id: string; kind: string; name: string } | null;
  tables: TableDto[];
  rooms: RoomDto[];
}

function HideableValue({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem('miuda.hideWallet') === '1';
    } catch {
      return false;
    }
  });
  const toggle = () => {
    setHidden((h) => {
      try {
        localStorage.setItem('miuda.hideWallet', h ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !h;
    });
  };
  return (
    <>
      <button className="wallet-eye" onClick={toggle} aria-label={hidden ? 'Mostrar saldo' : 'Esconder saldo'}>
        {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
      <div className="wallet-value t-num">{hidden ? 'M$ ••••••' : children}</div>
    </>
  );
}

export default function Home() {
  const me = useMe();
  const nav = useNavigate();
  const [modal, setModal] = useState<'bot' | 'room' | 'code' | null>(null);
  const q = useQuery({ queryKey: ['home'], queryFn: () => get<HomeData>('/home'), refetchInterval: 8000 });
  const d = q.data;
  const vip = vipTier(me.level);
  const adminClubs = me.clubs.filter((c) => c.role === 'owner' || c.role === 'admin');
  const go = (fn: () => void) => () => {
    sfx.click();
    fn();
  };

  return (
    <div className="page home2">
      {/* Cabeçalho do jogador */}
      <header className="h2-head">
        <Link to="/perfil" className="h2-portrait" aria-label="Meu perfil">
          <Portrait avatar={me.avatar} frame={me.frame} size={96} />
        </Link>
        <div className="h2-who">
          <span className="h2-welcome">Bem-vindo de volta,</span>
          <h1 className="h2-name">{me.displayName}</h1>
          <div className="h2-badges">
            <span className="h2-pill">
              <LevelShield level={me.level} size={26} />
              Nível {me.level}
            </span>
            <span className="h2-pill h2-pill--vip" style={{ ['--vip' as any]: vip.color }}>
              <PointsCrest size={18} />
              {vip.label}
            </span>
          </div>
        </div>
        <nav className="h2-icons" aria-label="Atalhos">
          <Link to="/notificacoes" className="h2-icon" aria-label={`Notificações${me.unreadNotifications ? `: ${me.unreadNotifications} novas` : ''}`}>
            <Bell size={28} strokeWidth={1.6} />
            {me.unreadNotifications > 0 && <span className="h2-dot">{me.unreadNotifications > 9 ? '9+' : me.unreadNotifications}</span>}
          </Link>
          <Link to="/notificacoes?filtro=convites" className="h2-icon" aria-label={`Convites${me.unreadInvites ? `: ${me.unreadInvites}` : ''}`}>
            <LetterSeal size={30} />
            {me.unreadInvites > 0 && <span className="h2-dot">{me.unreadInvites}</span>}
          </Link>
          <Link to="/configuracoes" className="h2-icon" aria-label="Configurações">
            <Settings size={28} strokeWidth={1.6} />
          </Link>
        </nav>
      </header>

      {me.announcement && (
        <div className="callout" style={{ marginBottom: 14 }}>
          <Megaphone size={18} color="var(--c-amber)" /> {me.announcement}
        </div>
      )}

      {/* Recursos */}
      <section className="h2-resources frame" aria-label="Recursos">
        <div className="h2-res">
          <MiudaCoin size={40} />
          <div>
            <span className="h2-label">Miúdas</span>
            <b className="t-num">{compact(me.miudas)}</b>
          </div>
          <Link to="/perfil?aba=extrato" className="h2-plus" aria-label="Carteira de Miúdas">
            +
          </Link>
        </div>
        <div className="h2-res">
          <DiamondGem size={38} />
          <div>
            <span className="h2-label">Diamantes</span>
            <b className="t-num">{fmt(me.diamonds)}</b>
          </div>
          <Link to="/perfil?aba=relicario" className="h2-plus" aria-label="Relicário de diamantes">
            +
          </Link>
        </div>
        <div className="h2-res">
          <PointsCrest size={40} />
          <div>
            <span className="h2-label">Pontos</span>
            <b className="t-num">{fmt(me.points)}</b>
          </div>
          <Link to="/conquistas" className="h2-plus" aria-label="Ganhar pontos com conquistas">
            +
          </Link>
        </div>
      </section>

      {/* Carteira */}
      <section className="h2-wallet-row">
        <div className="h2-wallet frame">
          <div className="row gap-2">
            <span className="h2-label h2-label--lg">Sua carteira</span>
            <HideableValue>M$ {fmt(me.miudas)}</HideableValue>
          </div>
          <span className="h2-sub">Miúdas disponíveis</span>
          <div className="h2-lives">
            <Lives lives={me.lives} max={me.maxLives} size={16} />
            {me.nextLifeAt ? (
              <span>
                +1 vida em <Countdown to={me.nextLifeAt} />
              </span>
            ) : (
              <span>vidas completas</span>
            )}
          </div>
        </div>
        <Link to="/perfil?aba=extrato" className="h2-wallet-btn frame">
          <span className="h2-wallet-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 7.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
              <path d="M4 7.5 15 4.5a1.5 1.5 0 0 1 2 1.4v1.6" />
              <path d="M16 13.5h4" />
            </svg>
          </span>
          Ver carteira
          <ChevronRight size={18} />
        </Link>
      </section>

      {d?.activeGame && (
        <button className="return-banner" onClick={() => nav(`/partida/${d.activeGame!.id}`)}>
          <Flame size={22} />
          <span className="grow">
            <b>Sua mesa espera por você</b>
            <span className="t-small t-muted">{d.activeGame.name} — partida em andamento</span>
          </span>
          <ChevronRight />
        </button>
      )}
      {d?.rooms?.map((r) => (
        <button key={r.id} className="return-banner return-banner--room" onClick={() => nav(`/sala/${r.code}`)}>
          <DoorOpen size={22} />
          <span className="grow">
            <b>{r.name}</b>
            <span className="t-small t-muted">
              Você está na sala · código {r.code} · {r.members.length}/{r.config.maxPlayers}
            </span>
          </span>
          <ChevronRight />
        </button>
      ))}

      {/* Clubes */}
      <section className="h2-big">
        <button className="bigcard bigcard--jade" onClick={go(() => nav('/clubes'))}>
          <span className="bigcard-title">
            <em>Entrar</em>
            em um clube
          </span>
          <span className="bigcard-text">Entre em um clube, participe de ligas e jogue com outros jogadores!</span>
          <span className="bigcard-art" style={{ backgroundImage: 'url(/art/club-join.webp)' }} role="img" aria-label="Entrada da Toca do Javali" />
          <span className="bigcard-go" aria-hidden="true">
            <ArrowRight size={26} />
          </span>
        </button>
        <button className="bigcard bigcard--gold" onClick={go(() => nav('/clubes/novo'))}>
          <span className="bigcard-title">
            <em>Criar</em>
            meu clube
          </span>
          <span className="bigcard-text">Seja o dono! Crie seu clube, convide jogadores e fature com os rakes das mesas!</span>
          <span className="bigcard-art" style={{ backgroundImage: 'url(/art/club-create.webp)' }} role="img" aria-label="Mesa do clube com baú de Miúdas" />
          <span className="bigcard-go" aria-hidden="true">
            <ArrowRight size={26} />
          </span>
        </button>
      </section>

      {/* Jogar */}
      <section className="h2-small">
        <button className="smallcard smallcard--jade" onClick={go(() => setModal('bot'))}>
          <span className="smallcard-art" style={{ backgroundImage: 'url(/art/bot.webp)' }} aria-hidden="true" />
          <span className="smallcard-title">
            Jogar
            <br />
            com bot
          </span>
          <span className="smallcard-text">Treine suas habilidades e aprimore seu jogo!</span>
          <span className="smallcard-btn">
            <Gamepad2 size={16} /> Jogar agora <ChevronRight size={14} />
          </span>
        </button>
        <button className="smallcard smallcard--sapphire" onClick={go(() => setModal('room'))}>
          <span className="smallcard-art" style={{ backgroundImage: 'url(/art/private-room.webp)' }} aria-hidden="true" />
          <span className="smallcard-title">
            Sala
            <br />
            privada
          </span>
          <span className="smallcard-text">Crie sua sala e chame seus amigos!</span>
          <span className="smallcard-btn">
            <Lock size={15} /> Criar sala <ChevronRight size={14} />
          </span>
        </button>
        <button className="smallcard smallcard--amethyst" onClick={go(() => setModal('code'))}>
          <span className="smallcard-art" style={{ backgroundImage: 'url(/art/code.webp)' }} aria-hidden="true" />
          <span className="smallcard-title">
            Entrar
            <br />
            com código
          </span>
          <span className="smallcard-text">Tem um código de sala? Entre e jogue agora!</span>
          <span className="smallcard-btn">
            <QrCode size={15} /> Entrar <ChevronRight size={14} />
          </span>
        </button>
      </section>

      {/* Atalhos secundários */}
      <nav className="h2-shortcuts" aria-label="Mais">
        <Link to="/jogar" className="manage-link">
          <Table2 size={16} /> Todas as mesas
        </Link>
        <Link to="/ranking" className="manage-link">
          <Trophy size={16} /> Ranking
        </Link>
        <Link to="/conquistas" className="manage-link">
          <Medal size={16} /> Conquistas · {me.achievementsUnlocked}
        </Link>
        {adminClubs.map((c) => (
          <Link key={c.id} to={`/clubes/${c.id}/admin`} className="manage-link">
            <Crown size={16} /> Admin · {c.name}
          </Link>
        ))}
        {me.roles.includes('AGENT') && (
          <Link to="/agente" className="manage-link">
            <Handshake size={16} /> Painel do Agente
          </Link>
        )}
        {me.roles.includes('SUPER_ADMIN') && (
          <Link to="/admin" className="manage-link manage-link--gold">
            <LayoutDashboard size={16} /> Central de Comando
          </Link>
        )}
      </nav>

      <SectionTitle>Mesas acesas</SectionTitle>
      <div className="tables-scroller">
        {q.isLoading && [1, 2, 3].map((i) => <Skeleton key={i} h={230} w={260} />)}
        {d?.tables.map((t) => <TableCard key={t.id} t={t} compact />)}
        <Link to="/jogar" className="table-card table-card--more">
          <Sparkles size={26} />
          <b>Ver todas as mesas</b>
        </Link>
      </div>

      <div className="h2-bottom">
        <Panel>
          <PanelTitle
            icon={<Flame size={18} color="var(--c-ember)" />}
            action={
              <Badge tone="ember" live>
                {d?.liveGames ?? 0} ao vivo
              </Badge>
            }
          >
            Na Toca agora
          </PanelTitle>
          <div className="row gap-2 t-small t-muted" style={{ marginBottom: 10 }}>
            <Eye size={14} /> {d?.online ?? '—'} viajantes pela taverna
          </div>
          {q.isLoading ? <Skeleton h={200} /> : <ActivityFeed items={(d?.activity ?? []).slice(0, 8)} />}
        </Panel>
        <Panel>
          <PanelTitle icon={<Trophy size={18} color="var(--c-gold-300)" />} action={<Link to="/ranking" className="t-xs t-up">Ver tudo</Link>}>
            Parede da Fama
          </PanelTitle>
          <ol className="mini-rank">
            {d?.top.map((t) => (
              <li key={t.username}>
                <span className={`rank-pos pos-${t.position}`}>{t.position}</span>
                <Portrait avatar={t.avatar} frame={t.frame} size={34} />
                <Link to={`/jogador/${t.username}`} className="grow truncate" style={{ color: 'var(--c-text)' }}>
                  {t.name}
                </Link>
                <span className="t-num t-small" style={{ color: 'var(--c-gold-300)' }}>
                  {fmt(t.points)}
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <BotSetupModal open={modal === 'bot'} onClose={() => setModal(null)} />
      <CreateRoomModal open={modal === 'room'} onClose={() => setModal(null)} />
      <JoinCodeModal open={modal === 'code'} onClose={() => setModal(null)} />
    </div>
  );
}

/**
 * A TOCA — a home do jogador. Um lugar, não um painel: cartão do viajante
 * sob a luz da lareira, placas de ação entalhadas, mesas ao vivo e o
 * burburinho da taverna.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bot, DoorOpen, Hash, Medal, Shield, Trophy, Flame, Eye, ChevronRight, Megaphone, Sparkles, Crown, Handshake, LayoutDashboard, BookOpen } from 'lucide-react';
import { get, post } from '../lib/api';
import { useMe, useSession } from '../lib/session';
import { Portrait } from '../components/Portrait';
import { Badge, Button, Countdown, CountUp, Lives, Panel, PanelTitle, Progress, SectionTitle, Skeleton } from '../components/ui';
import { DiamondGem, MiudaCoin, PointsSeal, HeartIcon } from '../components/Icon';
import { ActivityFeed, BotSetupModal, CreateRoomModal, JoinCodeModal, TableCard } from '../components/game-ui';
import { fmt } from '../lib/format';
import { useErrorToast } from '../components/Toast';
import { sfx } from '../lib/sound';
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

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'A noite é longa' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Home() {
  const me = useMe();
  const { refresh } = useSession();
  const nav = useNavigate();
  const onError = useErrorToast();
  const [modal, setModal] = useState<'bot' | 'room' | 'code' | null>(null);
  const q = useQuery({ queryKey: ['home'], queryFn: () => get<HomeData>('/home'), refetchInterval: 8000 });
  const d = q.data;
  const adminClubs = me.clubs.filter((c) => c.role === 'owner' || c.role === 'admin');

  const refill = async () => {
    try {
      await post('/lives/refill');
      sfx.coins();
      refresh();
    } catch (e) {
      onError(e);
    }
  };

  const actions = [
    { key: 'bot', label: 'Jogar contra Bot', sub: 'Treino com os bots da casa', icon: <Bot size={30} />, onClick: () => setModal('bot'), hero: true },
    { key: 'room', label: 'Sala Privada', sub: 'Crie e convide amigos', icon: <DoorOpen size={28} />, onClick: () => setModal('room') },
    { key: 'code', label: 'Entrar com Código', sub: 'Tem um convite?', icon: <Hash size={28} />, onClick: () => setModal('code') },
    { key: 'clubs', label: 'Clubes', sub: 'Irmandades da Toca', icon: <Shield size={28} />, onClick: () => nav('/clubes') },
    { key: 'rank', label: 'Ranking', sub: 'Os nomes na parede', icon: <Trophy size={28} />, onClick: () => nav('/ranking') },
    { key: 'ach', label: 'Conquistas', sub: `${me.achievementsUnlocked} desbloqueadas`, icon: <Medal size={28} />, onClick: () => nav('/conquistas') },
    { key: 'tut', label: 'Tutorial', sub: 'Aprenda com Aldren', icon: <BookOpen size={28} />, onClick: () => nav('/tutorial') },
  ];

  return (
    <div className="page home">
      {me.announcement && (
        <div className="callout" style={{ marginBottom: 16 }}>
          <Megaphone size={18} color="var(--c-amber)" /> {me.announcement}
        </div>
      )}

      <div className="home-grid">
        <div className="home-main">
          {/* Cartão do viajante */}
          <Panel className="hero-card" variant="leather" rivets glow>
            <div className="hero-portrait">
              <Portrait avatar={me.avatar} frame={me.frame} size={112} square />
            </div>
            <div className="hero-info">
              <span className="t-xs t-up" style={{ color: 'var(--c-ember)' }}>
                {greeting()}, viajante
              </span>
              <h1 className="hero-name t-gold">{me.displayName}</h1>
              <div className="row gap-2 row-wrap">
                <Badge tone="gold">Nível {me.level}</Badge>
                <span className="t-title t-small" style={{ color: 'var(--c-bronze-300)' }}>
                  {me.title}
                </span>
              </div>
              <div className="hero-xp">
                <Progress value={me.levelProgress.pct} label="Progresso de nível" />
                <span className="t-xs t-dim t-num">
                  {fmt(me.levelProgress.current)} / {fmt(me.levelProgress.needed)} pontos para o nível {me.level + 1}
                </span>
              </div>
            </div>
          </Panel>

          {/* Recursos */}
          <div className="resource-row">
            <Link to="/perfil?aba=extrato" className="res-tile">
              <MiudaCoin size={34} />
              <div>
                <span className="t-xs t-up t-dim">Miúdas</span>
                <b className="t-num">
                  <CountUp value={me.miudas} />
                </b>
              </div>
            </Link>
            <Link to="/perfil?aba=relicario" className="res-tile">
              <DiamondGem size={32} />
              <div>
                <span className="t-xs t-up t-dim">Diamantes</span>
                <b className="t-num" style={{ color: 'var(--c-diamond)' }}>
                  <CountUp value={me.diamonds} />
                </b>
              </div>
            </Link>
            <Link to="/ranking" className="res-tile">
              <PointsSeal size={32} />
              <div>
                <span className="t-xs t-up t-dim">Pontos</span>
                <b className="t-num">
                  <CountUp value={me.points} />
                </b>
              </div>
            </Link>
            <div className="res-tile">
              <HeartIcon size={32} />
              <div>
                <span className="t-xs t-up t-dim">Vidas</span>
                <Lives lives={me.lives} max={me.maxLives} size={18} />
                {me.nextLifeAt ? (
                  <span className="t-xs t-dim">
                    +1 em <Countdown to={me.nextLifeAt} onDone={refresh} />
                  </span>
                ) : (
                  <span className="t-xs t-success">Completas</span>
                )}
              </div>
              {me.lives < me.maxLives && (
                <button className="res-refill" onClick={refill} title={`Recarregar (${me.lifeRefillCost} 💎 por vida)`}>
                  +
                </button>
              )}
            </div>
          </div>

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

          {/* Ações */}
          <div className="signboards">
            {actions.map((a) => (
              <button key={a.key} className={`signboard ${a.hero ? 'signboard--hero' : ''}`} onClick={() => (sfx.click(), a.onClick())}>
                <span className="signboard-icon">{a.icon}</span>
                <span className="signboard-text">
                  <b>{a.label}</b>
                  <span>{a.sub}</span>
                </span>
              </button>
            ))}
          </div>

          {(adminClubs.length > 0 || me.roles.includes('AGENT') || me.roles.includes('SUPER_ADMIN')) && (
            <div className="manage-strip">
              <span className="t-xs t-up t-dim">Gestão</span>
              {adminClubs.map((c) => (
                <Link key={c.id} to={`/clubes/${c.id}/admin`} className="manage-link">
                  <Crown size={16} /> {c.name}
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
            </div>
          )}

          <SectionTitle>Mesas acesas</SectionTitle>
          <div className="tables-scroller">
            {q.isLoading && [1, 2, 3].map((i) => <Skeleton key={i} h={230} w={260} />)}
            {d?.tables.map((t) => <TableCard key={t.id} t={t} compact />)}
            <Link to="/jogar" className="table-card table-card--more">
              <Sparkles size={26} />
              <b>Ver todas as mesas</b>
            </Link>
          </div>
        </div>

        <aside className="home-aside">
          <Panel>
            <PanelTitle
              icon={<Flame size={18} color="var(--c-ember)" />}
              action={
                <span className="row gap-2 t-xs t-dim">
                  <Badge tone="ember" live>
                    {d?.liveGames ?? 0} ao vivo
                  </Badge>
                </span>
              }
            >
              Na Toca agora
            </PanelTitle>
            <div className="row gap-2 t-small t-muted" style={{ marginBottom: 10 }}>
              <Eye size={14} /> {d?.online ?? '—'} viajantes pela taverna
            </div>
            {q.isLoading ? <Skeleton h={200} /> : <ActivityFeed items={d?.activity ?? []} />}
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
          {me.lives < me.maxLives && (
            <Button variant="ghost" block onClick={refill}>
              Recarregar vidas · {me.lifeRefillCost * (me.maxLives - me.lives)} 💎
            </Button>
          )}
        </aside>
      </div>

      <BotSetupModal open={modal === 'bot'} onClose={() => setModal(null)} />
      <CreateRoomModal open={modal === 'room'} onClose={() => setModal(null)} />
      <JoinCodeModal open={modal === 'code'} onClose={() => setModal(null)} />
    </div>
  );
}

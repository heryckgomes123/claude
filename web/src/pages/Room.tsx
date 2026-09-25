/**
 * Lobby de sala/mesa: ENTRAR → AGUARDAR → PARTIDA COMEÇA.
 * Participantes, código para compartilhar, convite por usuário,
 * configurações (anfitrião), contagem regressiva das mesas públicas.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Crown, DoorOpen, Eye, Hourglass, LogOut, Play, Share2, UserPlus, Bot, Users } from 'lucide-react';
import { get, post, patch } from '../lib/api';
import { useMe } from '../lib/session';
import { Badge, Button, Countdown, Emblem, Empty, Field, Input, Loader, Miudas, PageHead, Panel, PanelTitle, Segmented, Slider } from '../components/ui';
import { Portrait } from '../components/Portrait';
import { useErrorToast, useToast } from '../components/Toast';
import type { RoomDto } from '../lib/types';
import { sfx } from '../lib/sound';
import { BOT_DIFFICULTIES } from '../../../shared/bot';

export default function Room() {
  const { code = '' } = useParams();
  const me = useMe();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const [invite, setInvite] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['room', code], queryFn: () => get<RoomDto>(`/rooms/${code}`), refetchInterval: 1500 });
  const room = q.data;
  const offset = room ? room.serverTime - Date.now() : 0;

  // quando a partida começa, todos na sala vão para a mesa
  useEffect(() => {
    if (room?.status === 'playing' && room.game?.id && (room.isMember || room.kind === 'table')) {
      sfx.turn();
      nav(`/partida/${room.game.id}`, { replace: room.isMember });
    }
  }, [room?.status, room?.game?.id, room?.isMember, room?.kind, nav]);

  if (q.isLoading) return <Loader label="Procurando a sala…" />;
  if (q.error || !room) {
    return (
      <div className="page">
        <Empty icon={<DoorOpen size={44} />} title="Sala não encontrada" action={<Button onClick={() => nav('/jogar')}>Voltar para Jogar</Button>}>
          {(q.error as Error)?.message}
        </Empty>
      </div>
    );
  }

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
      qc.invalidateQueries({ queryKey: ['room', code] });
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  };

  const shareUrl = `${location.origin}/sala/${room.code}`;
  const share = async () => {
    const text = `Venha jogar comigo na Toca do Javali! Código: ${room.code}`;
    try {
      if (navigator.share) await navigator.share({ title: 'MIÚDA — convite', text, url: shareUrl });
      else {
        await navigator.clipboard.writeText(`${text} ${shareUrl}`);
        toast('Convite copiado!', 'success');
      }
    } catch {
      /* cancelado */
    }
  };

  const seats = Array.from({ length: room.config.maxPlayers }).map((_, i) => room.members.find((m) => m.seat === i) ?? null);
  const isPrivate = room.kind === 'private';
  const humans = room.members.filter((m) => !m.resident).length;

  return (
    <div className="page">
      <PageHead
        back={{ to: '/jogar', label: 'Jogar' }}
        kicker={isPrivate ? 'Sala privada' : 'Mesa pública'}
        title={room.name}
        subtitle={
          <span className="row gap-2 row-wrap">
            {room.club && (
              <>
                <Emblem icon={room.club.emblem} color={room.club.color} size={18} /> {room.club.name} ·
              </>
            )}
            {room.config.rounds} rodadas · {room.config.maxPlayers} lugares
            {room.spectators > 0 && (
              <>
                · <Eye size={14} /> {room.spectators}
              </>
            )}
          </span>
        }
      />

      <div className="split">
        <div className="col gap-4">
          <Panel variant="wood" rivets className="lobby-table">
            <div className="lobby-status">
              {room.status === 'playing' ? (
                <Badge tone="ember" live>
                  Partida em andamento
                </Badge>
              ) : room.startsAt ? (
                <div className="lobby-countdown">
                  <Hourglass size={20} />
                  <span>A partida começa em</span>
                  <b>
                    <Countdown to={room.startsAt} serverOffset={offset} format="s" />s
                  </b>
                </div>
              ) : (
                <div className="lobby-countdown is-waiting">
                  <Hourglass size={20} className="spin-slow" />
                  <span>{isPrivate ? (room.isHost ? 'Chame os amigos e inicie quando quiser' : 'Aguardando o anfitrião iniciar') : 'Aguardando jogadores'}</span>
                </div>
              )}
            </div>
            <div className="lobby-seats">
              {seats.map((m, i) =>
                m ? (
                  <div key={i} className={`lobby-seat ${m.userId === me.id ? 'is-me' : ''}`}>
                    <Portrait avatar={m.avatar} frame={m.frame} size={64} level={m.level} />
                    <b className="truncate">{m.displayName}</b>
                    <span className="t-xs t-dim">{m.userId === room.hostId && isPrivate ? <><Crown size={11} /> anfitrião</> : m.resident ? 'residente' : 'pronto'}</span>
                  </div>
                ) : (
                  <div key={i} className="lobby-seat is-empty">
                    <div className="seat-empty">{isPrivate && i >= room.members.length && i < room.members.length + room.config.bots ? <Bot size={22} /> : <Users size={20} />}</div>
                    <span className="t-xs t-dim">{isPrivate && i < room.members.length + room.config.bots ? 'bot da casa' : room.config.botFill ? 'livre · bot se vazio' : 'livre'}</span>
                  </div>
                ),
              )}
            </div>
            <div className="lobby-money">
              <div>
                <span className="t-xs t-up t-dim">Entrada</span>
                <Miudas value={room.config.entryFee} size={20} />
              </div>
              <div>
                <span className="t-xs t-up t-dim">Taxa</span>
                <b>{room.config.rakePct}%</b>
              </div>
              <div>
                <span className="t-xs t-up t-dim">Prêmio estimado</span>
                <Miudas value={Math.floor(room.config.entryFee * Math.max(2, room.members.length + (isPrivate ? room.config.bots : 0)) * (1 - room.config.rakePct / 100))} size={20} className="t-gold" />
              </div>
            </div>
          </Panel>

          <div className="row row-wrap gap-2">
            {room.isMember ? (
              <>
                {isPrivate && room.isHost && room.status === 'open' && (
                  <Button variant="primary" size="lg" icon={<Play size={18} />} loading={busy === 'start'} disabled={humans + room.config.bots < 2} onClick={() => act('start', async () => nav(`/partida/${(await post<{ gameId: string }>(`/rooms/${code}/start`)).gameId}`))}>
                    Iniciar partida
                  </Button>
                )}
                <Button variant="ghost" icon={<LogOut size={16} />} loading={busy === 'leave'} onClick={() => act('leave', async () => (await post(`/rooms/${code}/leave`), nav('/jogar')))}>
                  Sair da sala
                </Button>
              </>
            ) : room.status === 'open' ? (
              <Button variant="primary" size="lg" loading={busy === 'join'} onClick={() => act('join', () => post(`/rooms/${code}/join`))}>
                Sentar à mesa
              </Button>
            ) : null}
          </div>
          {isPrivate && room.isMember && humans + room.config.bots < 2 && room.isHost && <p className="t-small t-dim">Adicione bots nas configurações ou espere um amigo para iniciar.</p>}
        </div>

        <aside className="col gap-4">
          {isPrivate && (
            <Panel glow>
              <PanelTitle>Código da sala</PanelTitle>
              <button
                className="room-code"
                onClick={async () => {
                  await navigator.clipboard?.writeText(room.code).catch(() => undefined);
                  toast('Código copiado!', 'success');
                }}
                aria-label="Copiar código"
              >
                {room.code}
                <Copy size={18} />
              </button>
              <Button block icon={<Share2 size={16} />} onClick={share}>
                Compartilhar convite
              </Button>
            </Panel>
          )}
          {room.isMember && room.status === 'open' && (
            <Panel>
              <PanelTitle icon={<UserPlus size={18} />}>Convidar jogador</PanelTitle>
              <form
                className="row gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  act('invite', async () => {
                    const r = await post<{ displayName: string }>(`/rooms/${code}/invite`, { username: invite.trim().toLowerCase() });
                    toast(`Convite enviado para ${r.displayName}.`, 'success');
                    setInvite('');
                  });
                }}
              >
                <Input value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="usuário" aria-label="Usuário" />
                <Button type="submit" loading={busy === 'invite'} disabled={invite.trim().length < 3}>
                  Enviar
                </Button>
              </form>
            </Panel>
          )}
          {isPrivate && room.isHost && room.status === 'open' && <HostSettings room={room} onSaved={() => qc.invalidateQueries({ queryKey: ['room', code] })} />}
        </aside>
      </div>
    </div>
  );
}

function HostSettings({ room, onSaved }: { room: RoomDto; onSaved: () => void }) {
  const onError = useErrorToast();
  const save = async (p: Record<string, unknown>) => {
    try {
      await patch(`/rooms/${room.code}`, p);
      onSaved();
    } catch (e) {
      onError(e);
    }
  };
  const maxBots = room.config.maxPlayers - room.members.length;
  return (
    <Panel>
      <PanelTitle>Configurações</PanelTitle>
      <div className="col gap-4">
        <Field label="Rodadas">
          <Segmented block value={room.config.rounds} onChange={(v) => save({ rounds: v })} options={[3, 5, 7, 9].map((n) => ({ value: n, label: n }))} />
        </Field>
        <Field label={`Lugares: ${room.config.maxPlayers}`}>
          <Slider min={Math.max(2, room.members.length)} max={6} value={room.config.maxPlayers} onChange={(v) => save({ maxPlayers: v, bots: Math.min(room.config.bots, v - room.members.length) })} label="Lugares" />
        </Field>
        <Field label={`Bots da casa: ${Math.min(room.config.bots, maxBots)}`}>
          <Slider min={0} max={Math.max(0, maxBots)} value={Math.min(room.config.bots, maxBots)} onChange={(v) => save({ bots: v })} label="Bots" />
        </Field>
        <Field label="Dificuldade dos bots">
          <Segmented block value={room.config.botDifficulty} onChange={(v) => save({ botDifficulty: v })} options={BOT_DIFFICULTIES.map((b) => ({ value: b.id, label: b.label }))} />
        </Field>
        <Field label="Entrada">
          <Segmented block value={room.config.entryFee} onChange={(v) => save({ entryFee: v })} options={[0, 10, 50, 100, 250].map((n) => ({ value: n, label: n === 0 ? 'Grátis' : n }))} />
        </Field>
      </div>
    </Panel>
  );
}

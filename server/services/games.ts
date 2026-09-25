/**
 * Partidas: início (cobrança de entradas), avanço (bots/tempo), ações dos
 * jogadores, liquidação (prêmios, taxa, comissões, pontos, vidas, conquistas)
 * e a visão que o cliente recebe.
 */
import type { Queryable } from '../db';
import {
  advance, applyAction, createGame, GameRuleError, markLeft, publicState, pushEmote,
  type GameAction, type GameState, type NewPlayer,
} from '../../shared/game';
import type { BotDifficulty } from '../../shared/bot';
import { BOT_NAMES, CHARACTERS, type GlobalSettings } from '../../shared/catalog';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors';
import { roomCode, uid } from '../lib/ids';
import { secureRng } from '../lib/rng';
import { computeSettlement, ESCROW, HOUSE, type SeatInfo } from './settlement';
import { move } from './wallet';
import { notify } from './notifications';
import { logActivity } from './activity';
import { consumeLife, effectiveLives, getUserRow, grantProgress } from './users';
import { applyGameStats } from './stats';

export interface RoomConfig {
  rounds: number;
  entryFee: number;
  maxPlayers: number;
  bots: number;
  botDifficulty: BotDifficulty;
  botFill: boolean;
  category: string;
  rakePct: number;
  countdownSec: number;
  description?: string;
}

export interface RoomRow {
  id: string;
  code: string;
  kind: 'private' | 'table' | 'bot';
  name: string;
  club_id: string | null;
  host_id: string | null;
  status: 'open' | 'playing' | 'closed';
  config: RoomConfig;
  current_game_id: string | null;
  starts_at: Date | null;
  created_at: Date;
}

interface MemberInfo {
  user_id: string;
  seat: number;
  display_name: string;
  avatar: string;
  is_demo: boolean;
}

const pick = <T,>(arr: T[], rng = Math.random) => arr[Math.floor(rng() * arr.length)];

function houseBot(i: number, used: Set<string>, difficulty: BotDifficulty): NewPlayer {
  let name = BOT_NAMES[i % BOT_NAMES.length];
  for (let k = 0; used.has(name) && k < BOT_NAMES.length; k++) name = pick(BOT_NAMES);
  used.add(name);
  return { userId: null, name, avatar: pick(CHARACTERS).id, bot: difficulty };
}

/**
 * Inicia a partida de uma sala: monta os jogadores (humanos, residentes e
 * bots), cobra as entradas (carteira → custódia) e cria o registro da partida.
 * Retorna null se não houver jogadores suficientes após cobranças.
 */
export async function startGameForRoom(q: Queryable, room: RoomRow, now = new Date(), opts: { quiet?: boolean } = {}): Promise<string | null> {
  const members = await q.query<MemberInfo>(
    `SELECT m.user_id, m.seat, u.display_name, u.avatar, u.is_demo FROM room_members m JOIN users u ON u.id = m.user_id
      WHERE m.room_id = $1 ORDER BY m.seat`,
    [room.id],
  );
  const cfg = room.config;
  const fee = room.kind === 'bot' ? 0 : Math.max(0, cfg.entryFee | 0);

  // cobra entradas; quem não tiver saldo é retirado da sala
  const paid: MemberInfo[] = [];
  for (const m of members) {
    if (fee > 0) {
      try {
        await move(q, { from: { type: 'user', id: m.user_id }, to: ESCROW, currency: 'MIUDA', amount: fee, kind: 'ENTRY_FEE', description: `Entrada — ${room.name}` }, { refType: 'room', refId: room.id, at: now });
      } catch {
        await q.query('DELETE FROM room_members WHERE room_id = $1 AND user_id = $2', [room.id, m.user_id]);
        if (!m.is_demo) {
          await notify(q, m.user_id, { kind: 'match', title: 'Saldo insuficiente', body: `Você saiu da ${room.name}: faltaram Miúdas para a entrada.`, link: '/perfil?aba=extrato' });
        }
        continue;
      }
    }
    paid.push(m);
  }

  const players: (NewPlayer & { entry: number })[] = paid.map((m) => ({
    userId: m.user_id,
    name: m.display_name,
    avatar: m.avatar,
    bot: m.is_demo ? (Math.random() < 0.4 ? 'dificil' : 'medio') : null,
    entry: fee,
  }));

  let botsWanted = 0;
  if (room.kind === 'private' || room.kind === 'bot') botsWanted = Math.max(0, Math.min(cfg.bots | 0, cfg.maxPlayers - players.length));
  else if (cfg.botFill) botsWanted = Math.max(0, Math.min(cfg.maxPlayers, Math.max(players.length, 4)) - players.length);
  if (players.length + botsWanted < 2 && (room.kind !== 'table' || cfg.botFill)) botsWanted = 2 - players.length;

  const used = new Set(players.map((p) => p.name));
  for (let i = 0; i < botsWanted; i++) {
    const bot = houseBot(Math.floor(Math.random() * 100) + i, used, cfg.botDifficulty ?? 'medio');
    if (fee > 0) {
      await move(q, { from: HOUSE, to: ESCROW, currency: 'MIUDA', amount: fee, kind: 'HOUSE_ENTRY', description: `Entrada de bot — ${room.name}` }, { refType: 'room', refId: room.id, at: now });
    }
    players.push({ ...bot, entry: fee });
  }

  if (players.length < 2) {
    // devolve as entradas cobradas
    for (const p of players) {
      if (p.userId && p.entry > 0) {
        await move(q, { from: ESCROW, to: { type: 'user', id: p.userId }, currency: 'MIUDA', amount: p.entry, kind: 'REFUND', description: `Reembolso — ${room.name}` }, { refType: 'room', refId: room.id, at: now });
      }
    }
    await q.query(`UPDATE rooms SET starts_at = NULL, updated_at = now() WHERE id = $1`, [room.id]);
    return null;
  }

  // humanos primeiro na ordem de assentos já está garantido; embaralha a ordem de jogo
  const order = players.map((p, i) => ({ p, k: Math.random() + (i === 0 && room.kind === 'bot' ? -1 : 0) })).sort((a, b) => a.k - b.k).map((x) => x.p);
  const state = createGame(order, cfg.rounds, now.getTime());
  const gameId = uid('game');
  await q.query(
    `INSERT INTO games (id, room_id, kind, club_id, status, state, rounds, entry_fee, pot, player_count, bot_difficulty, created_at)
     VALUES ($1,$2,$3,$4,'playing',$5,$6,$7,$8,$9,$10,$11)`,
    [gameId, room.id, room.kind, room.club_id, JSON.stringify(state), cfg.rounds, fee, fee * order.length, order.length, room.kind === 'bot' ? cfg.botDifficulty : null, now],
  );
  for (let i = 0; i < order.length; i++) {
    const p = order[i];
    await q.query(
      `INSERT INTO game_players (game_id, seat, user_id, name, avatar, bot, entry_paid) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [gameId, i, p.userId, p.name, p.avatar, p.bot, p.entry],
    );
  }
  await q.query(`UPDATE rooms SET status = 'playing', current_game_id = $2, starts_at = NULL, updated_at = now() WHERE id = $1`, [room.id, gameId]);
  if (!opts.quiet) {
    for (const p of order) {
      if (p.userId && !p.bot && room.kind !== 'bot') {
        await notify(q, p.userId, { kind: 'match', title: `A partida começou!`, body: `${room.name} — ${order.length} jogadores, ${cfg.rounds} rodadas.`, link: `/partida/${gameId}`, meta: { gameId } });
      }
    }
  }
  return gameId;
}

export async function loadGame(q: Queryable, gameId: string, forUpdate = false) {
  const row = await q.one(`SELECT * FROM games WHERE id = $1${forUpdate ? ' FOR UPDATE' : ''}`, [gameId]);
  if (!row) throw notFound('Partida não encontrada.');
  return row as any;
}

async function saveState(q: Queryable, gameId: string, state: GameState) {
  await q.query(`UPDATE games SET state = $2, version = version + 1 WHERE id = $1`, [gameId, JSON.stringify(state)]);
}

/** Avança a partida até `now` e liquida se terminou. */
export async function tickGame(q: Queryable, row: any, settings: GlobalSettings, now = Date.now()): Promise<GameState> {
  const state = row.state as GameState;
  if (row.status !== 'playing') return state;
  const changed = advance(state, secureRng, now);
  if (changed) await saveState(q, row.id, state);
  if (state.status === 'finished' && !row.settled) await settleGame(q, row, state, settings);
  return state;
}

export async function settleGame(q: Queryable, row: any, state: GameState, settings: GlobalSettings) {
  const room = row.room_id ? ((await q.one('SELECT * FROM rooms WHERE id = $1', [row.room_id])) as RoomRow | null) : null;
  const gps = await q.query<{ seat: number; user_id: string | null; entry_paid: number }>('SELECT seat, user_id, entry_paid FROM game_players WHERE game_id = $1 ORDER BY seat', [row.id]);
  const at = new Date(state.finishedAt ?? Date.now());

  const seats: SeatInfo[] = [];
  for (const gp of gps) {
    let agentId: string | null = null;
    let agentPct: number | null = null;
    let isNpc = false;
    if (gp.user_id) {
      const u = await q.one<{ is_demo: boolean }>('SELECT is_demo FROM users WHERE id = $1', [gp.user_id]);
      isNpc = !!u?.is_demo;
      if (row.club_id) {
        const m = await q.one<{ agent_id: string | null }>(`SELECT agent_id FROM club_members WHERE club_id = $1 AND user_id = $2 AND status = 'active'`, [row.club_id, gp.user_id]);
        if (m?.agent_id) {
          const a = await q.one<{ commission_pct: number | null; settings: any }>(
            `SELECT m.commission_pct, c.settings FROM club_members m JOIN clubs c ON c.id = m.club_id WHERE m.club_id = $1 AND m.user_id = $2 AND m.role = 'agent' AND m.status = 'active'`,
            [row.club_id, m.agent_id],
          );
          if (a) {
            agentId = m.agent_id;
            agentPct = a.commission_pct ?? a.settings?.agentCommissionPct ?? settings.defaultAgentCommissionPct;
          }
        }
      }
    }
    seats.push({ userId: gp.user_id, isNpc, agentId, agentPct, entryPaid: Number(gp.entry_paid) });
  }

  const roomName = room?.name ?? 'Mesa';
  const s = computeSettlement({
    gameId: row.id,
    kind: row.kind,
    roomName,
    rakePct: row.kind === 'bot' ? 0 : (room?.config.rakePct ?? 0),
    clubId: row.club_id,
    botDifficulty: row.bot_difficulty,
    state,
    seats,
    rng: secureRng,
  });

  for (const m of s.movements) await move(q, m, { refType: 'game', refId: row.id, at });

  for (const r of s.seats) {
    await q.query(
      `UPDATE game_players SET score = $3, placement = $4, is_winner = $5, prize = $6, points_earned = $7 WHERE game_id = $1 AND seat = $2`,
      [row.id, r.seat, state.players[r.seat].score, r.placement, r.isWinner, r.prize, r.pointsEarned],
    );
    if (!r.userId || !r.stats) continue;
    const user = await getUserRow(q, r.userId, true);
    const stats = applyGameStats(user.stats, r.stats);
    await q.query('UPDATE users SET stats = $2 WHERE id = $1', [r.userId, JSON.stringify(stats)]);
    if (r.loseLife) await consumeLife(q, r.userId, settings, at.getTime());
    await grantProgress(q, r.userId, r.pointsEarned, settings, at);
    if (!user.is_demo) {
      const parts: string[] = [];
      if (r.prize) parts.push(`+${r.prize} Miúdas`);
      if (r.miudaReward) parts.push(`+${r.miudaReward} Miúdas`);
      if (r.diamonds) parts.push(`+${r.diamonds} 💎`);
      parts.push(`+${r.pointsEarned} pontos`);
      if (r.loseLife) parts.push('-1 vida');
      await notify(q, r.userId, {
        kind: 'match',
        title: r.isWinner ? `Vitória em ${roomName}!` : `${r.placement}º lugar em ${roomName}`,
        body: parts.join(' · '),
        link: `/partida/${row.id}`,
        meta: { gameId: row.id },
        at,
      });
    }
  }

  await q.query(`UPDATE games SET status = 'finished', settled = true, pot = $2, rake = $3, prize = $4, finished_at = $5 WHERE id = $1`, [row.id, s.pot, s.rake, s.prize, at]);

  // atividade pública
  const winnerNames = state.winners.map((w) => state.players[w].name).join(' e ');
  if (row.kind !== 'bot') {
    const w0 = state.winners[0];
    await logActivity(q, {
      kind: 'game_win',
      actorId: state.players[w0]?.userId ?? null,
      clubId: row.club_id,
      message: s.prize > 0 ? `${winnerNames} venceu na mesa ${roomName} e levou ${s.prize} Miúdas.` : `${winnerNames} venceu na mesa ${roomName}.`,
      meta: { gameId: row.id, prize: s.prize },
      at,
    });
  } else if (state.winners.some((w) => state.players[w].userId && !state.players[w].bot) && row.bot_difficulty === 'dificil') {
    await logActivity(q, { kind: 'bot_win', actorId: state.players[state.winners[0]].userId, message: `${winnerNames} derrotou os Mestres da Toca no treino.`, at });
  }

  // sala volta ao estado adequado
  if (room) {
    if (room.kind === 'bot') {
      await q.query(`UPDATE rooms SET status = 'closed', updated_at = now() WHERE id = $1`, [room.id]);
    } else if (room.kind === 'table') {
      await q.query(`DELETE FROM room_members m USING users u WHERE m.room_id = $1 AND u.id = m.user_id AND u.is_demo = false`, [room.id]);
      await q.query(`UPDATE rooms SET status = CASE WHEN status = 'closed' THEN 'closed' ELSE 'open' END, starts_at = NULL, updated_at = now() WHERE id = $1`, [room.id]);
    } else {
      await q.query(`UPDATE rooms SET status = 'open', starts_at = NULL, updated_at = now() WHERE id = $1`, [room.id]);
    }
  }
}

/** Estado da partida para um usuário (avança antes de responder). */
export async function gameView(q: Queryable, gameId: string, userId: string, since: number, settings: GlobalSettings) {
  const row = await loadGame(q, gameId, true);
  const state = await tickGame(q, row, settings);
  const room = row.room_id ? await q.one('SELECT id, code, name, kind, club_id, config, status, host_id FROM rooms WHERE id = $1', [row.room_id]) : null;
  const mySeat = state.players.findIndex((p) => p.userId === userId && !p.bot);
  if (room && mySeat < 0 && room.kind !== 'table') {
    // espectadores só em mesas públicas; salas privadas exigem ser membro
    const member = await q.one('SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2', [room.id, userId]);
    const me = await getUserRow(q, userId);
    if (!member && !me.is_super_admin) throw forbidden('Esta partida é privada.');
  }
  if (room && mySeat < 0) {
    await q.query(
      `INSERT INTO room_viewers (room_id, user_id, last_seen) VALUES ($1,$2,now()) ON CONFLICT (room_id, user_id) DO UPDATE SET last_seen = now()`,
      [room.id, userId],
    );
  }
  let results = null;
  const fresh = await loadGame(q, gameId);
  if (fresh.status === 'finished') {
    const gps = await q.query('SELECT * FROM game_players WHERE game_id = $1 ORDER BY placement, seat', [gameId]);
    results = gps.map((g: any) => ({
      seat: Number(g.seat), userId: g.user_id, name: g.name, avatar: g.avatar, bot: g.bot, score: Number(g.score),
      placement: Number(g.placement), isWinner: g.is_winner, prize: Number(g.prize), points: Number(g.points_earned), entry: Number(g.entry_paid),
    }));
  }
  const spectators = room
    ? Number((await q.one(`SELECT count(*)::int AS n FROM room_viewers WHERE room_id = $1 AND last_seen > now() - interval '20 seconds'`, [room.id]))?.n ?? 0)
    : 0;
  return {
    id: row.id,
    kind: row.kind as 'bot' | 'table' | 'private',
    status: fresh.status as 'playing' | 'finished' | 'aborted',
    room: room ? { id: room.id, code: room.code, name: room.name, kind: room.kind, clubId: room.club_id, rakePct: room.config?.rakePct ?? 0, status: room.status } : null,
    entryFee: Number(row.entry_fee),
    pot: Number(fresh.pot) || Number(row.entry_fee) * state.players.length,
    botDifficulty: row.bot_difficulty,
    mySeat,
    spectators,
    serverTime: Date.now(),
    state: publicState(state, since),
    results,
  };
}
export type GameView = Awaited<ReturnType<typeof gameView>>;

export async function gameAction(q: Queryable, gameId: string, userId: string, action: GameAction | { type: 'emote'; key: string }, settings: GlobalSettings) {
  const row = await loadGame(q, gameId, true);
  if (row.status !== 'playing') throw conflict('A partida já terminou.');
  const state = row.state as GameState;
  const now = Date.now();
  advance(state, secureRng, now);
  const seat = state.players.findIndex((p) => p.userId === userId && !p.bot);
  if (seat < 0) throw forbidden('Você não está nesta partida.');
  if (action.type === 'emote') {
    pushEmote(state, seat, action.key, now);
  } else {
    if (state.players[seat].left) {
      state.players[seat].left = false; // voltou à mesa
      state.players[seat].timeouts = 0;
    }
    try {
      if (state.status === 'playing') applyAction(state, seat, action, secureRng, now);
    } catch (e) {
      if (e instanceof GameRuleError) {
        await saveState(q, row.id, state);
        throw badRequest(e.message, 'GAME_RULE');
      }
      throw e;
    }
    state.players[seat].timeouts = 0;
  }
  await saveState(q, row.id, state);
  if (state.status === 'finished' && !row.settled) await settleGame(q, row, state, settings);
}

export async function forfeitGame(q: Queryable, gameId: string, userId: string, settings: GlobalSettings) {
  const row = await loadGame(q, gameId, true);
  if (row.status !== 'playing') return;
  const state = row.state as GameState;
  const seat = state.players.findIndex((p) => p.userId === userId && !p.bot);
  if (seat < 0) return;
  markLeft(state, seat, Date.now());
  await saveState(q, row.id, state);
  await tickGame(q, { ...row, state }, settings);
}

/** Partida de treino contra bots. Exige ao menos 1 vida. */
export async function startBotGame(
  q: Queryable,
  userId: string,
  input: { difficulty: BotDifficulty; rounds: number; opponents: number },
  settings: GlobalSettings,
) {
  const user = await getUserRow(q, userId, true);
  const active = await q.one<{ id: string }>(
    `SELECT g.id FROM games g JOIN game_players gp ON gp.game_id = g.id WHERE gp.user_id = $1 AND g.kind = 'bot' AND g.status = 'playing' LIMIT 1`,
    [userId],
  );
  if (active) return active.id;
  const lives = effectiveLives(user, settings);
  if (lives.lives <= 0) throw conflict('Você está sem vidas. Espere a recuperação ou recarregue com diamantes.', 'NO_LIVES');
  const difficulty: BotDifficulty = ['facil', 'medio', 'dificil'].includes(input.difficulty) ? input.difficulty : 'medio';
  const rounds = [3, 5, 7].includes(input.rounds) ? input.rounds : 5;
  const opponents = Math.max(1, Math.min(3, input.opponents | 0 || 1));
  const labels = { facil: 'Aprendizes', medio: 'Veteranos', dificil: 'Mestres' } as const;
  const roomId = uid('room');
  const config: RoomConfig = { rounds, entryFee: 0, maxPlayers: opponents + 1, bots: opponents, botDifficulty: difficulty, botFill: false, category: 'taverna', rakePct: 0, countdownSec: 0 };
  await q.query(
    `INSERT INTO rooms (id, code, kind, name, host_id, status, config) VALUES ($1,$2,'bot',$3,$4,'open',$5)`,
    [roomId, `B${roomCode(7)}`, `Treino contra ${labels[difficulty]}`, userId, JSON.stringify(config)],
  );
  await q.query('INSERT INTO room_members (room_id, user_id, seat) VALUES ($1,$2,0)', [roomId, userId]);
  const room = (await q.one('SELECT * FROM rooms WHERE id = $1', [roomId])) as RoomRow;
  const gameId = await startGameForRoom(q, room);
  if (!gameId) throw conflict('Não foi possível iniciar o treino.');
  return gameId;
}

/** Partida ativa do usuário (para "voltar à mesa"). */
export async function activeGameFor(q: Queryable, userId: string) {
  const row = await q.one(
    `SELECT g.id, g.kind, r.name FROM games g JOIN game_players gp ON gp.game_id = g.id LEFT JOIN rooms r ON r.id = g.room_id
      WHERE gp.user_id = $1 AND gp.bot IS NULL AND g.status = 'playing' ORDER BY g.created_at DESC LIMIT 1`,
    [userId],
  );
  if (!row) return null;
  const st = (await q.one('SELECT state FROM games WHERE id = $1', [row.id]))?.state as GameState;
  const me = st.players.find((p) => p.userId === userId);
  if (me?.left) return null;
  return { id: row.id as string, kind: row.kind as string, name: (row.name as string) ?? 'Partida' };
}

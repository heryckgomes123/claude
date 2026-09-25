/**
 * Salas privadas e mesas públicas/de clube.
 *
 * O "tick do mundo" mantém a Toca viva: avança partidas de residentes,
 * dispara contagens regressivas das mesas e reabre mesas após cada partida.
 * Como o backend é serverless, o tick roda de forma preguiçosa quando
 * jogadores consultam o lobby (com limitação de frequência).
 */
import type { Db, Queryable } from '../db';
import { TABLE_CATEGORIES, levelFromPoints, type GlobalSettings } from '../../shared/catalog';
import type { GameState } from '../../shared/game';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors';
import { roomCode, uid } from '../lib/ids';
import { forfeitGame, loadGame, startGameForRoom, tickGame, type RoomConfig, type RoomRow } from './games';
import { notify } from './notifications';
import { logActivity } from './activity';
import { findUserByUsername, getUserRow } from './users';
import { getBalance, move } from './wallet';
import { HOUSE } from './settlement';
import { getClubRow, membership, requireClubRole } from './clubs';
import { getMeta, setMeta } from './settings';

export function sanitizeConfig(input: Partial<RoomConfig>, kind: 'private' | 'table', maxEntry = 100000): RoomConfig {
  const int = (v: unknown, min: number, max: number, d: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d;
  };
  const maxPlayers = int(input.maxPlayers, 2, 6, kind === 'table' ? 6 : 4);
  return {
    rounds: [3, 5, 7, 9].includes(Number(input.rounds)) ? Number(input.rounds) : 5,
    entryFee: int(input.entryFee, 0, maxEntry, 0),
    maxPlayers,
    bots: int(input.bots, 0, maxPlayers - 1, 0),
    botDifficulty: (['facil', 'medio', 'dificil'] as const).includes(input.botDifficulty as any) ? input.botDifficulty! : 'medio',
    botFill: input.botFill ?? kind === 'table',
    category: TABLE_CATEGORIES.some((c) => c.id === input.category) ? input.category! : 'taverna',
    rakePct: int(input.rakePct, 0, 25, kind === 'table' ? 10 : 0),
    countdownSec: int(input.countdownSec, 5, 120, 15),
    description: (input.description ?? '').toString().slice(0, 140),
  };
}

export async function getRoom(q: Queryable, codeOrId: string): Promise<RoomRow> {
  const row = await q.one<RoomRow>('SELECT * FROM rooms WHERE code = $1 OR id = $2', [codeOrId.toUpperCase().trim(), codeOrId]);
  if (!row) throw notFound('Sala não encontrada. Confira o código.');
  return row;
}

export async function roomDto(q: Queryable, room: RoomRow, viewerId: string) {
  const [members, club, spectators, game] = await Promise.all([
    q.query(
      `SELECT m.user_id, m.seat, u.username, u.display_name, u.avatar, u.frame, u.points, u.is_demo FROM room_members m JOIN users u ON u.id = m.user_id
        WHERE m.room_id = $1 ORDER BY m.seat`,
      [room.id],
    ),
    room.club_id ? q.one('SELECT id, name, emblem, color FROM clubs WHERE id = $1', [room.club_id]) : null,
    q.one<{ n: number }>(`SELECT count(*)::int AS n FROM room_viewers WHERE room_id = $1 AND last_seen > now() - interval '20 seconds'`, [room.id]),
    room.current_game_id ? q.one('SELECT id, status, state FROM games WHERE id = $1', [room.current_game_id]) : null,
  ]);
  const st = game?.state as GameState | undefined;
  return {
    id: room.id,
    code: room.code,
    kind: room.kind,
    name: room.name,
    status: room.status,
    config: room.config,
    hostId: room.host_id,
    club: club ? { id: club.id, name: club.name, emblem: club.emblem, color: club.color } : null,
    startsAt: room.starts_at ? new Date(room.starts_at).toISOString() : null,
    members: members.map((m: any) => ({
      userId: m.user_id, seat: Number(m.seat), username: m.username, displayName: m.display_name, avatar: m.avatar, frame: m.frame,
      level: levelFromPoints(Number(m.points)), resident: m.is_demo,
    })),
    spectators: Number(spectators?.n ?? 0),
    game: game ? { id: game.id, status: game.status, round: st?.round ?? 0, rounds: st?.rounds ?? 0, players: st?.players.map((p) => ({ name: p.name, avatar: p.avatar, score: p.score })) ?? [] } : null,
    isMember: members.some((m: any) => m.user_id === viewerId),
    isHost: room.host_id === viewerId,
    serverTime: Date.now(),
  };
}
export type RoomDto = Awaited<ReturnType<typeof roomDto>>;

export async function listTables(q: Queryable, userId: string, opts: { clubId?: string; includeClosed?: boolean } = {}) {
  const params: unknown[] = [];
  const where = [`r.kind = 'table'`];
  if (!opts.includeClosed) where.push(`r.status <> 'closed'`);
  if (opts.clubId) {
    params.push(opts.clubId);
    where.push(`r.club_id = $${params.length}`);
  } else {
    // mesas da Toca + mesas de clubes ativos
    where.push(`(r.club_id IS NULL OR EXISTS (SELECT 1 FROM clubs c WHERE c.id = r.club_id AND c.status = 'active'))`);
  }
  params.push(userId);
  const rows = await q.query(
    `SELECT r.*, c.name AS club_name, c.emblem AS club_emblem, c.color AS club_color,
            (SELECT count(*) FROM room_members m WHERE m.room_id = r.id) AS seated,
            (SELECT count(*) FROM room_viewers v WHERE v.room_id = r.id AND v.last_seen > now() - interval '20 seconds') AS spectators,
            (SELECT status FROM club_members cm WHERE cm.club_id = r.club_id AND cm.user_id = $${params.length}) AS my_club_status,
            g.state AS game_state
       FROM rooms r
       LEFT JOIN clubs c ON c.id = r.club_id
       LEFT JOIN games g ON g.id = r.current_game_id AND g.status = 'playing'
      WHERE ${where.join(' AND ')}
      ORDER BY r.club_id NULLS FIRST, (r.config->>'entryFee')::int`,
    params,
  );
  return rows.map((r: any) => {
    const st = r.game_state as GameState | null;
    const playing = r.status === 'playing' && st;
    const seated = playing ? st!.players.length : Number(r.seated);
    const entry = Number(r.config.entryFee ?? 0);
    const pot = entry * Math.max(seated, 2);
    return {
      id: r.id as string,
      code: r.code as string,
      name: r.name as string,
      status: r.status as 'open' | 'playing' | 'closed',
      category: r.config.category as string,
      description: (r.config.description as string) ?? '',
      entryFee: entry,
      prize: pot - Math.floor((pot * (r.config.rakePct ?? 0)) / 100),
      rakePct: Number(r.config.rakePct ?? 0),
      rounds: Number(r.config.rounds),
      players: seated,
      capacity: Number(r.config.maxPlayers),
      botFill: !!r.config.botFill,
      spectators: Number(r.spectators),
      round: playing ? st!.round : null,
      club: r.club_id ? { id: r.club_id, name: r.club_name, emblem: r.club_emblem, color: r.club_color } : null,
      canJoin: !r.club_id || r.my_club_status === 'active',
      startsAt: r.starts_at ? new Date(r.starts_at).toISOString() : null,
      gameId: playing ? (r.current_game_id as string) : null,
    };
  });
}
export type TableDto = Awaited<ReturnType<typeof listTables>>[number];

export async function createPrivateRoom(q: Queryable, userId: string, input: { name?: string; clubId?: string | null } & Partial<RoomConfig>) {
  await leaveOpenRooms(q, userId);
  const user = await getUserRow(q, userId);
  const cfg = sanitizeConfig(input, 'private');
  cfg.botFill = false;
  if (input.clubId) {
    const m = await membership(q, input.clubId, userId);
    if (!m || m.status !== 'active') throw forbidden('Você precisa ser membro do clube.');
  }
  const balance = await getBalance(q, { type: 'user', id: userId }, 'MIUDA');
  if (cfg.entryFee > balance) throw conflict('Saldo insuficiente para a entrada que você definiu.', 'INSUFFICIENT_FUNDS');
  const id = uid('room');
  let code = roomCode();
  while (await q.one('SELECT 1 FROM rooms WHERE code = $1', [code])) code = roomCode();
  const name = (input.name ?? '').trim().slice(0, 32) || `Sala de ${user.display_name}`;
  await q.query(
    `INSERT INTO rooms (id, code, kind, name, club_id, host_id, status, config) VALUES ($1,$2,'private',$3,$4,$5,'open',$6)`,
    [id, code, name, input.clubId ?? null, userId, JSON.stringify(cfg)],
  );
  await q.query('INSERT INTO room_members (room_id, user_id, seat) VALUES ($1,$2,0)', [id, userId]);
  return code;
}

export async function createTable(q: Queryable, actorId: string, input: { name: string; clubId?: string | null } & Partial<RoomConfig>) {
  const actor = await getUserRow(q, actorId);
  let maxEntry = 100000;
  if (input.clubId) {
    await requireClubRole(q, input.clubId, actorId, ['owner', 'admin']);
    const club = await getClubRow(q, input.clubId);
    maxEntry = club.settings?.maxEntry ?? 5000;
    const count = await q.one<{ n: number }>(`SELECT count(*)::int AS n FROM rooms WHERE club_id = $1 AND kind = 'table' AND status <> 'closed'`, [club.id]);
    if (Number(count?.n) >= (club.settings?.tableLimit ?? 8)) throw conflict('O clube atingiu o limite de mesas abertas.');
    if (input.botFill && club.settings?.allowBots === false) input.botFill = false;
    if (input.rakePct === undefined) input.rakePct = club.settings?.rakePct;
  } else if (!actor.is_super_admin) {
    throw forbidden('Apenas o Super Admin cria mesas da Toca.');
  }
  const name = (input.name ?? '').trim();
  if (name.length < 3 || name.length > 32) throw badRequest('O nome da mesa deve ter entre 3 e 32 caracteres.');
  const cfg = sanitizeConfig(input, 'table', maxEntry);
  const id = uid('room');
  let code = roomCode();
  while (await q.one('SELECT 1 FROM rooms WHERE code = $1', [code])) code = roomCode();
  await q.query(`INSERT INTO rooms (id, code, kind, name, club_id, host_id, status, config) VALUES ($1,$2,'table',$3,$4,$5,'open',$6)`, [
    id, code, name, input.clubId ?? null, actorId, JSON.stringify(cfg),
  ]);
  await logActivity(q, { kind: 'table_create', actorId, clubId: input.clubId ?? null, message: `Nova mesa aberta: ${name}.` });
  return id;
}

export async function updateTable(q: Queryable, roomId: string, actorId: string, input: { name?: string; status?: 'open' | 'closed' } & Partial<RoomConfig>) {
  const room = await getRoom(q, roomId);
  if (room.kind !== 'table') throw badRequest('Apenas mesas podem ser editadas aqui.');
  const actor = await getUserRow(q, actorId);
  let maxEntry = 100000;
  if (room.club_id) {
    await requireClubRole(q, room.club_id, actorId, ['owner', 'admin']);
    maxEntry = (await getClubRow(q, room.club_id)).settings?.maxEntry ?? 5000;
  } else if (!actor.is_super_admin) throw forbidden();
  const cfg = sanitizeConfig({ ...room.config, ...input }, 'table', maxEntry);
  const name = input.name?.trim() || room.name;
  let status = room.status;
  if (input.status === 'closed') {
    if (room.status === 'playing') throw conflict('Aguarde o fim da partida para fechar a mesa.');
    status = 'closed';
    await q.query('DELETE FROM room_members WHERE room_id = $1', [room.id]);
  } else if (input.status === 'open' && room.status === 'closed') status = 'open';
  await q.query('UPDATE rooms SET name = $2, config = $3, status = $4, updated_at = now() WHERE id = $1', [room.id, name, JSON.stringify(cfg), status]);
}

/** Sai de salas abertas (não iniciadas) antes de entrar em outra. */
async function leaveOpenRooms(q: Queryable, userId: string, exceptRoomId?: string) {
  const rows = await q.query<{ room_id: string }>(
    `SELECT m.room_id FROM room_members m JOIN rooms r ON r.id = m.room_id WHERE m.user_id = $1 AND r.status = 'open' AND r.kind <> 'bot' AND r.id <> $2`,
    [userId, exceptRoomId ?? ''],
  );
  for (const r of rows) await leaveRoomInternal(q, await getRoom(q, r.room_id), userId);
}

export async function joinRoom(q: Queryable, code: string, userId: string) {
  const room = await getRoom(q, code);
  if (room.kind === 'bot') throw forbidden('Esta é uma partida de treino individual.');
  if (room.status === 'closed') throw conflict('Esta sala foi encerrada.');
  const already = await q.one('SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2', [room.id, userId]);
  if (already) return room;
  if (room.status === 'playing') throw conflict('A partida já começou. Você pode assistir como espectador.', 'IN_PROGRESS');
  const user = await getUserRow(q, userId);
  if (user.is_demo) throw forbidden();
  if (room.club_id && room.kind === 'table') {
    const m = await membership(q, room.club_id, userId);
    if (!m || m.status !== 'active') throw forbidden('Esta mesa é exclusiva para membros do clube.');
  }
  const busy = await q.one(
    `SELECT g.id FROM games g JOIN game_players gp ON gp.game_id = g.id WHERE gp.user_id = $1 AND gp.bot IS NULL AND g.status = 'playing' AND g.kind <> 'bot'`,
    [userId],
  );
  if (busy) throw conflict('Você já está em uma partida em andamento.', 'BUSY');
  const balance = await getBalance(q, { type: 'user', id: userId }, 'MIUDA');
  if (balance < (room.config.entryFee ?? 0)) throw conflict(`Você precisa de ${room.config.entryFee} Miúdas para esta mesa.`, 'INSUFFICIENT_FUNDS');
  const seats = (await q.query<{ seat: number }>('SELECT seat FROM room_members WHERE room_id = $1 FOR UPDATE', [room.id])).map((r) => Number(r.seat));
  if (seats.length >= room.config.maxPlayers) {
    // mesa cheia: um residente cede o lugar a um jogador de verdade
    const npc = await q.one<{ user_id: string }>(
      `SELECT m.user_id FROM room_members m JOIN users u ON u.id = m.user_id WHERE m.room_id = $1 AND u.is_demo = true ORDER BY m.joined_at DESC LIMIT 1`,
      [room.id],
    );
    if (!npc || room.kind !== 'table') throw conflict('A sala está cheia.', 'FULL');
    await q.query('DELETE FROM room_members WHERE room_id = $1 AND user_id = $2', [room.id, npc.user_id]);
    seats.splice(0, seats.length, ...(await q.query<{ seat: number }>('SELECT seat FROM room_members WHERE room_id = $1', [room.id])).map((r) => Number(r.seat)));
  }
  await leaveOpenRooms(q, userId, room.id);
  let seat = 0;
  while (seats.includes(seat)) seat++;
  await q.query('INSERT INTO room_members (room_id, user_id, seat) VALUES ($1,$2,$3)', [room.id, userId, seat]);
  if (room.kind === 'table') {
    const cd = room.config.countdownSec ?? 15;
    await q.query(`UPDATE rooms SET starts_at = COALESCE(starts_at, now() + ($2 || ' seconds')::interval), updated_at = now() WHERE id = $1`, [room.id, String(cd)]);
    // se uma contagem de residentes já estava perto do fim, dá tempo para outros humanos
    await q.query(`UPDATE rooms SET starts_at = GREATEST(starts_at, now() + interval '8 seconds') WHERE id = $1`, [room.id]);
  }
  if (room.kind === 'private' && room.host_id && room.host_id !== userId) {
    await notify(q, room.host_id, { kind: 'invite_room', title: `${user.display_name} entrou na sua sala`, body: room.name, link: `/sala/${room.code}` });
  }
  return room;
}

async function leaveRoomInternal(q: Queryable, room: RoomRow, userId: string) {
  await q.query('DELETE FROM room_members WHERE room_id = $1 AND user_id = $2', [room.id, userId]);
  const rest = await q.query<{ user_id: string; is_demo: boolean }>(
    'SELECT m.user_id, u.is_demo FROM room_members m JOIN users u ON u.id = m.user_id WHERE m.room_id = $1 ORDER BY m.seat',
    [room.id],
  );
  const humans = rest.filter((r) => !r.is_demo);
  if (room.kind === 'private') {
    if (!humans.length) await q.query(`UPDATE rooms SET status = 'closed', updated_at = now() WHERE id = $1`, [room.id]);
    else if (room.host_id === userId) await q.query('UPDATE rooms SET host_id = $2 WHERE id = $1', [room.id, humans[0].user_id]);
  } else if (room.kind === 'table' && !humans.length) {
    await q.query('UPDATE rooms SET starts_at = NULL WHERE id = $1', [room.id]);
  }
}

export async function leaveRoom(q: Queryable, code: string, userId: string, settings: GlobalSettings) {
  const room = await getRoom(q, code);
  if (room.status === 'playing' && room.current_game_id) {
    await forfeitGame(q, room.current_game_id, userId, settings);
  }
  await leaveRoomInternal(q, room, userId);
}

export async function inviteToRoom(q: Queryable, code: string, actorId: string, username: string) {
  const room = await getRoom(q, code);
  const member = await q.one('SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2', [room.id, actorId]);
  if (!member) throw forbidden('Entre na sala para convidar jogadores.');
  if (room.status === 'closed') throw conflict('Sala encerrada.');
  const target = await findUserByUsername(q, username);
  if (!target || target.is_demo) throw notFound('Jogador não encontrado.');
  if (target.id === actorId) throw badRequest('Você já está na sala.');
  const actor = await getUserRow(q, actorId);
  await notify(q, target.id, {
    kind: 'invite_room',
    title: `Convite para ${room.name}`,
    body: `${actor.display_name} chamou você para uma partida. Código: ${room.code}`,
    link: `/sala/${room.code}`,
    meta: { roomCode: room.code, action: 'room_invite' },
  });
  return { displayName: target.display_name };
}

export async function startRoom(q: Queryable, code: string, actorId: string) {
  const room = await getRoom(q, code);
  if (room.kind !== 'private') throw badRequest('Mesas públicas começam automaticamente.');
  if (room.host_id !== actorId) throw forbidden('Apenas o anfitrião pode iniciar a partida.');
  if (room.status !== 'open') throw conflict('A sala não está aguardando jogadores.');
  const n = await q.one<{ n: number }>('SELECT count(*)::int AS n FROM room_members WHERE room_id = $1', [room.id]);
  if (Number(n?.n) + (room.config.bots ?? 0) < 2) throw conflict('Adicione bots ou aguarde outro jogador — são necessários pelo menos 2.');
  const gameId = await startGameForRoom(q, room);
  if (!gameId) throw conflict('Não foi possível iniciar: jogadores sem saldo para a entrada.');
  return gameId;
}

export async function updatePrivateRoom(q: Queryable, code: string, actorId: string, input: Partial<RoomConfig> & { name?: string }) {
  const room = await getRoom(q, code);
  if (room.kind !== 'private' || room.host_id !== actorId) throw forbidden('Apenas o anfitrião altera a sala.');
  if (room.status !== 'open') throw conflict('Não é possível alterar durante a partida.');
  const cfg = sanitizeConfig({ ...room.config, ...input }, 'private');
  const name = input.name?.trim().slice(0, 32) || room.name;
  await q.query('UPDATE rooms SET config = $2, name = $3, updated_at = now() WHERE id = $1', [room.id, JSON.stringify(cfg), name]);
}

export async function watchRoom(q: Queryable, code: string, userId: string) {
  const room = await getRoom(q, code);
  await q.query(
    `INSERT INTO room_viewers (room_id, user_id, last_seen) VALUES ($1,$2,now()) ON CONFLICT (room_id, user_id) DO UPDATE SET last_seen = now()`,
    [room.id, userId],
  );
}

/* ----------------------------- Tick do mundo ----------------------------- */

/** Processa uma sala: contagem regressiva, início e avanço da partida. */
export async function tickRoom(q: Queryable, roomId: string, settings: GlobalSettings, now = new Date()) {
  // Ordem de travas: partida → sala (igual à liquidação), evitando deadlocks.
  const peek = await q.one<RoomRow>('SELECT * FROM rooms WHERE id = $1', [roomId]);
  if (!peek || peek.status === 'closed') return;
  if (peek.status === 'playing' && peek.current_game_id) {
    const g = await loadGame(q, peek.current_game_id, true);
    await tickGame(q, g, settings, now.getTime());
    return;
  }
  if (peek.kind !== 'table') return;
  const room = await q.one<RoomRow>('SELECT * FROM rooms WHERE id = $1 FOR UPDATE', [roomId]);
  if (!room || room.status !== 'open') return;
  const members = await q.query<{ user_id: string; is_demo: boolean }>(
    'SELECT m.user_id, u.is_demo FROM room_members m JOIN users u ON u.id = m.user_id WHERE m.room_id = $1',
    [room.id],
  );
  const humans = members.filter((m) => !m.is_demo).length;
  if (!room.starts_at) {
    // mesas só de residentes recomeçam sozinhas depois de uma pausa
    if (humans === 0 && members.length >= 2) {
      const pause = 25 + Math.floor(Math.random() * 50);
      await q.query(`UPDATE rooms SET starts_at = now() + ($2 || ' seconds')::interval WHERE id = $1`, [room.id, String(pause)]);
    } else if (humans === 0) {
      await seatResidents(q, room);
    }
    return;
  }
  if (members.length >= room.config.maxPlayers || now.getTime() >= new Date(room.starts_at).getTime()) {
    await startGameForRoom(q, room, now, { quiet: humans === 0 });
  }
}

/** Senta residentes (NPCs) em mesas vazias para a Toca parecer viva. */
async function seatResidents(q: Queryable, room: RoomRow) {
  const want = 2 + Math.floor(Math.random() * Math.max(1, room.config.maxPlayers - 2));
  const params: unknown[] = [room.id, want, room.config.entryFee ?? 0];
  let clubFilter = '';
  if (room.club_id) {
    params.push(room.club_id);
    clubFilter = `AND EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = $4 AND cm.user_id = u.id AND cm.status = 'active')`;
  }
  const npcs = await q.query<{ id: string }>(
    `SELECT u.id FROM users u JOIN wallets w ON w.id = 'user:' || u.id || ':MIUDA'
      WHERE u.is_demo = true AND w.balance >= $3 ${clubFilter}
        AND NOT EXISTS (SELECT 1 FROM room_members m WHERE m.user_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM game_players gp JOIN games g ON g.id = gp.game_id WHERE gp.user_id = u.id AND g.status = 'playing')
      ORDER BY random() LIMIT $2`,
    params,
  );
  let seat = 0;
  for (const n of npcs) {
    await q.query('INSERT INTO room_members (room_id, user_id, seat) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [room.id, n.id, seat++]);
  }
}

/** Mantém residentes com saldo mínimo para continuarem jogando. */
async function stipendResidents(q: Queryable) {
  const poor = await q.query<{ owner_id: string; balance: number }>(
    `SELECT w.owner_id, w.balance FROM wallets w JOIN users u ON u.id = w.owner_id
      WHERE w.owner_type = 'user' AND w.currency = 'MIUDA' AND u.is_demo = true AND w.balance < 400 LIMIT 10`,
  );
  for (const p of poor) {
    await move(q, { from: HOUSE, to: { type: 'user', id: p.owner_id }, currency: 'MIUDA', amount: 1500 - Number(p.balance), kind: 'ADMIN_CREDIT', description: 'Soldo de residente da Toca' });
  }
}

const WORLD_TICK_MS = 4000;
let lastLocalTick = 0;

/** Tick global (limitado). Cada sala roda em sua própria transação curta. */
export async function tickWorld(db: Db, settings: GlobalSettings, force = false) {
  const now = Date.now();
  if (!force && now - lastLocalTick < WORLD_TICK_MS) return;
  lastLocalTick = now;
  if (!force) {
    const claimed = await db.tx(async (q) => {
      const last = await getMeta<number>(q, 'world_tick_at');
      if (last && now - Number(last) < WORLD_TICK_MS) return false;
      await setMeta(q, 'world_tick_at', now);
      return true;
    });
    if (!claimed) return;
  }
  const rooms = await db.query<{ id: string }>(
    `SELECT r.id FROM rooms r WHERE r.status <> 'closed' AND (r.kind = 'table' OR r.status = 'playing')
       AND (r.club_id IS NULL OR EXISTS (SELECT 1 FROM clubs c WHERE c.id = r.club_id AND c.status = 'active'))`,
  );
  for (const r of rooms) {
    try {
      await db.tx((q) => tickRoom(q, r.id, settings));
    } catch (e) {
      console.error('[tick] sala', r.id, e);
    }
  }
  if (Math.random() < 0.2) await db.tx((q) => stipendResidents(q)).catch(() => undefined);
}

export async function myRooms(q: Queryable, userId: string) {
  const rows = await q.query<RoomRow>(
    `SELECT r.* FROM rooms r JOIN room_members m ON m.room_id = r.id WHERE m.user_id = $1 AND r.status <> 'closed' AND r.kind <> 'bot' ORDER BY r.updated_at DESC`,
    [userId],
  );
  return Promise.all(rows.map((r) => roomDto(q, r, userId)));
}

/**
 * Super Admin — visão global do universo MIÚDA e Central de Comando.
 * Todas as funções assumem que a rota já validou o papel SUPER_ADMIN.
 */
import type { Queryable } from '../db';
import { DEFAULT_SETTINGS, levelFromPoints, type GlobalSettings } from '../../shared/catalog';
import { badRequest, notFound } from '../lib/errors';
import { HOUSE, ESCROW } from './settlement';
import { getBalance, mapTx, move } from './wallet';
import { notify } from './notifications';
import { logActivity } from './activity';
import { getUserRow } from './users';
import { saveSettings } from './settings';

const series14 = (expr: string, table: string, where = 'true') => `
  SELECT to_char(d, 'YYYY-MM-DD') AS day,
         (SELECT ${expr} FROM ${table} x WHERE ${where} AND x.created_at >= d AND x.created_at < d + interval '1 day') AS v
    FROM generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') AS d ORDER BY d`;

export async function overview(q: Queryable) {
  const [counts, circulation, house, gamesS, volumeS, usersS, topClubs, liveTables] = await Promise.all([
    q.one(`SELECT
      (SELECT count(*) FROM users WHERE is_demo = false) AS players,
      (SELECT count(*) FROM users WHERE is_demo = true) AS residents,
      (SELECT count(*) FROM users WHERE last_seen_at > now() - interval '15 minutes' AND is_demo = false) AS online,
      (SELECT count(*) FROM clubs WHERE status = 'active') AS clubs,
      (SELECT count(*) FROM rooms WHERE kind = 'table' AND status <> 'closed') AS tables,
      (SELECT count(*) FROM rooms WHERE kind = 'table' AND status = 'playing') AS tables_playing,
      (SELECT count(*) FROM games WHERE status = 'playing') AS games_live,
      (SELECT count(*) FROM games) AS games_total,
      (SELECT count(*) FROM games WHERE created_at > now() - interval '24 hours') AS games_day,
      (SELECT count(*) FROM club_members WHERE role = 'agent' AND status = 'active') AS agents,
      (SELECT count(*) FROM activities WHERE created_at > now() - interval '24 hours') AS activity_day,
      (SELECT count(*) FROM transactions WHERE created_at > now() - interval '24 hours') AS tx_day`),
    q.one(`SELECT
      COALESCE(sum(balance) FILTER (WHERE owner_type = 'user' AND currency = 'MIUDA'),0) AS users_miudas,
      COALESCE(sum(balance) FILTER (WHERE owner_type = 'club' AND currency = 'MIUDA'),0) AS clubs_miudas,
      COALESCE(sum(balance) FILTER (WHERE owner_type = 'user' AND currency = 'DIAMOND'),0) AS users_diamonds
      FROM wallets`),
    getBalance(q, HOUSE, 'MIUDA'),
    q.query(series14('count(*)', 'games')),
    q.query(series14('COALESCE(sum(pot),0)', 'games')),
    q.query(series14('count(*)', 'users', 'x.is_demo = false')),
    q.query(`SELECT c.id, c.name, c.emblem, c.color, COALESCE(sum(g.pot),0) AS volume, count(g.id) AS games
               FROM clubs c LEFT JOIN games g ON g.club_id = c.id AND g.created_at > now() - interval '7 days'
              GROUP BY c.id ORDER BY volume DESC LIMIT 5`),
    q.query(`SELECT r.id, r.name, r.status, r.config, c.name AS club_name,
                    (SELECT count(*) FROM room_members m WHERE m.room_id = r.id) AS seated
               FROM rooms r LEFT JOIN clubs c ON c.id = r.club_id WHERE r.kind = 'table' AND r.status <> 'closed'
              ORDER BY r.status DESC, r.name LIMIT 12`),
  ]);
  const escrow = await getBalance(q, ESCROW, 'MIUDA');
  const n = (k: string) => Number(counts[k]);
  return {
    kpis: {
      players: n('players'), residents: n('residents'), online: n('online'), clubs: n('clubs'), tables: n('tables'),
      tablesPlaying: n('tables_playing'), gamesLive: n('games_live'), gamesTotal: n('games_total'), gamesDay: n('games_day'),
      agents: n('agents'), activityDay: n('activity_day'), txDay: n('tx_day'),
      circulation: Number(circulation.users_miudas), clubsTreasury: Number(circulation.clubs_miudas), diamonds: Number(circulation.users_diamonds),
      house, escrow,
    },
    series: gamesS.map((g: any, i: number) => ({ day: g.day, games: Number(g.v), volume: Number(volumeS[i].v), newPlayers: Number(usersS[i].v) })),
    topClubs: topClubs.map((c: any) => ({ id: c.id, name: c.name, emblem: c.emblem, color: c.color, volume: Number(c.volume), games: Number(c.games) })),
    liveTables: liveTables.map((t: any) => ({ id: t.id, name: t.name, status: t.status, club: t.club_name, seated: Number(t.seated), capacity: Number(t.config.maxPlayers), entryFee: Number(t.config.entryFee) })),
  };
}

export async function listPlayers(q: Queryable, opts: { search?: string; filter?: 'humanos' | 'residentes' | 'todos'; page?: number }) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (opts.filter === 'humanos' || !opts.filter) where.push('u.is_demo = false');
  if (opts.filter === 'residentes') where.push('u.is_demo = true');
  if (opts.search?.trim()) {
    params.push(`%${opts.search.toLowerCase().trim()}%`);
    where.push(`(u.username LIKE $${params.length} OR lower(u.display_name) LIKE $${params.length})`);
  }
  const page = Math.max(0, opts.page ?? 0);
  params.push(25, page * 25);
  const rows = await q.query(
    `SELECT u.*, w.balance AS miudas, d.balance AS diamonds, count(*) OVER() AS total
       FROM users u
       LEFT JOIN wallets w ON w.id = 'user:' || u.id || ':MIUDA'
       LEFT JOIN wallets d ON d.id = 'user:' || u.id || ':DIAMOND'
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY u.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return {
    total: Number(rows[0]?.total ?? 0),
    page,
    players: rows.map((u: any) => ({
      id: u.id, username: u.username, displayName: u.display_name, avatar: u.avatar, frame: u.frame, level: levelFromPoints(Number(u.points)),
      points: Number(u.points), miudas: Number(u.miudas ?? 0), diamonds: Number(u.diamonds ?? 0), status: u.status, isSuperAdmin: u.is_super_admin,
      isGuest: u.is_guest, resident: u.is_demo, games: Number(u.stats?.games ?? 0), wins: Number(u.stats?.wins ?? 0),
      lastSeenAt: new Date(u.last_seen_at).toISOString(), createdAt: new Date(u.created_at).toISOString(),
    })),
  };
}

export async function playerDetail(q: Queryable, userId: string) {
  const u = await getUserRow(q, userId);
  const [miudas, diamonds, txs, clubs] = await Promise.all([
    getBalance(q, { type: 'user', id: userId }, 'MIUDA'),
    getBalance(q, { type: 'user', id: userId }, 'DIAMOND'),
    q.query(`SELECT t.*, NULL AS cp_name FROM transactions t WHERE t.wallet_id IN ($1,$2) ORDER BY t.id DESC LIMIT 25`, [`user:${userId}:MIUDA`, `user:${userId}:DIAMOND`]),
    q.query(`SELECT c.name, m.role, m.status FROM club_members m JOIN clubs c ON c.id = m.club_id WHERE m.user_id = $1`, [userId]),
  ]);
  return {
    id: u.id, username: u.username, displayName: u.display_name, avatar: u.avatar, status: u.status, isSuperAdmin: u.is_super_admin,
    level: levelFromPoints(u.points), points: u.points, miudas, diamonds, stats: u.stats, resident: u.is_demo,
    clubs: clubs.map((c: any) => ({ name: c.name, role: c.role, status: c.status })),
    transactions: txs.map(mapTx),
  };
}

export async function adjustPlayer(
  q: Queryable,
  actorId: string,
  userId: string,
  input: { currency?: 'MIUDA' | 'DIAMOND'; amount?: number; reason?: string; status?: 'active' | 'banned'; superAdmin?: boolean },
) {
  const u = await getUserRow(q, userId, true);
  const actor = await getUserRow(q, actorId);
  if (input.amount) {
    const amt = Math.floor(Number(input.amount));
    if (!Number.isFinite(amt) || amt === 0) throw badRequest('Valor inválido.');
    const reason = (input.reason ?? '').trim().slice(0, 80) || 'Ajuste administrativo';
    const currency = input.currency === 'DIAMOND' ? 'DIAMOND' : 'MIUDA';
    const self = { type: 'user' as const, id: userId };
    if (amt > 0) await move(q, { from: HOUSE, to: self, currency, amount: amt, kind: 'ADMIN_CREDIT', description: reason }, { actorId });
    else await move(q, { from: self, to: HOUSE, currency, amount: -amt, kind: 'ADMIN_DEBIT', description: reason }, { actorId });
    if (!u.is_demo) {
      await notify(q, userId, {
        kind: 'system',
        title: `${amt > 0 ? '+' : ''}${amt} ${currency === 'MIUDA' ? 'Miúdas' : 'diamantes'}`,
        body: `Ajuste da administração da Toca: ${reason}`,
        link: '/perfil?aba=extrato',
      });
    }
    await logActivity(q, { kind: 'admin', actorId, message: `${actor.display_name} ajustou o saldo de ${u.display_name} (${amt > 0 ? '+' : ''}${amt} ${currency === 'MIUDA' ? 'Miúdas' : '💎'}).` });
  }
  if (input.status && input.status !== u.status) {
    if (userId === actorId) throw badRequest('Você não pode banir a si mesmo.');
    await q.query('UPDATE users SET status = $2, token_version = token_version + 1 WHERE id = $1', [userId, input.status]);
    await logActivity(q, { kind: 'admin', actorId, message: `${u.display_name} foi ${input.status === 'banned' ? 'banido' : 'reativado'} pela administração.` });
  }
  if (input.superAdmin !== undefined && input.superAdmin !== u.is_super_admin) {
    if (userId === actorId) throw badRequest('Você não pode alterar o próprio papel.');
    if (u.is_demo) throw badRequest('Residentes não podem ser administradores.');
    await q.query('UPDATE users SET is_super_admin = $2 WHERE id = $1', [userId, input.superAdmin]);
  }
}

export async function listClubsAdmin(q: Queryable) {
  const rows = await q.query(`
    SELECT c.*, o.display_name AS owner_name, w.balance AS treasury,
      (SELECT count(*) FROM club_members m WHERE m.club_id = c.id AND m.status = 'active') AS members,
      (SELECT count(*) FROM club_members m WHERE m.club_id = c.id AND m.status = 'active' AND m.role = 'agent') AS agents,
      (SELECT count(*) FROM rooms r WHERE r.club_id = c.id AND r.kind = 'table' AND r.status <> 'closed') AS tables,
      (SELECT count(*) FROM games g WHERE g.club_id = c.id) AS games,
      (SELECT COALESCE(sum(g.pot),0) FROM games g WHERE g.club_id = c.id) AS volume
    FROM clubs c JOIN users o ON o.id = c.owner_id LEFT JOIN wallets w ON w.id = 'club:' || c.id || ':MIUDA'
    ORDER BY volume DESC`);
  return rows.map((c: any) => ({
    id: c.id, name: c.name, emblem: c.emblem, color: c.color, type: c.type, status: c.status, owner: c.owner_name,
    treasury: Number(c.treasury ?? 0), members: Number(c.members), agents: Number(c.agents), tables: Number(c.tables),
    games: Number(c.games), volume: Number(c.volume), createdAt: new Date(c.created_at).toISOString(),
  }));
}

export async function setClubStatus(q: Queryable, actorId: string, clubId: string, status: 'active' | 'suspended') {
  const c = await q.one('SELECT * FROM clubs WHERE id = $1', [clubId]);
  if (!c) throw notFound('Clube não encontrado.');
  await q.query('UPDATE clubs SET status = $2 WHERE id = $1', [clubId, status]);
  const members = await q.query<{ user_id: string }>(`SELECT user_id FROM club_members WHERE club_id = $1 AND role IN ('owner','admin') AND status = 'active'`, [clubId]);
  for (const m of members) {
    await notify(q, m.user_id, { kind: 'system', title: status === 'suspended' ? `${c.name} foi suspenso` : `${c.name} foi reativado`, body: 'Decisão da administração da Toca.', link: `/clubes/${clubId}` });
  }
  const actor = await getUserRow(q, actorId);
  await logActivity(q, { kind: 'admin', actorId, clubId, message: `${actor.display_name} ${status === 'suspended' ? 'suspendeu' : 'reativou'} o clube ${c.name}.` });
}

export async function listAgents(q: Queryable) {
  const rows = await q.query(`
    SELECT m.user_id, m.club_id, m.commission_pct, u.display_name, u.username, u.avatar, u.frame, c.name AS club_name, c.settings,
      (SELECT count(*) FROM club_members p WHERE p.agent_id = m.user_id AND p.club_id = m.club_id AND p.status = 'active') AS players,
      (SELECT COALESCE(sum(t.amount),0) FROM transactions t WHERE t.wallet_id = 'user:' || m.user_id || ':MIUDA' AND t.kind = 'AGENT_COMMISSION') AS commissions,
      (SELECT COALESCE(sum(gp.entry_paid),0) FROM game_players gp JOIN games g ON g.id = gp.game_id JOIN club_members p ON p.user_id = gp.user_id AND p.club_id = g.club_id
        WHERE p.agent_id = m.user_id AND g.club_id = m.club_id) AS volume
    FROM club_members m JOIN users u ON u.id = m.user_id JOIN clubs c ON c.id = m.club_id
    WHERE m.role = 'agent' AND m.status = 'active' ORDER BY commissions DESC`);
  return rows.map((a: any) => ({
    userId: a.user_id, username: a.username, displayName: a.display_name, avatar: a.avatar, frame: a.frame, clubId: a.club_id, clubName: a.club_name,
    commissionPct: a.commission_pct ?? a.settings?.agentCommissionPct ?? 0, players: Number(a.players), commissions: Number(a.commissions), volume: Number(a.volume),
  }));
}

export async function listAllTables(q: Queryable) {
  const rows = await q.query(`
    SELECT r.*, c.name AS club_name, h.display_name AS host_name,
      (SELECT count(*) FROM room_members m WHERE m.room_id = r.id) AS seated,
      (SELECT count(*) FROM games g WHERE g.room_id = r.id) AS games,
      (SELECT COALESCE(sum(g.pot),0) FROM games g WHERE g.room_id = r.id) AS volume
    FROM rooms r LEFT JOIN clubs c ON c.id = r.club_id LEFT JOIN users h ON h.id = r.host_id
    WHERE r.kind = 'table' OR (r.kind = 'private' AND r.status <> 'closed')
    ORDER BY r.kind DESC, r.status, r.name`);
  return rows.map((r: any) => ({
    id: r.id, code: r.code, kind: r.kind, name: r.name, status: r.status, club: r.club_name, clubId: r.club_id, host: r.host_name,
    category: r.config.category, entryFee: Number(r.config.entryFee), capacity: Number(r.config.maxPlayers), rakePct: Number(r.config.rakePct ?? 0),
    rounds: Number(r.config.rounds), botFill: !!r.config.botFill, seated: Number(r.seated), games: Number(r.games), volume: Number(r.volume),
    gameId: r.status === 'playing' ? r.current_game_id : null,
  }));
}

export async function economy(q: Queryable) {
  const [byKind, series, recent, wallets] = await Promise.all([
    q.query(`SELECT kind, currency, count(*) AS n, COALESCE(sum(amount),0) AS total FROM transactions
              WHERE amount > 0 AND created_at > now() - interval '30 days' GROUP BY kind, currency ORDER BY total DESC`),
    q.query(series14(`COALESCE(sum(amount),0)`, 'transactions', `x.amount > 0 AND x.currency = 'MIUDA' AND x.kind IN ('ENTRY_FEE','HOUSE_ENTRY')`)),
    q.query(`SELECT t.*, COALESCE(u.display_name, c.name, CASE WHEN w.owner_id = 'escrow' THEN 'Custódia das mesas' ELSE 'Tesouro da Toca' END) AS owner_name
               FROM transactions t JOIN wallets w ON w.id = t.wallet_id
               LEFT JOIN users u ON w.owner_type = 'user' AND u.id = w.owner_id
               LEFT JOIN clubs c ON w.owner_type = 'club' AND c.id = w.owner_id
              WHERE t.amount > 0 ORDER BY t.id DESC LIMIT 60`),
    q.one(`SELECT
      COALESCE(sum(balance) FILTER (WHERE owner_type = 'user' AND currency = 'MIUDA'),0) AS users,
      COALESCE(sum(balance) FILTER (WHERE owner_type = 'club' AND currency = 'MIUDA'),0) AS clubs,
      COALESCE(sum(balance) FILTER (WHERE owner_type = 'house' AND owner_id = 'toca' AND currency = 'MIUDA'),0) AS house,
      COALESCE(sum(balance) FILTER (WHERE owner_type = 'house' AND owner_id = 'escrow' AND currency = 'MIUDA'),0) AS escrow,
      COALESCE(sum(balance) FILTER (WHERE currency = 'MIUDA'),0) AS total,
      COALESCE(sum(balance) FILTER (WHERE owner_type = 'user' AND currency = 'DIAMOND'),0) AS diamonds_users,
      COALESCE(sum(balance) FILTER (WHERE owner_type = 'house' AND currency = 'DIAMOND'),0) AS diamonds_house
      FROM wallets`),
  ]);
  const genesis = await q.one(`SELECT COALESCE(sum(amount),0) AS total FROM transactions WHERE kind = 'GENESIS' AND currency = 'MIUDA'`);
  return {
    supply: {
      users: Number(wallets.users), clubs: Number(wallets.clubs), house: Number(wallets.house), escrow: Number(wallets.escrow),
      total: Number(wallets.total), genesis: Number(genesis?.total ?? 0), diamondsUsers: Number(wallets.diamonds_users), diamondsHouse: Number(wallets.diamonds_house),
    },
    byKind: byKind.map((k: any) => ({ kind: k.kind, currency: k.currency, count: Number(k.n), total: Number(k.total) })),
    series: series.map((s: any) => ({ day: s.day, volume: Number(s.v) })),
    recent: recent.map((r: any) => ({ ...mapTx(r), owner: r.owner_name })),
  };
}

export async function updateGlobalSettings(q: Queryable, actorId: string, patch: Partial<GlobalSettings>): Promise<GlobalSettings> {
  const clean: Partial<GlobalSettings> = {};
  const num = (k: keyof GlobalSettings, min: number, max: number) => {
    if (patch[k] === undefined) return;
    const n = Math.round(Number(patch[k]));
    if (!Number.isFinite(n) || n < min || n > max) throw badRequest(`Valor inválido para ${String(k)}.`);
    (clean as any)[k] = n;
  };
  num('welcomeBonus', 0, 100000);
  num('welcomeDiamonds', 0, 1000);
  num('lifeRegenMinutes', 1, 1440);
  num('lifeRefillCostDiamonds', 0, 1000);
  num('defaultRakePct', 0, 25);
  num('defaultAgentCommissionPct', 0, 80);
  num('levelUpDiamonds', 0, 100);
  num('maxTransfer', 1, 10_000_000);
  if (patch.announcement !== undefined) clean.announcement = String(patch.announcement).slice(0, 200);
  if (patch.maintenance !== undefined) clean.maintenance = !!patch.maintenance;
  const saved = await saveSettings(q, clean);
  const actor = await getUserRow(q, actorId);
  await logActivity(q, { kind: 'admin', actorId, message: `${actor.display_name} atualizou as configurações globais da Toca.` });
  if (clean.announcement) {
    const users = await q.query<{ id: string }>(`SELECT id FROM users WHERE is_demo = false AND status = 'active'`);
    for (const u of users) await notify(q, u.id, { kind: 'system', title: 'Aviso da Toca', body: clean.announcement });
  }
  return saved;
}

export { DEFAULT_SETTINGS };

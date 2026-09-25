/**
 * Ranking, transferências entre jogadores, painel de agentes e feed da Toca.
 */
import type { Queryable } from '../db';
import { levelFromPoints, type GlobalSettings } from '../../shared/catalog';
import { badRequest, notFound } from '../lib/errors';
import { listTransactions, move, walletId } from './wallet';
import { notify } from './notifications';
import { logActivity, listActivities } from './activity';
import { bumpStat, findUserByUsername, getUserRow, grantProgress } from './users';

export type RankingType = 'geral' | 'semana' | 'vitorias' | 'clubes';

export async function ranking(q: Queryable, type: RankingType, userId: string) {
  if (type === 'clubes') {
    const rows = await q.query(
      `SELECT c.id, c.name, c.emblem, c.color,
              COALESCE(sum(u.points),0) AS points, count(u.id) AS members,
              (SELECT count(*) FROM games g WHERE g.club_id = c.id) AS games
         FROM clubs c
         LEFT JOIN club_members m ON m.club_id = c.id AND m.status = 'active'
         LEFT JOIN users u ON u.id = m.user_id
        WHERE c.status = 'active'
        GROUP BY c.id ORDER BY points DESC LIMIT 50`,
    );
    return {
      type,
      entries: rows.map((r: any, i: number) => ({
        position: i + 1, id: r.id, name: r.name, emblem: r.emblem, color: r.color,
        points: Number(r.points), members: Number(r.members), games: Number(r.games),
      })),
      me: null,
    };
  }
  let orderExpr = 'u.points';
  let from = 'users u';
  let valueExpr = 'u.points';
  if (type === 'vitorias') {
    orderExpr = `COALESCE((u.stats->>'wins')::int, 0)`;
    valueExpr = orderExpr;
  } else if (type === 'semana') {
    from = `users u JOIN (SELECT gp.user_id, sum(gp.points_earned) AS wk FROM game_players gp JOIN games g ON g.id = gp.game_id
             WHERE g.finished_at > now() - interval '7 days' GROUP BY gp.user_id) w ON w.user_id = u.id`;
    orderExpr = 'w.wk';
    valueExpr = 'w.wk';
  }
  const rows = await q.query(
    `SELECT u.id, u.username, u.display_name, u.avatar, u.frame, u.title, u.points, u.stats, u.is_demo, ${valueExpr} AS value,
            (SELECT c.name FROM club_members m JOIN clubs c ON c.id = m.club_id WHERE m.user_id = u.id AND m.status = 'active' ORDER BY m.joined_at LIMIT 1) AS club
       FROM ${from} WHERE u.status = 'active' AND u.is_super_admin = false
      ORDER BY ${orderExpr} DESC, u.points DESC, u.created_at LIMIT 100`,
  );
  const entries = rows.map((r: any, i: number) => {
    const games = Number(r.stats?.games ?? 0);
    const wins = Number(r.stats?.wins ?? 0);
    return {
      position: i + 1, id: r.id, username: r.username, name: r.display_name, avatar: r.avatar, frame: r.frame, title: r.title,
      level: levelFromPoints(Number(r.points)), points: Number(r.points), value: Number(r.value), games, wins,
      winRate: games ? Math.round((wins / games) * 100) : 0, club: r.club as string | null, resident: r.is_demo,
    };
  });
  const me = entries.find((e) => e.id === userId) ?? null;
  let myPosition: number | null = me?.position ?? null;
  if (!me && type === 'geral') {
    const u = await getUserRow(q, userId);
    const pos = await q.one<{ n: number }>(`SELECT count(*)::int AS n FROM users WHERE points > $1 AND status = 'active' AND is_super_admin = false`, [u.points]);
    myPosition = Number(pos?.n ?? 0) + 1;
  }
  return { type, entries: entries.slice(0, 50), me: myPosition };
}

export async function transfer(q: Queryable, fromId: string, toUsername: string, amount: number, note: string, settings: GlobalSettings) {
  const amt = Math.floor(Number(amount));
  if (!(amt > 0)) throw badRequest('Informe um valor válido.');
  if (amt > settings.maxTransfer) throw badRequest(`O limite por transferência é de ${settings.maxTransfer} Miúdas.`);
  const target = await findUserByUsername(q, toUsername);
  if (!target || target.status !== 'active') throw notFound('Jogador não encontrado.');
  if (target.id === fromId) throw badRequest('Você não pode transferir para si mesmo.');
  const from = await getUserRow(q, fromId);
  if (from.is_guest) throw badRequest('Convidados não podem transferir. Crie sua conta no perfil.');
  const cleanNote = (note ?? '').trim().slice(0, 80);
  await move(
    q,
    {
      from: { type: 'user', id: fromId },
      to: { type: 'user', id: target.id },
      currency: 'MIUDA',
      amount: amt,
      kind: 'TRANSFER_OUT',
      toKind: 'TRANSFER_IN',
      description: `Para ${target.display_name}${cleanNote ? ` — ${cleanNote}` : ''}`,
      toDescription: `De ${from.display_name}${cleanNote ? ` — ${cleanNote}` : ''}`,
    },
    { actorId: fromId, refType: 'transfer' },
  );
  if (!target.is_demo) {
    await notify(q, target.id, { kind: 'transfer', title: `+${amt} Miúdas de ${from.display_name}`, body: cleanNote || 'Transferência recebida.', link: '/perfil?aba=extrato' });
  }
  await bumpStat(q, fromId, 'transfers');
  await grantProgress(q, fromId, 0, settings);
  if (amt >= 1000) await logActivity(q, { kind: 'transfer', actorId: fromId, message: `${from.display_name} enviou uma bolsa de Miúdas para ${target.display_name}.` });
  return { to: target.display_name, amount: amt };
}

/* ------------------------------- Agentes ------------------------------- */

export async function agentDashboard(q: Queryable, agentId: string) {
  const clubs = await q.query(
    `SELECT c.id, c.name, c.emblem, c.color, m.commission_pct, c.settings FROM club_members m JOIN clubs c ON c.id = m.club_id
      WHERE m.user_id = $1 AND m.role = 'agent' AND m.status = 'active'`,
    [agentId],
  );
  const players = await q.query(
    `SELECT m.club_id, u.id, u.username, u.display_name, u.avatar, u.frame, u.points, u.stats, u.last_seen_at, m.joined_at, m.status,
            (SELECT count(*) FROM game_players gp JOIN games g ON g.id = gp.game_id WHERE gp.user_id = u.id AND g.club_id = m.club_id) AS games,
            (SELECT COALESCE(sum(gp.entry_paid),0) FROM game_players gp JOIN games g ON g.id = gp.game_id WHERE gp.user_id = u.id AND g.club_id = m.club_id) AS volume,
            (SELECT COALESCE(sum(gp.prize),0) FROM game_players gp JOIN games g ON g.id = gp.game_id WHERE gp.user_id = u.id AND g.club_id = m.club_id) AS prizes
       FROM club_members m JOIN users u ON u.id = m.user_id
      WHERE m.agent_id = $1 AND m.status IN ('active','invited')
      ORDER BY volume DESC`,
    [agentId],
  );
  const wid = walletId({ type: 'user', id: agentId }, 'MIUDA');
  const [commissions, totals, series] = await Promise.all([
    listTransactions(q, [wid], { kinds: ['AGENT_COMMISSION'], limit: 30 }),
    q.one(
      `SELECT COALESCE(sum(amount),0) AS total,
              COALESCE(sum(amount) FILTER (WHERE created_at > now() - interval '7 days'),0) AS week,
              COALESCE(sum(amount) FILTER (WHERE created_at > now() - interval '30 days'),0) AS month,
              count(*) AS count
         FROM transactions WHERE wallet_id = $1 AND kind = 'AGENT_COMMISSION'`,
      [wid],
    ),
    q.query(
      `SELECT to_char(d, 'YYYY-MM-DD') AS day,
              (SELECT COALESCE(sum(amount),0) FROM transactions t WHERE t.wallet_id = $1 AND t.kind = 'AGENT_COMMISSION' AND t.created_at >= d AND t.created_at < d + interval '1 day') AS amount
         FROM generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') AS d ORDER BY d`,
      [wid],
    ),
  ]);
  return {
    clubs: clubs.map((c: any) => ({ id: c.id, name: c.name, emblem: c.emblem, color: c.color, commissionPct: c.commission_pct ?? c.settings?.agentCommissionPct ?? 0, rakePct: c.settings?.rakePct ?? 0 })),
    players: players.map((p: any) => ({
      clubId: p.club_id, id: p.id, username: p.username, displayName: p.display_name, avatar: p.avatar, frame: p.frame,
      level: levelFromPoints(Number(p.points)), status: p.status, games: Number(p.games), volume: Number(p.volume), prizes: Number(p.prizes),
      wins: Number(p.stats?.wins ?? 0), online: Date.now() - new Date(p.last_seen_at).getTime() < 5 * 60_000,
      joinedAt: p.joined_at ? new Date(p.joined_at).toISOString() : null,
    })),
    commissions,
    totals: { total: Number(totals.total), week: Number(totals.week), month: Number(totals.month), count: Number(totals.count) },
    series: series.map((s: any) => ({ day: s.day, amount: Number(s.amount) })),
  };
}

/* ------------------------------- Feed ------------------------------- */

export async function homeFeed(q: Queryable) {
  const [activity, online, live, top] = await Promise.all([
    listActivities(q, { limit: 12 }),
    q.one<{ n: number }>(`SELECT count(*)::int AS n FROM users WHERE last_seen_at > now() - interval '10 minutes' OR is_demo = true`),
    q.one<{ n: number }>(`SELECT count(*)::int AS n FROM games WHERE status = 'playing'`),
    q.query(`SELECT id, username, display_name, avatar, frame, points FROM users WHERE status = 'active' AND is_super_admin = false ORDER BY points DESC LIMIT 5`),
  ]);
  return {
    activity,
    online: Number(online?.n ?? 0),
    liveGames: Number(live?.n ?? 0),
    top: top.map((t: any, i: number) => ({ position: i + 1, id: t.id, username: t.username, name: t.display_name, avatar: t.avatar, frame: t.frame, points: Number(t.points), level: levelFromPoints(Number(t.points)) })),
  };
}

export async function searchPlayers(q: Queryable, term: string, excludeId: string) {
  const t = `%${term.toLowerCase().trim()}%`;
  if (term.trim().length < 2) return [];
  const rows = await q.query(
    `SELECT id, username, display_name, avatar, frame, points FROM users
      WHERE status = 'active' AND is_demo = false AND id <> $2 AND (username LIKE $1 OR lower(display_name) LIKE $1)
      ORDER BY points DESC LIMIT 10`,
    [t, excludeId],
  );
  return rows.map((r: any) => ({ id: r.id, username: r.username, displayName: r.display_name, avatar: r.avatar, frame: r.frame, level: levelFromPoints(Number(r.points)) }));
}

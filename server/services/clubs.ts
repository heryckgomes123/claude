/**
 * Clubes: descoberta, associação, convites, administração, caixa e métricas.
 * Permissões são sempre verificadas aqui (servidor), nunca só no cliente.
 */
import type { Queryable } from '../db';
import { CLUB_COLORS, CLUB_EMBLEMS, levelFromPoints, type ClubType, type GlobalSettings } from '../../shared/catalog';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors';
import { slugify, uid } from '../lib/ids';
import { ensureWallet, getBalance, listTransactions, move, walletId } from './wallet';
import { notify } from './notifications';
import { logActivity, listActivities } from './activity';
import { bumpStat, findUserByUsername, getUserRow, grantProgress } from './users';

export type ClubRole = 'owner' | 'admin' | 'agent' | 'member';

export interface ClubSettings {
  maxMembers: number;
  minLevel: number;
  rakePct: number;
  agentCommissionPct: number;
  membersCanInvite: boolean;
  allowBots: boolean;
  tableLimit: number;
  maxEntry: number;
}

export const defaultClubSettings = (g: GlobalSettings): ClubSettings => ({
  maxMembers: 150,
  minLevel: 1,
  rakePct: g.defaultRakePct,
  agentCommissionPct: g.defaultAgentCommissionPct,
  membersCanInvite: true,
  allowBots: true,
  tableLimit: 8,
  maxEntry: 5000,
});

export function sanitizeClubSettings(input: Partial<ClubSettings>, base: ClubSettings): ClubSettings {
  const clamp = (v: unknown, min: number, max: number, dflt: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
  };
  return {
    maxMembers: clamp(input.maxMembers ?? base.maxMembers, 5, 1000, base.maxMembers),
    minLevel: clamp(input.minLevel ?? base.minLevel, 1, 50, base.minLevel),
    rakePct: clamp(input.rakePct ?? base.rakePct, 0, 25, base.rakePct),
    agentCommissionPct: clamp(input.agentCommissionPct ?? base.agentCommissionPct, 0, 80, base.agentCommissionPct),
    membersCanInvite: input.membersCanInvite ?? base.membersCanInvite,
    allowBots: input.allowBots ?? base.allowBots,
    tableLimit: clamp(input.tableLimit ?? base.tableLimit, 1, 30, base.tableLimit),
    maxEntry: clamp(input.maxEntry ?? base.maxEntry, 0, 100000, base.maxEntry),
  };
}

export async function getClubRow(q: Queryable, clubId: string) {
  const row = await q.one('SELECT * FROM clubs WHERE id = $1 OR slug = $1', [clubId]);
  if (!row) throw notFound('Clube não encontrado.');
  return row as any;
}

export async function membership(q: Queryable, clubId: string, userId: string) {
  return q.one<{ role: ClubRole; status: string; agent_id: string | null; commission_pct: number | null }>(
    'SELECT role, status, agent_id, commission_pct FROM club_members WHERE club_id = $1 AND user_id = $2',
    [clubId, userId],
  );
}

/** Garante que o usuário tem um dos papéis no clube (Super Admin sempre pode). */
export async function requireClubRole(q: Queryable, clubId: string, userId: string, roles: ClubRole[]) {
  const user = await getUserRow(q, userId);
  if (user.is_super_admin) return 'owner' as ClubRole;
  const m = await membership(q, clubId, userId);
  if (!m || m.status !== 'active' || !roles.includes(m.role)) throw forbidden('Apenas a administração do clube pode fazer isso.');
  return m.role;
}

function clubDto(r: any) {
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    description: r.description as string,
    emblem: r.emblem as string,
    color: r.color as string,
    type: r.type as ClubType,
    rules: r.rules as string,
    status: r.status as string,
    settings: r.settings as ClubSettings,
    ownerId: r.owner_id as string,
    ownerName: (r.owner_name as string) ?? null,
    members: Number(r.members ?? 0),
    tables: Number(r.tables ?? 0),
    gamesWeek: Number(r.games_week ?? 0),
    points: Number(r.club_points ?? 0),
    myRole: (r.my_role as ClubRole | null) ?? null,
    myStatus: (r.my_status as string | null) ?? null,
    createdAt: new Date(r.created_at).toISOString(),
  };
}
export type ClubDto = ReturnType<typeof clubDto>;

const CLUB_SELECT = `
  SELECT c.*, o.display_name AS owner_name,
    (SELECT count(*) FROM club_members m WHERE m.club_id = c.id AND m.status = 'active') AS members,
    (SELECT count(*) FROM rooms r WHERE r.club_id = c.id AND r.kind = 'table' AND r.status <> 'closed') AS tables,
    (SELECT count(*) FROM games g WHERE g.club_id = c.id AND g.created_at > now() - interval '7 days') AS games_week,
    (SELECT COALESCE(sum(u.points),0) FROM club_members m JOIN users u ON u.id = m.user_id WHERE m.club_id = c.id AND m.status = 'active') AS club_points,
    me.role AS my_role, me.status AS my_status
  FROM clubs c
  JOIN users o ON o.id = c.owner_id
  LEFT JOIN club_members me ON me.club_id = c.id AND me.user_id = $1`;

export async function listClubs(q: Queryable, userId: string, opts: { search?: string; mine?: boolean; includeSuspended?: boolean } = {}) {
  const params: unknown[] = [userId];
  const where: string[] = [];
  if (!opts.includeSuspended) where.push(`c.status = 'active'`);
  if (opts.search) {
    params.push(`%${opts.search.toLowerCase()}%`);
    where.push(`(lower(c.name) LIKE $${params.length} OR lower(c.description) LIKE $${params.length})`);
  }
  if (opts.mine) where.push(`me.status IN ('active','pending','invited')`);
  const rows = await q.query(`${CLUB_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY games_week DESC, members DESC, c.created_at`, params);
  return rows.map(clubDto);
}

export async function getClub(q: Queryable, clubIdOrSlug: string, userId: string) {
  const base = await getClubRow(q, clubIdOrSlug);
  const row = await q.one(`${CLUB_SELECT} WHERE c.id = $2`, [userId, base.id]);
  const club = clubDto(row);
  const [members, activity] = await Promise.all([
    listMembers(q, club.id, { status: 'active', limit: 60 }),
    listActivities(q, { clubId: club.id, limit: 15 }),
  ]);
  return { club, members, activity };
}

export async function listMembers(q: Queryable, clubId: string, opts: { status?: string; limit?: number } = {}) {
  const params: unknown[] = [clubId, Math.min(opts.limit ?? 200, 500)];
  let where = 'm.club_id = $1';
  if (opts.status) {
    params.push(opts.status);
    where += ` AND m.status = $${params.length}`;
  }
  const rows = await q.query(
    `SELECT m.*, u.username, u.display_name, u.avatar, u.frame, u.points, u.last_seen_at, u.stats, u.is_demo,
            a.display_name AS agent_name,
            (SELECT count(*) FROM game_players gp JOIN games g ON g.id = gp.game_id WHERE gp.user_id = m.user_id AND g.club_id = m.club_id) AS club_games,
            (SELECT COALESCE(sum(gp.entry_paid),0) FROM game_players gp JOIN games g ON g.id = gp.game_id WHERE gp.user_id = m.user_id AND g.club_id = m.club_id) AS club_volume
       FROM club_members m JOIN users u ON u.id = m.user_id LEFT JOIN users a ON a.id = m.agent_id
      WHERE ${where}
      ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'agent' THEN 2 ELSE 3 END, u.points DESC
      LIMIT $2`,
    params,
  );
  return rows.map((r: any) => ({
    userId: r.user_id as string,
    username: r.username as string,
    displayName: r.display_name as string,
    avatar: r.avatar as string,
    frame: r.frame as string,
    level: levelFromPoints(Number(r.points)),
    points: Number(r.points),
    role: r.role as ClubRole,
    status: r.status as string,
    agentId: r.agent_id as string | null,
    agentName: r.agent_name as string | null,
    commissionPct: r.commission_pct as number | null,
    online: Date.now() - new Date(r.last_seen_at).getTime() < 5 * 60_000 || r.is_demo,
    games: Number(r.club_games),
    volume: Number(r.club_volume),
    wins: Number(r.stats?.wins ?? 0),
    joinedAt: r.joined_at ? new Date(r.joined_at).toISOString() : null,
    requestedAt: new Date(r.created_at).toISOString(),
  }));
}

export interface CreateClubInput {
  name: string;
  description: string;
  emblem: string;
  color: string;
  type: ClubType;
  rules: string;
  settings?: Partial<ClubSettings>;
}

export function validateClubInput(input: Partial<CreateClubInput>, partial = false) {
  if (!partial || input.name !== undefined) {
    const name = (input.name ?? '').trim();
    if (name.length < 3 || name.length > 32) throw badRequest('O nome do clube deve ter entre 3 e 32 caracteres.');
  }
  if (input.description !== undefined && input.description.length > 280) throw badRequest('Descrição muito longa (máx. 280).');
  if (input.rules !== undefined && input.rules.length > 1200) throw badRequest('Regras muito longas (máx. 1200).');
  if (input.emblem !== undefined && !CLUB_EMBLEMS.includes(input.emblem as any)) throw badRequest('Emblema inválido.');
  if (input.color !== undefined && !CLUB_COLORS.some((c) => c.id === input.color)) throw badRequest('Cor inválida.');
  if (input.type !== undefined && !['aberto', 'solicitacao', 'convite'].includes(input.type)) throw badRequest('Tipo de clube inválido.');
}

export async function createClub(q: Queryable, userId: string, input: CreateClubInput, g: GlobalSettings, at = new Date()) {
  validateClubInput(input);
  const name = input.name.trim();
  const dup = await q.one('SELECT 1 FROM clubs WHERE lower(name) = lower($1)', [name]);
  if (dup) throw conflict('Já existe um clube com esse nome.');
  const owned = await q.one<{ n: number }>(`SELECT count(*)::int AS n FROM clubs WHERE owner_id = $1`, [userId]);
  if (Number(owned?.n ?? 0) >= 3) throw conflict('Cada jogador pode fundar no máximo 3 clubes.');
  const id = uid('club');
  let slug = slugify(name) || id;
  if (await q.one('SELECT 1 FROM clubs WHERE slug = $1', [slug])) slug = `${slug}-${id.slice(-4)}`;
  const settings = sanitizeClubSettings(input.settings ?? {}, defaultClubSettings(g));
  await q.query(
    `INSERT INTO clubs (id, slug, name, description, emblem, color, type, rules, settings, owner_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, slug, name, input.description?.trim() ?? '', input.emblem, input.color, input.type, input.rules?.trim() ?? '', JSON.stringify(settings), userId, at],
  );
  await q.query(`INSERT INTO club_members (club_id, user_id, role, status, joined_at, created_at) VALUES ($1,$2,'owner','active',$3,$3)`, [id, userId, at]);
  await ensureWallet(q, { type: 'club', id }, 'MIUDA');
  const user = await getUserRow(q, userId);
  await logActivity(q, { kind: 'club_create', actorId: userId, clubId: id, message: `${user.display_name} fundou o clube ${name}.`, at });
  await bumpStat(q, userId, 'clubsCreated');
  await bumpStat(q, userId, 'clubsJoined');
  await grantProgress(q, userId, 0, g, at);
  return id;
}

export async function updateClub(q: Queryable, clubId: string, actorId: string, input: Partial<CreateClubInput>, g: GlobalSettings) {
  await requireClubRole(q, clubId, actorId, ['owner', 'admin']);
  validateClubInput(input, true);
  const row = await getClubRow(q, clubId);
  const settings = sanitizeClubSettings(input.settings ?? {}, { ...defaultClubSettings(g), ...row.settings });
  const name = input.name?.trim() ?? row.name;
  if (name !== row.name && (await q.one('SELECT 1 FROM clubs WHERE lower(name) = lower($1) AND id <> $2', [name, row.id]))) {
    throw conflict('Já existe um clube com esse nome.');
  }
  await q.query(
    `UPDATE clubs SET name=$2, description=$3, emblem=$4, color=$5, type=$6, rules=$7, settings=$8 WHERE id=$1`,
    [row.id, name, input.description ?? row.description, input.emblem ?? row.emblem, input.color ?? row.color, input.type ?? row.type, input.rules ?? row.rules, JSON.stringify(settings)],
  );
  await logActivity(q, { kind: 'club_settings', actorId, clubId: row.id, message: `As configurações do clube foram atualizadas.` });
}

async function clubAdmins(q: Queryable, clubId: string): Promise<string[]> {
  const rows = await q.query<{ user_id: string }>(`SELECT user_id FROM club_members WHERE club_id = $1 AND status = 'active' AND role IN ('owner','admin')`, [clubId]);
  return rows.map((r) => r.user_id);
}

async function activate(q: Queryable, clubId: string, userId: string, g: GlobalSettings) {
  const club = await getClubRow(q, clubId);
  const count = await q.one<{ n: number }>(`SELECT count(*)::int AS n FROM club_members WHERE club_id = $1 AND status = 'active'`, [clubId]);
  if (Number(count?.n) >= (club.settings?.maxMembers ?? 150)) throw conflict('O clube está lotado.');
  await q.query(`UPDATE club_members SET status = 'active', joined_at = now() WHERE club_id = $1 AND user_id = $2`, [clubId, userId]);
  const user = await getUserRow(q, userId);
  await logActivity(q, { kind: 'club_join', actorId: userId, clubId, message: `${user.display_name} entrou no clube ${club.name}.` });
  await bumpStat(q, userId, 'clubsJoined');
  await grantProgress(q, userId, 0, g);
}

export async function joinClub(q: Queryable, clubId: string, userId: string, g: GlobalSettings, message?: string) {
  const club = await getClubRow(q, clubId);
  if (club.status !== 'active') throw conflict('Este clube está suspenso.');
  const user = await getUserRow(q, userId);
  const m = await membership(q, club.id, userId);
  if (m?.status === 'active') throw conflict('Você já é membro deste clube.');
  if (m?.status === 'banned') throw forbidden('Você foi banido deste clube.');
  if (m?.status === 'pending') throw conflict('Sua solicitação já está aguardando aprovação.');
  const minLevel = club.settings?.minLevel ?? 1;
  if (levelFromPoints(user.points) < minLevel) throw forbidden(`Este clube exige nível ${minLevel}.`);
  if (m?.status === 'invited') {
    await activate(q, club.id, userId, g);
    return { status: 'active' as const };
  }
  if (club.type === 'convite') throw forbidden('Este clube aceita apenas convidados.');
  await q.query(
    `INSERT INTO club_members (club_id, user_id, role, status) VALUES ($1,$2,'member',$3)
     ON CONFLICT (club_id, user_id) DO UPDATE SET status = EXCLUDED.status, role = 'member'`,
    [club.id, userId, club.type === 'aberto' ? 'pending' : 'pending'],
  );
  if (club.type === 'aberto') {
    await activate(q, club.id, userId, g);
    return { status: 'active' as const };
  }
  for (const adminId of await clubAdmins(q, club.id)) {
    await notify(q, adminId, {
      kind: 'club_request',
      title: `Solicitação para ${club.name}`,
      body: `${user.display_name} quer entrar no clube.${message ? ` "${message.slice(0, 140)}"` : ''}`,
      link: `/clubes/${club.id}/admin/notificacoes`,
      meta: { clubId: club.id, userId },
    });
  }
  await logActivity(q, { kind: 'club_request', actorId: userId, clubId: club.id, message: `${user.display_name} solicitou entrada no clube.` });
  return { status: 'pending' as const };
}

export async function leaveClub(q: Queryable, clubId: string, userId: string) {
  const m = await membership(q, clubId, userId);
  if (!m) throw notFound('Você não faz parte deste clube.');
  if (m.role === 'owner') throw conflict('O fundador não pode sair do próprio clube.');
  await q.query('DELETE FROM club_members WHERE club_id = $1 AND user_id = $2', [clubId, userId]);
  await q.query('UPDATE club_members SET agent_id = NULL WHERE club_id = $1 AND agent_id = $2', [clubId, userId]);
  const user = await getUserRow(q, userId);
  if (m.status === 'active') await logActivity(q, { kind: 'club_leave', actorId: userId, clubId, message: `${user.display_name} deixou o clube.` });
}

export async function respondInvite(q: Queryable, clubId: string, userId: string, accept: boolean, g: GlobalSettings) {
  const m = await membership(q, clubId, userId);
  if (!m || m.status !== 'invited') throw notFound('Convite não encontrado ou já respondido.');
  if (accept) await activate(q, clubId, userId, g);
  else await q.query('DELETE FROM club_members WHERE club_id = $1 AND user_id = $2', [clubId, userId]);
}

export async function inviteToClub(q: Queryable, clubId: string, actorId: string, username: string, opts: { asAgent?: boolean } = {}) {
  const club = await getClubRow(q, clubId);
  const actorRole = (await membership(q, club.id, actorId))?.role;
  const actor = await getUserRow(q, actorId);
  const canInvite =
    actor.is_super_admin || actorRole === 'owner' || actorRole === 'admin' || actorRole === 'agent' || (actorRole === 'member' && club.settings?.membersCanInvite);
  if (!canInvite) throw forbidden('Você não pode convidar jogadores para este clube.');
  const target = await findUserByUsername(q, username);
  if (!target || target.is_demo) throw notFound('Jogador não encontrado.');
  const m = await membership(q, club.id, target.id);
  if (m?.status === 'active') throw conflict('Este jogador já é membro.');
  if (m?.status === 'banned') throw conflict('Este jogador está banido do clube.');
  const agentId = actorRole === 'agent' || opts.asAgent ? actorId : null;
  await q.query(
    `INSERT INTO club_members (club_id, user_id, role, status, invited_by, agent_id) VALUES ($1,$2,'member','invited',$3,$4)
     ON CONFLICT (club_id, user_id) DO UPDATE SET status = 'invited', invited_by = EXCLUDED.invited_by, agent_id = COALESCE(EXCLUDED.agent_id, club_members.agent_id)`,
    [club.id, target.id, actorId, agentId],
  );
  await notify(q, target.id, {
    kind: 'invite_club',
    title: `Convite: ${club.name}`,
    body: `${actor.display_name} convidou você para o clube ${club.name}.`,
    link: `/clubes/${club.id}`,
    meta: { clubId: club.id, action: 'club_invite' },
  });
  return { userId: target.id, displayName: target.display_name };
}

export async function decideRequest(q: Queryable, clubId: string, actorId: string, userId: string, approve: boolean, g: GlobalSettings) {
  await requireClubRole(q, clubId, actorId, ['owner', 'admin']);
  const club = await getClubRow(q, clubId);
  const m = await membership(q, club.id, userId);
  if (!m || m.status !== 'pending') throw notFound('Solicitação não encontrada.');
  if (approve) {
    await activate(q, club.id, userId, g);
    await notify(q, userId, { kind: 'club', title: `Bem-vindo ao ${club.name}!`, body: 'Sua solicitação foi aprovada.', link: `/clubes/${club.id}` });
  } else {
    await q.query('DELETE FROM club_members WHERE club_id = $1 AND user_id = $2', [club.id, userId]);
    await notify(q, userId, { kind: 'club', title: `Solicitação recusada`, body: `O clube ${club.name} não aprovou sua entrada desta vez.`, link: '/clubes' });
  }
}

export async function updateMember(
  q: Queryable,
  clubId: string,
  actorId: string,
  userId: string,
  patch: { role?: ClubRole; agentId?: string | null; commissionPct?: number | null },
) {
  const actorRole = await requireClubRole(q, clubId, actorId, ['owner', 'admin']);
  const m = await membership(q, clubId, userId);
  if (!m || m.status !== 'active') throw notFound('Membro não encontrado.');
  if (m.role === 'owner') throw forbidden('O fundador não pode ser alterado.');
  if (patch.role !== undefined) {
    if (!['admin', 'agent', 'member'].includes(patch.role)) throw badRequest('Função inválida.');
    if (patch.role === 'admin' && actorRole !== 'owner') throw forbidden('Apenas o fundador nomeia administradores.');
    await q.query('UPDATE club_members SET role = $3 WHERE club_id = $1 AND user_id = $2', [clubId, userId, patch.role]);
    if (m.role === 'agent' && patch.role !== 'agent') {
      await q.query('UPDATE club_members SET agent_id = NULL WHERE club_id = $1 AND agent_id = $2', [clubId, userId]);
    }
    const club = await getClubRow(q, clubId);
    const label = { admin: 'administrador(a)', agent: 'agente', member: 'membro' }[patch.role as 'admin' | 'agent' | 'member'];
    await notify(q, userId, { kind: 'club', title: `Nova função em ${club.name}`, body: `Você agora é ${label} do clube.`, link: `/clubes/${clubId}` });
    const user = await getUserRow(q, userId);
    await logActivity(q, { kind: 'club_role', actorId, clubId, message: `${user.display_name} agora é ${label}.` });
  }
  if (patch.agentId !== undefined) {
    if (patch.agentId) {
      const a = await membership(q, clubId, patch.agentId);
      if (!a || a.status !== 'active' || a.role !== 'agent') throw badRequest('O agente escolhido não é agente deste clube.');
      if (patch.agentId === userId) throw badRequest('Um agente não pode ser vinculado a si mesmo.');
    }
    await q.query('UPDATE club_members SET agent_id = $3 WHERE club_id = $1 AND user_id = $2', [clubId, userId, patch.agentId]);
  }
  if (patch.commissionPct !== undefined) {
    const pct = patch.commissionPct === null ? null : Math.max(0, Math.min(80, Math.round(patch.commissionPct)));
    await q.query('UPDATE club_members SET commission_pct = $3 WHERE club_id = $1 AND user_id = $2', [clubId, userId, pct]);
  }
}

export async function removeMember(q: Queryable, clubId: string, actorId: string, userId: string, ban: boolean) {
  const actorRole = await requireClubRole(q, clubId, actorId, ['owner', 'admin']);
  const m = await membership(q, clubId, userId);
  if (!m) throw notFound('Membro não encontrado.');
  if (m.role === 'owner') throw forbidden('O fundador não pode ser removido.');
  if (m.role === 'admin' && actorRole !== 'owner') throw forbidden('Apenas o fundador remove administradores.');
  if (ban) await q.query(`UPDATE club_members SET status = 'banned', role = 'member', agent_id = NULL WHERE club_id = $1 AND user_id = $2`, [clubId, userId]);
  else await q.query('DELETE FROM club_members WHERE club_id = $1 AND user_id = $2', [clubId, userId]);
  await q.query('UPDATE club_members SET agent_id = NULL WHERE club_id = $1 AND agent_id = $2', [clubId, userId]);
  const club = await getClubRow(q, clubId);
  const user = await getUserRow(q, userId);
  await notify(q, userId, { kind: 'club', title: ban ? `Banido de ${club.name}` : `Removido de ${club.name}`, body: 'A administração do clube encerrou sua participação.', link: '/clubes' });
  await logActivity(q, { kind: 'club_remove', actorId, clubId, message: `${user.display_name} ${ban ? 'foi banido' : 'foi removido'} do clube.` });
}

export async function unbanMember(q: Queryable, clubId: string, actorId: string, userId: string) {
  await requireClubRole(q, clubId, actorId, ['owner', 'admin']);
  await q.query(`DELETE FROM club_members WHERE club_id = $1 AND user_id = $2 AND status = 'banned'`, [clubId, userId]);
}

/* ------------------------------- Caixa ------------------------------- */

export async function treasury(q: Queryable, clubId: string, actorId: string, opts: { before?: number } = {}) {
  await requireClubRole(q, clubId, actorId, ['owner', 'admin']);
  const club = await getClubRow(q, clubId);
  const wid = walletId({ type: 'club', id: club.id }, 'MIUDA');
  const [balance, txs, totals] = await Promise.all([
    getBalance(q, { type: 'club', id: club.id }, 'MIUDA'),
    listTransactions(q, [wid], { limit: 40, before: opts.before }),
    q.one(
      `SELECT COALESCE(sum(CASE WHEN amount > 0 THEN amount END),0) AS inflow,
              COALESCE(-sum(CASE WHEN amount < 0 THEN amount END),0) AS outflow,
              COALESCE(sum(CASE WHEN kind = 'RAKE' THEN amount END),0) AS rake,
              COALESCE(sum(CASE WHEN amount > 0 AND created_at > now() - interval '7 days' THEN amount END),0) AS inflow_week
         FROM transactions WHERE wallet_id = $1`,
      [wid],
    ),
  ]);
  const commissions = await q.one(
    `SELECT COALESCE(sum(t.amount),0) AS total FROM transactions t
       JOIN games g ON g.id = t.ref_id
      WHERE t.kind = 'AGENT_COMMISSION' AND t.amount > 0 AND g.club_id = $1`,
    [club.id],
  );
  return {
    balance,
    inflow: Number(totals.inflow),
    outflow: Number(totals.outflow),
    rake: Number(totals.rake),
    inflowWeek: Number(totals.inflow_week),
    agentCommissions: Number(commissions?.total ?? 0),
    transactions: txs,
  };
}

export async function payout(q: Queryable, clubId: string, actorId: string, username: string, amount: number, note: string) {
  await requireClubRole(q, clubId, actorId, ['owner', 'admin']);
  const club = await getClubRow(q, clubId);
  const target = await findUserByUsername(q, username);
  if (!target) throw notFound('Jogador não encontrado.');
  const m = await membership(q, club.id, target.id);
  if (!m || m.status !== 'active') throw badRequest('Pagamentos do caixa só podem ir para membros ativos.');
  const amt = Math.floor(Number(amount));
  if (!(amt > 0)) throw badRequest('Informe um valor válido.');
  const desc = note?.trim() ? `${club.name}: ${note.trim().slice(0, 80)}` : `Pagamento do clube ${club.name}`;
  await move(q, { from: { type: 'club', id: club.id }, to: { type: 'user', id: target.id }, currency: 'MIUDA', amount: amt, kind: 'CLUB_PAYOUT', description: desc }, { actorId, refType: 'club', refId: club.id });
  await notify(q, target.id, { kind: 'transfer', title: `+${amt} Miúdas do ${club.name}`, body: desc, link: '/perfil?aba=extrato' });
  const actor = await getUserRow(q, actorId);
  await logActivity(q, { kind: 'club_payout', actorId, clubId: club.id, message: `${actor.display_name} pagou ${amt} Miúdas do caixa para ${target.display_name}.`, meta: { amount: amt } });
}

export async function deposit(q: Queryable, clubId: string, userId: string, amount: number) {
  const club = await getClubRow(q, clubId);
  const m = await membership(q, club.id, userId);
  if (!m || m.status !== 'active') throw forbidden('Apenas membros podem depositar no caixa.');
  const amt = Math.floor(Number(amount));
  if (!(amt > 0)) throw badRequest('Informe um valor válido.');
  await move(q, { from: { type: 'user', id: userId }, to: { type: 'club', id: club.id }, currency: 'MIUDA', amount: amt, kind: 'CLUB_DEPOSIT', description: `Depósito no caixa do ${club.name}` }, { actorId: userId, refType: 'club', refId: club.id });
  const user = await getUserRow(q, userId);
  await logActivity(q, { kind: 'club_deposit', actorId: userId, clubId: club.id, message: `${user.display_name} depositou ${amt} Miúdas no caixa.`, meta: { amount: amt } });
}

/* ------------------------------ Métricas ------------------------------ */

export async function clubMetrics(q: Queryable, clubId: string) {
  const club = await getClubRow(q, clubId);
  const id = club.id;
  const [totals, series, top, tables, members] = await Promise.all([
    q.one(
      `SELECT count(*) AS games,
              COALESCE(sum(g.pot),0) AS volume,
              COALESCE(sum(g.rake),0) AS rake,
              count(*) FILTER (WHERE g.created_at > now() - interval '24 hours') AS games_day,
              count(*) FILTER (WHERE g.status = 'playing') AS live
         FROM games g WHERE g.club_id = $1`,
      [id],
    ),
    q.query(
      `SELECT to_char(d, 'YYYY-MM-DD') AS day,
              (SELECT count(*) FROM games g WHERE g.club_id = $1 AND g.created_at >= d AND g.created_at < d + interval '1 day') AS games,
              (SELECT COALESCE(sum(g.pot),0) FROM games g WHERE g.club_id = $1 AND g.created_at >= d AND g.created_at < d + interval '1 day') AS volume,
              (SELECT count(DISTINCT gp.user_id) FROM games g JOIN game_players gp ON gp.game_id = g.id WHERE g.club_id = $1 AND gp.user_id IS NOT NULL AND g.created_at >= d AND g.created_at < d + interval '1 day') AS players
         FROM generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') AS d
        ORDER BY d`,
      [id],
    ),
    q.query(
      `SELECT u.id, u.display_name, u.avatar, u.frame, count(*) AS games, count(*) FILTER (WHERE gp.is_winner) AS wins, COALESCE(sum(gp.prize),0) AS prizes
         FROM game_players gp JOIN games g ON g.id = gp.game_id JOIN users u ON u.id = gp.user_id
        WHERE g.club_id = $1 GROUP BY u.id ORDER BY wins DESC, games DESC LIMIT 8`,
      [id],
    ),
    q.query(
      `SELECT r.id, r.name, r.status, r.config,
              (SELECT count(*) FROM games g WHERE g.room_id = r.id) AS games,
              (SELECT COALESCE(sum(g.pot),0) FROM games g WHERE g.room_id = r.id) AS volume
         FROM rooms r WHERE r.club_id = $1 AND r.kind = 'table' ORDER BY volume DESC`,
      [id],
    ),
    q.one(
      `SELECT count(*) FILTER (WHERE status = 'active') AS active,
              count(*) FILTER (WHERE status = 'pending') AS pending,
              count(*) FILTER (WHERE status = 'invited') AS invited,
              count(*) FILTER (WHERE status = 'active' AND role = 'agent') AS agents,
              count(*) FILTER (WHERE status = 'active' AND joined_at > now() - interval '7 days') AS new_week
         FROM club_members WHERE club_id = $1`,
      [id],
    ),
  ]);
  return {
    games: Number(totals.games),
    volume: Number(totals.volume),
    rake: Number(totals.rake),
    gamesDay: Number(totals.games_day),
    live: Number(totals.live),
    members: {
      active: Number(members.active),
      pending: Number(members.pending),
      invited: Number(members.invited),
      agents: Number(members.agents),
      newWeek: Number(members.new_week),
    },
    series: series.map((s: any) => ({ day: s.day, games: Number(s.games), volume: Number(s.volume), players: Number(s.players) })),
    topPlayers: top.map((t: any) => ({ id: t.id, name: t.display_name, avatar: t.avatar, frame: t.frame, games: Number(t.games), wins: Number(t.wins), prizes: Number(t.prizes) })),
    tables: tables.map((t: any) => ({ id: t.id, name: t.name, status: t.status, category: t.config?.category, games: Number(t.games), volume: Number(t.volume) })),
  };
}

export async function adminInbox(q: Queryable, clubId: string, actorId: string) {
  await requireClubRole(q, clubId, actorId, ['owner', 'admin']);
  const club = await getClubRow(q, clubId);
  const [pending, invited, activity] = await Promise.all([
    listMembers(q, club.id, { status: 'pending' }),
    listMembers(q, club.id, { status: 'invited' }),
    listActivities(q, { clubId: club.id, limit: 40 }),
  ]);
  const balance = await getBalance(q, { type: 'club', id: club.id }, 'MIUDA');
  const alerts: { level: 'info' | 'warn'; message: string }[] = [];
  if (pending.length) alerts.push({ level: 'warn', message: `${pending.length} solicitação(ões) aguardando decisão.` });
  if (balance < 500) alerts.push({ level: 'warn', message: 'O caixa do clube está baixo.' });
  const liveTables = await q.one<{ n: number }>(`SELECT count(*)::int AS n FROM rooms WHERE club_id = $1 AND kind = 'table' AND status <> 'closed'`, [club.id]);
  if (Number(liveTables?.n) === 0) alerts.push({ level: 'warn', message: 'O clube não tem mesas abertas.' });
  if (!alerts.length) alerts.push({ level: 'info', message: 'Tudo em ordem na Toca do clube.' });
  return { pending, invited, activity, alerts };
}

import type { Queryable } from '../db';

export async function logActivity(
  q: Queryable,
  a: { kind: string; actorId?: string | null; clubId?: string | null; message: string; meta?: Record<string, unknown>; at?: Date },
) {
  await q.query(`INSERT INTO activities (kind, actor_id, club_id, message, meta, created_at) VALUES ($1,$2,$3,$4,$5,$6)`, [
    a.kind, a.actorId ?? null, a.clubId ?? null, a.message, JSON.stringify(a.meta ?? {}), a.at ?? new Date(),
  ]);
}

export async function listActivities(q: Queryable, opts: { clubId?: string; limit?: number } = {}) {
  const params: unknown[] = [Math.min(opts.limit ?? 30, 100)];
  let where = '';
  if (opts.clubId) {
    params.push(opts.clubId);
    where = 'WHERE a.club_id = $2';
  }
  const rows = await q.query(
    `SELECT a.*, u.display_name AS actor_name, u.avatar AS actor_avatar
       FROM activities a LEFT JOIN users u ON u.id = a.actor_id
       ${where} ORDER BY a.id DESC LIMIT $1`,
    params,
  );
  return rows.map((r: any) => ({
    id: Number(r.id),
    kind: r.kind as string,
    message: r.message as string,
    actor: r.actor_id ? { id: r.actor_id, name: r.actor_name, avatar: r.actor_avatar } : null,
    clubId: r.club_id as string | null,
    meta: r.meta ?? {},
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

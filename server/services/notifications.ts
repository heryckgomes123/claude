import type { Queryable } from '../db';

export type NotificationKind =
  | 'invite_room' | 'invite_club' | 'club_request' | 'club' | 'match' | 'reward' | 'transfer' | 'achievement' | 'system' | 'level';

export interface NotifyInput {
  kind: NotificationKind;
  title: string;
  body?: string;
  link?: string | null;
  meta?: Record<string, unknown>;
  at?: Date;
}

export async function notify(q: Queryable, userId: string, n: NotifyInput) {
  await q.query(
    `INSERT INTO notifications (user_id, kind, title, body, link, meta, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [userId, n.kind, n.title, n.body ?? '', n.link ?? null, JSON.stringify(n.meta ?? {}), n.at ?? new Date()],
  );
}

export function mapNotification(r: any) {
  return {
    id: Number(r.id),
    kind: r.kind as NotificationKind,
    title: r.title as string,
    body: r.body as string,
    link: r.link as string | null,
    meta: (r.meta ?? {}) as Record<string, any>,
    read: !!r.read_at,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export async function listNotifications(q: Queryable, userId: string, limit = 50) {
  const rows = await q.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY id DESC LIMIT $2', [userId, limit]);
  return rows.map(mapNotification);
}

export async function unreadCount(q: Queryable, userId: string): Promise<number> {
  const r = await q.one<{ n: number }>('SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL', [userId]);
  return Number(r?.n ?? 0);
}

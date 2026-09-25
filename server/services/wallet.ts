/**
 * Carteiras e livro-razão.
 *
 * Toda movimentação é uma transferência entre duas carteiras dentro de uma
 * transação do banco: um lançamento negativo na origem e um positivo no
 * destino, cada um com o saldo resultante. Saldos nunca ficam negativos
 * (CHECK no banco + validação aqui). O total de Miúdas do sistema só muda
 * pelo lançamento GENESIS do Tesouro da Toca.
 */
import type { Queryable } from '../db';
import type { Currency, TxKind } from '../../shared/catalog';
import { TX_LABELS } from '../../shared/catalog';
import { badRequest, conflict } from '../lib/errors';
import type { Movement, WalletRef } from './settlement';

export const walletId = (ref: WalletRef, currency: Currency) => `${ref.type}:${ref.id}:${currency}`;

export async function ensureWallet(q: Queryable, ref: WalletRef, currency: Currency): Promise<string> {
  const id = walletId(ref, currency);
  await q.query(
    `INSERT INTO wallets (id, owner_type, owner_id, currency) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
    [id, ref.type, ref.id, currency],
  );
  return id;
}

export async function getBalance(q: Queryable, ref: WalletRef, currency: Currency): Promise<number> {
  const row = await q.one<{ balance: number }>('SELECT balance FROM wallets WHERE id = $1', [walletId(ref, currency)]);
  return row ? Number(row.balance) : 0;
}

export interface MoveOptions {
  refType?: string;
  refId?: string;
  actorId?: string | null;
  at?: Date;
}

/** Executa uma movimentação (deve ser chamada dentro de db.tx). */
export async function move(q: Queryable, m: Movement, opts: MoveOptions = {}): Promise<{ fromBalance: number; toBalance: number }> {
  if (!Number.isInteger(m.amount) || m.amount <= 0) throw badRequest('Valor inválido.');
  const fromId = await ensureWallet(q, m.from, m.currency);
  const toId = await ensureWallet(q, m.to, m.currency);
  if (fromId === toId) throw badRequest('Origem e destino iguais.');
  // trava em ordem determinística para evitar deadlocks
  const [a, b] = [fromId, toId].sort();
  await q.query('SELECT id FROM wallets WHERE id IN ($1,$2) ORDER BY id FOR UPDATE', [a, b]);
  const debit = await q.one<{ balance: number }>(
    'UPDATE wallets SET balance = balance - $2 WHERE id = $1 AND balance >= $2 RETURNING balance',
    [fromId, m.amount],
  );
  if (!debit) {
    throw conflict(m.currency === 'MIUDA' ? 'Saldo de Miúdas insuficiente.' : 'Diamantes insuficientes.', 'INSUFFICIENT_FUNDS');
  }
  const credit = await q.one<{ balance: number }>('UPDATE wallets SET balance = balance + $2 WHERE id = $1 RETURNING balance', [toId, m.amount]);
  const at = opts.at ?? new Date();
  await q.query(
    `INSERT INTO transactions (wallet_id, currency, amount, balance_after, kind, description, ref_type, ref_id, counterparty_wallet_id, actor_user_id, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11), ($9,$2,$12,$13,$14,$15,$7,$8,$1,$10,$11)`,
    [
      fromId, m.currency, -m.amount, Number(debit.balance), m.kind, m.description, opts.refType ?? null, opts.refId ?? null,
      toId, opts.actorId ?? null, at, m.amount, Number(credit!.balance), m.toKind ?? m.kind, m.toDescription ?? m.description,
    ],
  );
  return { fromBalance: Number(debit.balance), toBalance: Number(credit!.balance) };
}

export interface TxRow {
  id: number;
  currency: Currency;
  amount: number;
  balanceAfter: number;
  kind: TxKind;
  label: string;
  description: string;
  refType: string | null;
  refId: string | null;
  counterparty: string | null;
  createdAt: string;
}

export async function listTransactions(
  q: Queryable,
  walletIds: string[],
  opts: { limit?: number; before?: number; kinds?: string[] } = {},
): Promise<TxRow[]> {
  const limit = Math.min(opts.limit ?? 30, 100);
  const params: unknown[] = [walletIds, limit];
  let where = 'wallet_id = ANY($1)';
  if (opts.before) {
    params.push(opts.before);
    where += ` AND t.id < $${params.length}`;
  }
  if (opts.kinds?.length) {
    params.push(opts.kinds);
    where += ` AND kind = ANY($${params.length})`;
  }
  const rows = await q.query(
    `SELECT t.*, w.owner_type AS cp_type, w.owner_id AS cp_id,
            COALESCE(u.display_name, c.name) AS cp_name
       FROM transactions t
       LEFT JOIN wallets w ON w.id = t.counterparty_wallet_id
       LEFT JOIN users u ON w.owner_type = 'user' AND u.id = w.owner_id
       LEFT JOIN clubs c ON w.owner_type = 'club' AND c.id = w.owner_id
      WHERE ${where}
      ORDER BY t.id DESC LIMIT $2`,
    params,
  );
  return rows.map(mapTx);
}

export function mapTx(r: any): TxRow {
  return {
    id: Number(r.id),
    currency: r.currency,
    amount: Number(r.amount),
    balanceAfter: Number(r.balance_after),
    kind: r.kind,
    label: TX_LABELS[r.kind as TxKind] ?? r.kind,
    description: r.description,
    refType: r.ref_type,
    refId: r.ref_id,
    counterparty: r.cp_name ?? (r.cp_type === 'house' ? 'Tesouro da Toca' : null),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

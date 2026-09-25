/**
 * Dados de demonstração da Toca.
 *
 * O histórico é SIMULADO com o motor real do jogo e a mesma liquidação do
 * servidor, em ordem cronológica, num livro-razão em memória — por isso
 * saldos, extratos, estatísticas, ranking e métricas de clubes batem entre
 * si. Tudo é gravado com inserts em lote numa única transação (rápido mesmo
 * em Postgres remoto).
 */
import type { Queryable } from './db';
import { advance, createGame, type NewPlayer } from '../shared/game';
import type { BotDifficulty } from '../shared/bot';
import {
  CHARACTERS, DEFAULT_SETTINGS, defaultTitle, levelFromPoints, isUnlocked, BOT_NAMES,
  type Currency,
} from '../shared/catalog';
import { uid, roomCode } from './lib/ids';
import { seededRng } from './lib/rng';
import { hashPassword } from './lib/crypto';
import { computeSettlement, ESCROW, HOUSE, type Movement, type WalletRef } from './services/settlement';
import { walletId } from './services/wallet';
import { applyGameStats, earnedAchievements, emptyStats, type PlayerStats } from './services/stats';
import type { RoomConfig } from './services/games';
import { defaultClubSettings } from './services/clubs';

export const DEMO_PASSWORD = 'toca123';

export const DEMO_ACCOUNTS = [
  { role: 'PLAYER', username: 'aric', displayName: 'Aric Mão-de-Ferro', avatar: 'lynx', label: 'Jogador', description: 'Membro do Clube do Javali, vinculado a um agente.' },
  { role: 'CLUB_ADMIN', username: 'brunhilde', displayName: 'Dona Brunhilde', avatar: 'brun', label: 'Administradora', description: 'Fundadora do Clube do Javali.' },
  { role: 'AGENT', username: 'silas', displayName: 'Silas Bolsa-Cheia', avatar: 'otis', label: 'Agente', description: 'Agente do Clube do Javali com jogadores vinculados.' },
  { role: 'SUPER_ADMIN', username: 'mestre', displayName: 'Mestre Aldric', avatar: 'aldren', label: 'Super Admin', description: 'Visão global e Central de Comando.' },
] as const;

const RESIDENTS = [
  'Gunnar Barba-Ruiva', 'Mirela das Runas', 'Tobias Mão-Leve', 'Velha Agda', 'Bento Tampa-de-Barril', 'Ysolda', 'Dario Olho-de-Corvo',
  'Frida Martelo', 'Ivo Sete-Dedos', 'Lia Lanterna', 'Rurik', 'Selma Brasa', 'Otto Pé-de-Cabra', 'Nádia Lâmina', 'Caio Ferradura',
  'Jorunn', 'Matias Candeeiro', 'Greta Sal-Grosso', 'Horácio Vinagre', 'Valka', 'Zeca Dados-Viciados', 'Brígida', 'Ulrich', 'Tessa Fumaça',
];

interface SUser {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string | null;
  isSuperAdmin: boolean;
  isNpc: boolean;
  avatar: string;
  frame: string;
  points: number;
  stats: PlayerStats;
  owned: string[];
  createdAt: Date;
  lastSeen: Date;
  achievements: { id: string; at: Date }[];
}

class Ledger {
  wallets = new Map<string, { id: string; owner_type: string; owner_id: string; currency: Currency; balance: number }>();
  txs: any[] = [];
  ensure(ref: WalletRef, currency: Currency) {
    const id = walletId(ref, currency);
    if (!this.wallets.has(id)) this.wallets.set(id, { id, owner_type: ref.type, owner_id: ref.id, currency, balance: 0 });
    return this.wallets.get(id)!;
  }
  balance(ref: WalletRef, currency: Currency) {
    return this.ensure(ref, currency).balance;
  }
  genesis(ref: WalletRef, currency: Currency, amount: number, at: Date) {
    const w = this.ensure(ref, currency);
    w.balance += amount;
    this.txs.push({ wallet_id: w.id, currency, amount, balance_after: w.balance, kind: 'GENESIS', description: 'Tesouro inicial da Toca', ref_type: null, ref_id: null, counterparty_wallet_id: null, actor_user_id: null, created_at: at });
  }
  move(m: Movement, at: Date, ref?: { type: string; id: string | null }, actor: string | null = null): boolean {
    const f = this.ensure(m.from, m.currency);
    const t = this.ensure(m.to, m.currency);
    if (f.balance < m.amount || m.amount <= 0) return false;
    f.balance -= m.amount;
    t.balance += m.amount;
    const base = { currency: m.currency, ref_type: ref?.type ?? null, ref_id: ref?.id ?? null, actor_user_id: actor, created_at: at };
    this.txs.push({ ...base, wallet_id: f.id, amount: -m.amount, balance_after: f.balance, kind: m.kind, description: m.description, counterparty_wallet_id: t.id });
    this.txs.push({ ...base, wallet_id: t.id, amount: m.amount, balance_after: t.balance, kind: m.toKind ?? m.kind, description: m.toDescription ?? m.description, counterparty_wallet_id: f.id });
    return true;
  }
}

async function insertMany(q: Queryable, table: string, cols: string[], rows: unknown[][]) {
  const chunk = Math.max(1, Math.floor(8000 / cols.length));
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const params: unknown[] = [];
    const values = part
      .map((r) => {
        const ph = r.map((v) => {
          params.push(v);
          return `$${params.length}`;
        });
        return `(${ph.join(',')})`;
      })
      .join(',');
    await q.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${values}`, params);
  }
}

const J = (v: unknown) => JSON.stringify(v);

export async function seed(q: Queryable, opts: { now?: Date } = {}) {
  const now = opts.now ?? new Date();
  const rng = seededRng(20260925);
  const rand = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rng() * arr.length)];
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const DAY = 86_400_000;
  const settings = DEFAULT_SETTINGS;
  const ledger = new Ledger();

  ledger.genesis(HOUSE, 'MIUDA', 25_000_000, ago(40 * DAY));
  ledger.genesis(HOUSE, 'DIAMOND', 2_000_000, ago(40 * DAY));
  ledger.ensure(ESCROW, 'MIUDA');

  // ------------------------------------------------------------ usuários
  const pw = await hashPassword(DEMO_PASSWORD);
  const users: SUser[] = [];
  const byName: Record<string, SUser> = {};
  const mkUser = (username: string, displayName: string, avatar: string, o: Partial<SUser> = {}) => {
    const createdAt = o.createdAt ?? ago(rand(16, 34) * DAY + rand(0, DAY));
    const u: SUser = {
      id: uid('usr'), username, displayName, passwordHash: null, isSuperAdmin: false, isNpc: true, avatar, frame: 'madeira',
      points: 0, stats: emptyStats(), owned: [], createdAt, lastSeen: now, achievements: [], ...o,
    };
    const ch = CHARACTERS.find((c) => c.id === avatar)!;
    if (ch.unlock.type === 'diamonds') u.owned.push(avatar);
    users.push(u);
    byName[username] = u;
    ledger.move({ from: HOUSE, to: { type: 'user', id: u.id }, currency: 'MIUDA', amount: settings.welcomeBonus, kind: 'WELCOME_BONUS', description: 'Bem-vindo à Toca do Javali' }, createdAt);
    ledger.move({ from: HOUSE, to: { type: 'user', id: u.id }, currency: 'DIAMOND', amount: settings.welcomeDiamonds, kind: 'WELCOME_BONUS', description: 'Diamantes de boas-vindas' }, createdAt);
    return u;
  };

  const [dPlayer, dAdmin, dAgent, dSuper] = DEMO_ACCOUNTS;
  const aric = mkUser(dPlayer.username, dPlayer.displayName, dPlayer.avatar, { passwordHash: pw, isNpc: false, createdAt: ago(12 * DAY) });
  const brunhilde = mkUser(dAdmin.username, dAdmin.displayName, dAdmin.avatar, { passwordHash: pw, isNpc: false, createdAt: ago(30 * DAY) });
  const silas = mkUser(dAgent.username, dAgent.displayName, dAgent.avatar, { passwordHash: pw, isNpc: false, createdAt: ago(28 * DAY) });
  const mestre = mkUser(dSuper.username, dSuper.displayName, dSuper.avatar, { passwordHash: pw, isNpc: false, isSuperAdmin: true, createdAt: ago(38 * DAY) });
  const npcAvatars = CHARACTERS.map((c) => c.id);
  const residents = RESIDENTS.map((name, i) => {
    const uname = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '').slice(0, 20);
    return mkUser(uname, name, npcAvatars[i % npcAvatars.length], { frame: pick(['madeira', 'madeira', 'bronze', 'prata', 'ouro']) });
  });
  // bolsas iniciais (residentes chegam com Miúdas próprias)
  for (const u of [...residents, brunhilde, silas]) {
    ledger.move({ from: HOUSE, to: { type: 'user', id: u.id }, currency: 'MIUDA', amount: rand(15, 60) * 100, kind: 'ADMIN_CREDIT', description: 'Bolsa inicial de residente' }, new Date(u.createdAt.getTime() + 60_000));
  }
  ledger.move({ from: HOUSE, to: { type: 'user', id: aric.id }, currency: 'MIUDA', amount: 1500, kind: 'ADMIN_CREDIT', description: 'Bônus de lançamento da Toca' }, new Date(aric.createdAt.getTime() + 60_000));

  // ------------------------------------------------------------ clubes
  interface SClub { id: string; name: string; slug: string; description: string; emblem: string; color: string; type: string; rules: string; owner: SUser; createdAt: Date; settings: any }
  const clubs: SClub[] = [];
  const members: { club: SClub; user: SUser; role: string; status: string; agent: SUser | null; commission: number | null; joinedAt: Date | null; createdAt: Date; invitedBy?: string | null }[] = [];
  const mkClub = (name: string, slug: string, owner: SUser, emblem: string, color: string, type: string, description: string, rules: string, daysAgo: number, s: any = {}) => {
    const createdAt = new Date(Math.max(ago(daysAgo * DAY).getTime(), owner.createdAt.getTime() + 2 * 3_600_000));
    const c: SClub = { id: uid('club'), name, slug, description, emblem, color, type, rules, owner, createdAt, settings: { ...defaultClubSettings(settings), ...s } };
    clubs.push(c);
    members.push({ club: c, user: owner, role: 'owner', status: 'active', agent: null, commission: null, joinedAt: c.createdAt, createdAt: c.createdAt });
    owner.stats.clubsCreated += 1;
    owner.stats.clubsJoined += 1;
    ledger.move({ from: { type: 'user', id: owner.id }, to: { type: 'club', id: c.id }, currency: 'MIUDA', amount: 1000, kind: 'CLUB_DEPOSIT', description: `Fundo de fundação — ${name}` }, new Date(c.createdAt.getTime() + 1000));
    return c;
  };
  const join = (c: SClub, u: SUser, role = 'member', agent: SUser | null = null, status = 'active', commission: number | null = null) => {
    const at = new Date(Math.max(c.createdAt.getTime(), u.createdAt.getTime()) + rand(1, 48) * 3_600_000);
    members.push({ club: c, user: u, role, status, agent, commission, joinedAt: status === 'active' ? at : null, createdAt: at });
    if (status === 'active') u.stats.clubsJoined += 1;
  };

  const javali = mkClub('Clube do Javali', 'clube-do-javali', brunhilde, 'boar', 'bronze', 'aberto',
    'O clube mais antigo da Toca. Mesas quentes, cerveja gelada e dados honestos.',
    '1. Respeite a mesa e os adversários.\n2. Nada de abandonar partidas em andamento.\n3. Dívidas se pagam antes do amanhecer.\n4. Agentes respondem pelos seus jogadores.', 29,
    { rakePct: 10, agentCommissionPct: 35 });
  const forja = mkClub('Irmandade da Forja', 'irmandade-da-forja', residents[7], 'anvil', 'brasa', 'solicitacao',
    'Ferreiros, mineiros e gente de mão calejada. Aqui cada ponto é martelado.',
    'Entrada com aprovação. Mesas de bronze toda noite.', 24, { rakePct: 8, minLevel: 2 });
  const corvos = mkClub('Corvos da Noite', 'corvos-da-noite', residents[6], 'raven', 'noite', 'convite',
    'Ninguém sabe onde se reúnem. Só se entra por convite de um corvo.',
    'Discrição acima de tudo. Mesas de ouro.', 20, { rakePct: 12 });
  const mercadores = mkClub('Mercadores de Ouro', 'mercadores-de-ouro', residents[17], 'coins', 'ouro', 'aberto',
    'Onde as maiores bolsas da Toca trocam de mão.',
    'Mesas de alto valor. Taxa de 10% sobre o pote.', 18, { rakePct: 10, maxEntry: 5000 });

  // Clube do Javali
  join(javali, silas, 'agent', null, 'active', 35);
  join(javali, residents[0], 'admin');
  join(javali, aric, 'member', silas);
  for (const r of [residents[1], residents[2], residents[4], residents[9], residents[12], residents[14], residents[20], residents[23]]) join(javali, r, 'member', rng() < 0.5 ? silas : null);
  join(javali, residents[10], 'member', null, 'pending');
  join(javali, residents[21], 'member', null, 'pending');
  // Forja
  for (const r of [residents[3], residents[5], residents[10], residents[11], residents[15], residents[18], residents[22]]) join(forja, r);
  join(forja, residents[11], 'agent');
  // Corvos
  for (const r of [residents[8], residents[13], residents[16], residents[19], residents[21], residents[2]]) join(corvos, r);
  join(corvos, aric, 'member', null, 'invited');
  // Mercadores
  for (const r of [residents[1], residents[3], residents[9], residents[20], residents[19], residents[16], brunhilde]) join(mercadores, r);
  // dedup (forja agente duplicado: promove)
  const seen = new Map<string, (typeof members)[number]>();
  for (const m of members) {
    const k = m.club.id + m.user.id;
    const prev = seen.get(k);
    if (prev) {
      if (m.role !== 'member') prev.role = m.role;
      continue;
    }
    seen.set(k, m);
  }
  const memberList = [...seen.values()];
  const activeIn = (c: SClub) => memberList.filter((m) => m.club.id === c.id && m.status === 'active').map((m) => m.user);
  const memberOf = (c: SClub, u: SUser) => memberList.find((m) => m.club.id === c.id && m.user.id === u.id && m.status === 'active');

  // ------------------------------------------------------------ mesas
  interface STable { id: string; code: string; name: string; club: SClub | null; config: RoomConfig; createdAt: Date }
  const tables: STable[] = [];
  const mkTable = (name: string, club: SClub | null, cfg: Partial<RoomConfig>) => {
    const config: RoomConfig = {
      rounds: 5, entryFee: 50, maxPlayers: 6, bots: 0, botDifficulty: 'medio', botFill: true, category: 'taverna',
      rakePct: club ? club.settings.rakePct : 10, countdownSec: 15, description: '', ...cfg,
    };
    const t = { id: uid('room'), code: roomCode(), name, club, config, createdAt: club ? club.createdAt : ago(39 * DAY) };
    tables.push(t);
    return t;
  };
  mkTable('Mesa do Javali', null, { entryFee: 50, category: 'taverna', maxPlayers: 6, description: 'A mesa central da Toca, ao pé da lareira.' });
  mkTable('Balcão do Taberneiro', null, { entryFee: 20, category: 'taverna', maxPlayers: 4, rounds: 3, description: 'Partidas rápidas entre um gole e outro.' });
  mkTable('Salão Dourado', null, { entryFee: 500, category: 'ouro', maxPlayers: 6, rounds: 7, description: 'Apostas altas sob os lustres de bronze.' });
  mkTable('Mesa da Lareira', javali, { entryFee: 100, category: 'bronze', maxPlayers: 6, description: 'O calor da lareira aquece as apostas.' });
  mkTable('Mesa dos Barris', javali, { entryFee: 30, category: 'taverna', maxPlayers: 4, rounds: 3 });
  mkTable('Bigorna Quente', forja, { entryFee: 150, category: 'bronze', maxPlayers: 5 });
  mkTable('Ninho dos Corvos', corvos, { entryFee: 400, category: 'ouro', maxPlayers: 6, rounds: 7 });
  mkTable('Balança de Ouro', mercadores, { entryFee: 1000, category: 'lendaria', maxPlayers: 6, rounds: 7, description: 'Somente para bolsas pesadas.' });
  mkTable('Banca do Mercado', mercadores, { entryFee: 50, category: 'taverna', maxPlayers: 4 });

  // ------------------------------------------------------------ eventos cronológicos
  const events: { at: number; run: () => void }[] = [];
  const schedule = (at: Date, run: () => void) => events.push({ at: at.getTime(), run });
  const gamesOut: any[] = [];
  const gpOut: any[] = [];
  const activities: any[] = [];
  const notifications: any[] = [];
  const roomsOut: any[] = [];
  const botRooms: any[] = [];

  const agentFor = (club: SClub | null, u: SUser) => {
    if (!club) return { agentId: null, agentPct: null };
    const m = memberOf(club, u);
    if (!m?.agent) return { agentId: null, agentPct: null };
    const am = memberOf(club, m.agent);
    if (!am || am.role !== 'agent') return { agentId: null, agentPct: null };
    return { agentId: m.agent.id, agentPct: am.commission ?? club.settings.agentCommissionPct };
  };

  const simulate = (at: Date, kind: 'table' | 'bot', table: STable | null, humans: SUser[], botCount: number, difficulty: BotDifficulty) => {
    const fee = kind === 'bot' ? 0 : table!.config.entryFee;
    const roomName = table?.name ?? `Treino contra ${difficulty === 'facil' ? 'Aprendizes' : difficulty === 'medio' ? 'Veteranos' : 'Mestres'}`;
    const gameId = uid('game');
    const payers = humans.filter((u) => fee === 0 || ledger.balance({ type: 'user', id: u.id }, 'MIUDA') >= fee);
    if (payers.length + botCount < 2) return;
    for (const u of payers) {
      if (fee > 0) ledger.move({ from: { type: 'user', id: u.id }, to: ESCROW, currency: 'MIUDA', amount: fee, kind: 'ENTRY_FEE', description: `Entrada — ${roomName}` }, at, { type: 'room', id: table?.id ?? null });
    }
    const used = new Set<string>();
    const players: (NewPlayer & { user: SUser | null })[] = payers.map((u) => ({ userId: u.id, name: u.displayName, avatar: u.avatar, bot: 'medio' as BotDifficulty, user: u }));
    for (let i = 0; i < botCount; i++) {
      let name = pick(BOT_NAMES);
      while (used.has(name)) name = pick(BOT_NAMES);
      used.add(name);
      if (fee > 0) ledger.move({ from: HOUSE, to: ESCROW, currency: 'MIUDA', amount: fee, kind: 'HOUSE_ENTRY', description: `Entrada de bot — ${roomName}` }, at, { type: 'room', id: table?.id ?? null });
      players.push({ userId: null, name, avatar: pick(CHARACTERS).id, bot: kind === 'bot' ? difficulty : 'medio', user: null });
    }
    players.sort(() => rng() - 0.5);
    const rounds = table?.config.rounds ?? pick([3, 5]);
    const state = createGame(players.map(({ user: _u, ...p }) => ({ ...p, bot: p.bot ?? 'medio' })), rounds, at.getTime());
    // simula toda a partida com a IA (humanos do seed jogam como "médio")
    advance(state, rng, at.getTime() + 10 * 3_600_000);
    if (state.status !== 'finished') throw new Error('seed: partida simulada não terminou');
    const realFinish = new Date(Math.min(at.getTime() + rand(4, 11) * 60_000, now.getTime() - 60_000));
    state.finishedAt = realFinish.getTime();
    schedule(realFinish, () => finish());
    const finish = () => {
    const seats = players.map((p) => {
      const a = p.user ? agentFor(table?.club ?? null, p.user) : { agentId: null, agentPct: null };
      return { userId: p.userId, isNpc: !!p.user?.isNpc, agentId: a.agentId, agentPct: a.agentPct, entryPaid: fee };
    });
    const s = computeSettlement({
      gameId, kind, roomName, rakePct: kind === 'bot' ? 0 : table!.config.rakePct, clubId: table?.club?.id ?? null,
      botDifficulty: kind === 'bot' ? difficulty : null, state, seats, rng,
    });
    for (const m of s.movements) ledger.move(m, realFinish, { type: 'game', id: gameId });
    let roomId = table?.id ?? null;
    if (kind === 'bot') {
      roomId = uid('room');
      botRooms.push([roomId, `B${roomCode(7)}`, 'bot', roomName, null, humans[0].id, 'closed', J({ rounds, entryFee: 0, maxPlayers: players.length, bots: botCount, botDifficulty: difficulty, botFill: false, category: 'taverna', rakePct: 0, countdownSec: 0 }), gameId, null, at, realFinish]);
    }
    gamesOut.push([gameId, roomId, kind, table?.club?.id ?? null, 'finished', J(state), 1, rounds, fee, s.pot, s.rake, s.prize, players.length, kind === 'bot' ? difficulty : null, true, at, realFinish]);
    s.seats.forEach((r) => {
      const p = players[r.seat];
      gpOut.push([gameId, r.seat, p.userId, p.name, p.avatar, p.user ? null : p.bot, state.players[r.seat].score, r.placement, r.isWinner, fee, r.prize, r.pointsEarned]);
      if (p.user && r.stats) {
        p.user.stats = applyGameStats(p.user.stats, r.stats);
        p.user.points += r.pointsEarned;
        if (!p.user.isNpc && r.isWinner && realFinish.getTime() > now.getTime() - 2 * DAY) {
          notifications.push([p.user.id, 'match', `Vitória em ${roomName}!`, `+${r.prize + r.miudaReward} Miúdas · +${r.pointsEarned} pontos`, `/partida/${gameId}`, J({ gameId }), realFinish, realFinish]);
        }
      }
    });
    if (kind === 'table') {
      const w = state.winners.map((i) => state.players[i].name).join(' e ');
      activities.push(['game_win', state.players[state.winners[0]].userId, table?.club?.id ?? null, s.prize > 0 ? `${w} venceu na mesa ${roomName} e levou ${s.prize} Miúdas.` : `${w} venceu na mesa ${roomName}.`, J({ gameId, prize: s.prize }), realFinish]);
    }
    };
  };

  // partidas históricas em mesas
  for (let i = 0; i < 110; i++) {
    const at = ago(rand(20, 14 * 24 * 60) * 60_000);
    const table = pick(tables);
    let pool = table.club ? activeIn(table.club) : [...residents, brunhilde, silas];
    pool = pool.filter((u) => u.createdAt.getTime() < at.getTime() && u !== mestre);
    if (table.club?.id === javali.id && aric.createdAt.getTime() < at.getTime() && rng() < 0.3) pool = [aric, ...pool.filter((u) => u !== aric)];
    const n = Math.min(pool.length, rand(2, table.config.maxPlayers));
    const chosen = pool[0] === aric ? [aric, ...pool.slice(1).sort(() => rng() - 0.5).slice(0, n - 1)] : [...pool].sort(() => rng() - 0.5).slice(0, n);
    const bots = chosen.length < 3 ? rand(1, 2) : rng() < 0.2 ? 1 : 0;
    schedule(at, () => simulate(at, 'table', table, chosen, Math.min(bots, table.config.maxPlayers - chosen.length), 'medio'));
  }
  // treinos do jogador demo
  for (let i = 0; i < 9; i++) {
    const at = ago(rand(30, 11 * 24 * 60) * 60_000);
    const d: BotDifficulty = pick(['facil', 'medio', 'medio', 'dificil']);
    schedule(at, () => simulate(at, 'bot', null, [aric], rand(1, 3), d));
  }
  // transferências e depósitos
  schedule(ago(9 * DAY), () => {
    ledger.move({ from: { type: 'user', id: silas.id }, to: { type: 'user', id: aric.id }, currency: 'MIUDA', amount: 300, kind: 'TRANSFER_OUT', toKind: 'TRANSFER_IN', description: `Para ${aric.displayName} — boas-vindas do agente`, toDescription: `De ${silas.displayName} — boas-vindas do agente` }, ago(9 * DAY), { type: 'transfer', id: null }, silas.id);
    silas.stats.transfers += 1;
  });
  schedule(ago(3 * DAY), () => {
    ledger.move({ from: { type: 'club', id: javali.id }, to: { type: 'user', id: residents[0].id }, currency: 'MIUDA', amount: 250, kind: 'CLUB_PAYOUT', description: 'Clube do Javali: prêmio do torneio semanal' }, ago(3 * DAY), { type: 'club', id: javali.id }, brunhilde.id);
    activities.push(['club_payout', brunhilde.id, javali.id, `${brunhilde.displayName} pagou 250 Miúdas do caixa para ${residents[0].displayName}.`, J({ amount: 250 }), ago(3 * DAY)]);
  });

  // fila de eventos em ordem cronológica (partidas agendam a própria liquidação)
  while (events.length) {
    events.sort((a, b) => a.at - b.at);
    events.shift()!.run();
  }

  // ------------------------------------------------------------ progressão (níveis e conquistas)
  const unlockedRows: unknown[][] = [];
  for (const u of users) {
    let prevLevel = 1;
    for (let pass = 0; pass < 3; pass++) {
      const lvl = levelFromPoints(u.points);
      for (let l = prevLevel + 1; l <= lvl; l++) {
        ledger.move({ from: HOUSE, to: { type: 'user', id: u.id }, currency: 'DIAMOND', amount: settings.levelUpDiamonds, kind: 'LEVEL_UP', description: `Nível ${l} alcançado` }, ago(rand(1, 5) * 3_600_000));
      }
      prevLevel = lvl;
      const avatars = CHARACTERS.filter((c) => isUnlocked(c.unlock, lvl, u.owned, c.id)).length;
      const fresh = earnedAchievements(u.stats, { points: u.points, avatarsUnlocked: avatars }).filter((a) => !u.achievements.some((x) => x.id === a.id));
      if (!fresh.length) break;
      for (const a of fresh) {
        const at = ago(rand(2, 9 * 24) * 3_600_000);
        u.achievements.push({ id: a.id, at });
        ledger.move({ from: HOUSE, to: { type: 'user', id: u.id }, currency: 'DIAMOND', amount: a.reward.diamonds, kind: 'ACHIEVEMENT', description: `Conquista: ${a.name}` }, at);
        u.points += a.reward.points;
        unlockedRows.push([u.id, a.id, at]);
        if (!u.isNpc) notifications.push([u.id, 'achievement', `Conquista desbloqueada: ${a.name}`, `${a.description} +${a.reward.diamonds} diamantes.`, '/conquistas', J({ achievementId: a.id }), at, at]);
      }
    }
    if (u.isNpc) u.lastSeen = ago(rand(0, 60) * 60_000);
  }

  // ------------------------------------------------------------ notificações e atividades extras
  const N = (u: SUser, kind: string, title: string, body: string, link: string | null, meta: object, at: Date, read = false) =>
    notifications.push([u.id, kind, title, body, link, J(meta), at, read ? at : null]);
  N(aric, 'reward', 'Bem-vindo à Toca do Javali!', 'Você recebeu 1000 Miúdas e 15 diamantes para começar.', '/perfil?aba=extrato', {}, aric.createdAt, true);
  N(aric, 'transfer', `+300 Miúdas de ${silas.displayName}`, 'Boas-vindas do agente.', '/perfil?aba=extrato', {}, ago(9 * DAY), true);
  N(aric, 'invite_club', 'Convite: Corvos da Noite', `${corvos.owner.displayName} convidou você para o clube Corvos da Noite.`, `/clubes/${corvos.id}`, { clubId: corvos.id, action: 'club_invite' }, ago(5 * 3_600_000));
  N(aric, 'system', 'Nova mesa lendária', 'A Balança de Ouro abriu no clube Mercadores de Ouro. Entrada de 1000 Miúdas.', '/jogar', {}, ago(26 * 3_600_000));
  for (const r of [residents[10], residents[21]]) {
    N(brunhilde, 'club_request', `Solicitação para ${javali.name}`, `${r.displayName} quer entrar no clube.`, `/clubes/${javali.id}/admin/notificacoes`, { clubId: javali.id, userId: r.id }, ago(rand(1, 20) * 3_600_000));
    activities.push(['club_request', r.id, javali.id, `${r.displayName} solicitou entrada no clube.`, '{}', ago(rand(1, 20) * 3_600_000)]);
  }
  N(silas, 'club', 'Você é agente do Clube do Javali', 'Convide jogadores e acompanhe suas comissões no Painel do Agente.', '/agente', {}, ago(20 * DAY), true);
  N(mestre, 'system', 'Central de Comando ativa', 'Todos os sistemas da Toca estão operando.', '/admin', {}, ago(2 * 3_600_000));
  for (const m of memberList) {
    if (m.status === 'active' && m.role !== 'owner' && m.joinedAt) activities.push(['club_join', m.user.id, m.club.id, `${m.user.displayName} entrou no clube ${m.club.name}.`, '{}', m.joinedAt]);
  }
  for (const c of clubs) activities.push(['club_create', c.owner.id, c.id, `${c.owner.displayName} fundou o clube ${c.name}.`, '{}', c.createdAt]);
  for (const u of users.filter((x) => !x.isNpc)) activities.push(['join', u.id, null, `${u.displayName} chegou à Toca pela primeira vez.`, '{}', u.createdAt]);

  // ------------------------------------------------------------ gravação em lote
  const userRows = users.map((u) => {
    const lvl = levelFromPoints(u.points);
    return [
      u.id, u.username, u.displayName, u.passwordHash, false, u.isSuperAdmin, u.isNpc, 'active', u.avatar,
      u === aric ? 'bronze' : u.frame, defaultTitle(lvl), u.points, u === aric ? 2 : 3, u === aric ? ago(7 * 60_000) : u.createdAt, J(u.owned), J(u.stats),
      !u.isNpc && u !== aric, u.createdAt, u.lastSeen,
    ];
  });
  await insertMany(q, 'users', ['id', 'username', 'display_name', 'password_hash', 'is_guest', 'is_super_admin', 'is_demo', 'status', 'avatar', 'frame', 'title', 'points', 'lives', 'lives_updated_at', 'owned_items', 'stats', 'tutorial_done', 'created_at', 'last_seen_at'], userRows);

  await insertMany(q, 'clubs', ['id', 'slug', 'name', 'description', 'emblem', 'color', 'type', 'rules', 'settings', 'owner_id', 'status', 'created_at'],
    clubs.map((c) => [c.id, c.slug, c.name, c.description, c.emblem, c.color, c.type, c.rules, J(c.settings), c.owner.id, 'active', c.createdAt]));
  await insertMany(q, 'club_members', ['club_id', 'user_id', 'role', 'status', 'agent_id', 'commission_pct', 'joined_at', 'created_at'],
    memberList.map((m) => [m.club.id, m.user.id, m.role, m.status, m.agent?.id ?? null, m.commission, m.joinedAt, m.createdAt]));

  // mesas: residentes sentados aguardando, começam logo que alguém visitar o lobby
  const seated = new Set<string>();
  const roomMembers: unknown[][] = [];
  for (const t of tables) {
    const pool = (t.club ? activeIn(t.club) : residents).filter((u) => u.isNpc && !seated.has(u.id) && ledger.balance({ type: 'user', id: u.id }, 'MIUDA') >= t.config.entryFee);
    const n = Math.min(pool.length, rand(2, Math.max(2, t.config.maxPlayers - 1)));
    pool.sort(() => rng() - 0.5).slice(0, n).forEach((u, seat) => {
      seated.add(u.id);
      roomMembers.push([t.id, u.id, seat, now]);
    });
    const hostId = t.club ? t.club.owner.id : mestre.id;
    roomsOut.push([t.id, t.code, 'table', t.name, t.club?.id ?? null, hostId, 'open', J(t.config), null, new Date(now.getTime() + rand(3, 30) * 1000), t.createdAt, now]);
  }
  await insertMany(q, 'rooms', ['id', 'code', 'kind', 'name', 'club_id', 'host_id', 'status', 'config', 'current_game_id', 'starts_at', 'created_at', 'updated_at'], [...roomsOut, ...botRooms]);
  await insertMany(q, 'room_members', ['room_id', 'user_id', 'seat', 'joined_at'], roomMembers);

  await insertMany(q, 'games', ['id', 'room_id', 'kind', 'club_id', 'status', 'state', 'version', 'rounds', 'entry_fee', 'pot', 'rake', 'prize', 'player_count', 'bot_difficulty', 'settled', 'created_at', 'finished_at'], gamesOut);
  await insertMany(q, 'game_players', ['game_id', 'seat', 'user_id', 'name', 'avatar', 'bot', 'score', 'placement', 'is_winner', 'entry_paid', 'prize', 'points_earned'], gpOut);

  await insertMany(q, 'wallets', ['id', 'owner_type', 'owner_id', 'currency', 'balance'], [...ledger.wallets.values()].map((w) => [w.id, w.owner_type, w.owner_id, w.currency, w.balance]));
  // extrato em ordem cronológica (ids crescentes)
  const txs = ledger.txs.map((t, i) => ({ ...t, i })).sort((a, b) => a.created_at.getTime() - b.created_at.getTime() || a.i - b.i);
  // saldo pós-lançamento precisa ser recalculado na ordem cronológica final
  const running = new Map<string, number>();
  for (const t of txs) {
    const b = (running.get(t.wallet_id) ?? 0) + t.amount;
    running.set(t.wallet_id, b);
    t.balance_after = b;
  }
  await insertMany(q, 'transactions', ['wallet_id', 'currency', 'amount', 'balance_after', 'kind', 'description', 'ref_type', 'ref_id', 'counterparty_wallet_id', 'actor_user_id', 'created_at'],
    txs.map((t) => [t.wallet_id, t.currency, t.amount, t.balance_after, t.kind, t.description, t.ref_type, t.ref_id, t.counterparty_wallet_id, t.actor_user_id, t.created_at]));

  await insertMany(q, 'achievements_unlocked', ['user_id', 'achievement_id', 'unlocked_at'], unlockedRows);
  activities.sort((a, b) => (a[5] as Date).getTime() - (b[5] as Date).getTime());
  await insertMany(q, 'activities', ['kind', 'actor_id', 'club_id', 'message', 'meta', 'created_at'], activities);
  notifications.sort((a, b) => (a[6] as Date).getTime() - (b[6] as Date).getTime());
  await insertMany(q, 'notifications', ['user_id', 'kind', 'title', 'body', 'link', 'meta', 'created_at', 'read_at'], notifications);

  await q.query(`INSERT INTO settings (key, value) VALUES ('global', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [J(settings)]);
  await q.query(`INSERT INTO settings (key, value) VALUES ('seeded', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [J({ at: now.toISOString(), version: 1 })]);

  return { users: users.length, clubs: clubs.length, tables: tables.length, games: gamesOut.length, transactions: txs.length };
}

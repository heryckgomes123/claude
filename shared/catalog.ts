/**
 * Catálogos do universo MIÚDA — personagens, níveis, conquistas, cosméticos
 * e constantes de economia. Fonte única para servidor e cliente.
 */

export type Unlock =
  | { type: 'free' }
  | { type: 'level'; level: number }
  | { type: 'diamonds'; cost: number };

export interface Character {
  id: string;
  name: string;
  role: string;
  lore: string;
  emblem: IconKey;
  colors: [string, string]; // [principal, secundária]
  unlock: Unlock;
}

export type IconKey =
  | 'boar' | 'hammer' | 'dagger' | 'axe' | 'bow' | 'feather' | 'coins' | 'pickaxe'
  | 'raven' | 'book' | 'crown' | 'flame' | 'moon' | 'tower' | 'wolf' | 'shield'
  | 'dice' | 'mug' | 'skull' | 'star' | 'key' | 'anvil' | 'gem' | 'heart';

export const CHARACTERS: Character[] = [
  { id: 'borg', name: 'Bórg', role: 'Guardião da Toca', lore: 'Ninguém entra sem que Bórg saiba. Ninguém sai devendo.', emblem: 'boar', colors: ['#8a5a2b', '#d9a441'], unlock: { type: 'free' } },
  { id: 'brun', name: 'Brun', role: 'Ferreiro', lore: 'Forja moedas, lâminas e apostas com a mesma mão firme.', emblem: 'hammer', colors: ['#7a3b1d', '#e0793a'], unlock: { type: 'free' } },
  { id: 'kael', name: 'Kael', role: 'Trapaceiro', lore: 'Jura que os dados gostam dele. Os dados discordam.', emblem: 'dagger', colors: ['#3d2f4f', '#b58be0'], unlock: { type: 'free' } },
  { id: 'ragnar', name: 'Ragnar', role: 'Mercenário', lore: 'Luta por Miúdas, bebe por glória, joga por esporte.', emblem: 'axe', colors: ['#5e1f1a', '#d4493a'], unlock: { type: 'level', level: 3 } },
  { id: 'lynx', name: 'Lynx', role: 'Caçador', lore: 'Paciente como a noite. Guarda os pontos na hora exata.', emblem: 'bow', colors: ['#2f4a2c', '#8cbf5a'], unlock: { type: 'free' } },
  { id: 'lupi', name: 'Lupi', role: 'Mensageiro', lore: 'Leva convites, recados e boatos por toda a Toca.', emblem: 'feather', colors: ['#2c4157', '#6fb3d9'], unlock: { type: 'free' } },
  { id: 'otis', name: 'Otis', role: 'Mercador', lore: 'Tudo tem preço. Inclusive o silêncio.', emblem: 'coins', colors: ['#6b4f16', '#f0c24b'], unlock: { type: 'diamonds', cost: 25 } },
  { id: 'brokk', name: 'Brokk', role: 'Mineiro', lore: 'Cava fundo nas minas e nas rodadas decisivas.', emblem: 'pickaxe', colors: ['#44403a', '#b9a58a'], unlock: { type: 'level', level: 5 } },
  { id: 'corvin', name: 'Corvin', role: 'Espião da Toca', lore: 'Sabe quem ganhou antes da última rolagem.', emblem: 'raven', colors: ['#1d1b24', '#8e8aa8'], unlock: { type: 'diamonds', cost: 40 } },
  { id: 'aldren', name: 'Aldren', role: 'Sábio', lore: 'Leu todos os tomos de probabilidade. Ainda perde às vezes.', emblem: 'book', colors: ['#3b2b56', '#e3c77a'], unlock: { type: 'level', level: 8 } },
];

export const CHARACTER_MAP = Object.fromEntries(CHARACTERS.map((c) => [c.id, c])) as Record<string, Character>;
export const DEFAULT_AVATAR = 'borg';

export interface Frame {
  id: string;
  name: string;
  color: string;
  glow: string;
  unlock: Unlock;
}

export const FRAMES: Frame[] = [
  { id: 'madeira', name: 'Madeira', color: '#6b4a2b', glow: 'rgba(107,74,43,0.0)', unlock: { type: 'free' } },
  { id: 'bronze', name: 'Bronze', color: '#b07a3c', glow: 'rgba(176,122,60,0.35)', unlock: { type: 'level', level: 2 } },
  { id: 'prata', name: 'Prata Velha', color: '#b8b3a8', glow: 'rgba(210,205,190,0.35)', unlock: { type: 'diamonds', cost: 20 } },
  { id: 'ouro', name: 'Ouro Envelhecido', color: '#d9a441', glow: 'rgba(240,190,80,0.5)', unlock: { type: 'diamonds', cost: 60 } },
  { id: 'brasa', name: 'Brasa Viva', color: '#e0582a', glow: 'rgba(255,110,40,0.65)', unlock: { type: 'level', level: 10 } },
];
export const FRAME_MAP = Object.fromEntries(FRAMES.map((f) => [f.id, f])) as Record<string, Frame>;

/* ---------------------------- Progressão ---------------------------- */

export const MAX_LEVEL = 50;

/** Nível a partir dos pontos: 1 + floor(sqrt(pontos/100)). */
export function levelFromPoints(points: number): number {
  return Math.min(MAX_LEVEL, 1 + Math.floor(Math.sqrt(Math.max(0, points) / 100)));
}
export function pointsForLevel(level: number): number {
  return 100 * (level - 1) * (level - 1);
}
export function levelProgress(points: number) {
  const level = levelFromPoints(points);
  const cur = pointsForLevel(level);
  const next = pointsForLevel(level + 1);
  return { level, current: points - cur, needed: next - cur, pct: level >= MAX_LEVEL ? 1 : (points - cur) / (next - cur) };
}

export const LEVEL_TITLES: { level: number; title: string }[] = [
  { level: 1, title: 'Forasteiro' },
  { level: 2, title: 'Aprendiz da Toca' },
  { level: 3, title: 'Frequentador' },
  { level: 5, title: 'Veterano' },
  { level: 8, title: 'Campeão da Mesa' },
  { level: 12, title: 'Lenda da Toca' },
  { level: 16, title: 'Mestre da Toca' },
  { level: 22, title: 'Senhor do Javali' },
];
export function titlesForLevel(level: number): string[] {
  return LEVEL_TITLES.filter((t) => t.level <= level).map((t) => t.title);
}
export function defaultTitle(level: number): string {
  const t = titlesForLevel(level);
  return t[t.length - 1] ?? 'Forasteiro';
}

/** Status VIP derivado do nível (reconhecimento visual na Toca). */
export const VIP_TIERS = [
  { id: 'bronze', label: 'VIP Bronze', minLevel: 1, color: '#c07a3a' },
  { id: 'prata', label: 'VIP Prata', minLevel: 5, color: '#c9c4b8' },
  { id: 'ouro', label: 'VIP Ouro', minLevel: 10, color: '#e8b04a' },
  { id: 'diamante', label: 'VIP Diamante', minLevel: 16, color: '#7fd4f2' },
] as const;
export function vipTier(level: number) {
  return [...VIP_TIERS].reverse().find((t) => level >= t.minLevel) ?? VIP_TIERS[0];
}

/* ------------------------------ Vidas ------------------------------ */

export const MAX_LIVES = 3;

/* ---------------------------- Conquistas ---------------------------- */

export type StatKey =
  | 'games' | 'wins' | 'bestTurn' | 'hotDice' | 'busts' | 'maxWinStreak' | 'bigTableWins'
  | 'clubsJoined' | 'clubsCreated' | 'transfers' | 'avatarsUnlocked' | 'level' | 'tableWins' | 'hardBotWins';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: IconKey;
  stat: StatKey;
  target: number;
  reward: { diamonds: number; points: number };
  tier: 'bronze' | 'prata' | 'ouro' | 'lenda';
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'primeira_partida', name: 'Primeira Partida', description: 'Jogue sua primeira partida na Toca.', icon: 'dice', stat: 'games', target: 1, reward: { diamonds: 5, points: 20 }, tier: 'bronze' },
  { id: 'primeira_vitoria', name: 'Primeira Vitória', description: 'Vença uma partida.', icon: 'crown', stat: 'wins', target: 1, reward: { diamonds: 10, points: 40 }, tier: 'bronze' },
  { id: 'frequentador', name: 'Cliente da Casa', description: 'Jogue 10 partidas.', icon: 'mug', stat: 'games', target: 10, reward: { diamonds: 10, points: 60 }, tier: 'bronze' },
  { id: 'veterano', name: 'Veterano', description: 'Jogue 50 partidas.', icon: 'shield', stat: 'games', target: 50, reward: { diamonds: 30, points: 200 }, tier: 'prata' },
  { id: 'grande_jogador', name: 'Grande Jogador', description: 'Vença 25 partidas.', icon: 'star', stat: 'wins', target: 25, reward: { diamonds: 40, points: 300 }, tier: 'ouro' },
  { id: 'mestre_da_toca', name: 'Mestre da Toca', description: 'Alcance o nível 16.', icon: 'boar', stat: 'level', target: 16, reward: { diamonds: 100, points: 0 }, tier: 'lenda' },
  { id: 'sangue_frio', name: 'Sangue Frio', description: 'Guarde 1.500 pontos em um único turno.', icon: 'flame', stat: 'bestTurn', target: 1500, reward: { diamonds: 15, points: 80 }, tier: 'prata' },
  { id: 'dados_quentes', name: 'Dados Quentes', description: 'Pontue com os seis dados (dados quentes) 5 vezes.', icon: 'flame', stat: 'hotDice', target: 5, reward: { diamonds: 15, points: 80 }, tier: 'prata' },
  { id: 'azar_do_javali', name: 'Azar do Javali', description: 'Leve 20 "Javalis" (perca o turno inteiro).', icon: 'skull', stat: 'busts', target: 20, reward: { diamonds: 5, points: 30 }, tier: 'bronze' },
  { id: 'invicto', name: 'Invicto', description: 'Vença 3 partidas seguidas.', icon: 'crown', stat: 'maxWinStreak', target: 3, reward: { diamonds: 20, points: 120 }, tier: 'ouro' },
  { id: 'mesa_cheia', name: 'Mesa Cheia', description: 'Vença uma mesa com 5 ou mais jogadores.', icon: 'tower', stat: 'bigTableWins', target: 1, reward: { diamonds: 20, points: 150 }, tier: 'ouro' },
  { id: 'mestre_das_mesas', name: 'Rei das Mesas', description: 'Vença 10 partidas em mesas com entrada.', icon: 'coins', stat: 'tableWins', target: 10, reward: { diamonds: 30, points: 200 }, tier: 'ouro' },
  { id: 'cacador_de_mestres', name: 'Caçador de Mestres', description: 'Vença 5 partidas contra bots difíceis.', icon: 'bow', stat: 'hardBotWins', target: 5, reward: { diamonds: 25, points: 150 }, tier: 'prata' },
  { id: 'irmandade', name: 'Irmandade', description: 'Entre em um clube.', icon: 'wolf', stat: 'clubsJoined', target: 1, reward: { diamonds: 5, points: 30 }, tier: 'bronze' },
  { id: 'fundador', name: 'Fundador', description: 'Funde o seu próprio clube.', icon: 'anvil', stat: 'clubsCreated', target: 1, reward: { diamonds: 10, points: 60 }, tier: 'prata' },
  { id: 'mercador', name: 'Mercador', description: 'Faça uma transferência de Miúdas.', icon: 'coins', stat: 'transfers', target: 1, reward: { diamonds: 5, points: 20 }, tier: 'bronze' },
  { id: 'colecionador', name: 'Colecionador', description: 'Tenha 7 personagens desbloqueados.', icon: 'gem', stat: 'avatarsUnlocked', target: 7, reward: { diamonds: 25, points: 100 }, tier: 'ouro' },
];
export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<string, Achievement>;

/* ----------------------------- Clubes ----------------------------- */

export const CLUB_EMBLEMS: IconKey[] = ['boar', 'axe', 'crown', 'raven', 'anvil', 'flame', 'moon', 'coins', 'tower', 'wolf', 'skull', 'mug'];
export const CLUB_COLORS: { id: string; name: string; value: string }[] = [
  { id: 'bronze', name: 'Bronze', value: '#b07a3c' },
  { id: 'sangue', name: 'Sangue', value: '#9e2b25' },
  { id: 'floresta', name: 'Floresta', value: '#3f6b3a' },
  { id: 'noite', name: 'Noite', value: '#3a4a78' },
  { id: 'ouro', name: 'Ouro', value: '#d9a441' },
  { id: 'brasa', name: 'Brasa', value: '#d9622b' },
  { id: 'cinza', name: 'Cinza', value: '#7d7a73' },
  { id: 'vinho', name: 'Vinho', value: '#6b2346' },
];
export type ClubType = 'aberto' | 'solicitacao' | 'convite';
export const CLUB_TYPES: { id: ClubType; label: string; description: string }[] = [
  { id: 'aberto', label: 'Aberto', description: 'Qualquer jogador pode entrar.' },
  { id: 'solicitacao', label: 'Com aprovação', description: 'Jogadores solicitam entrada e a administração aprova.' },
  { id: 'convite', label: 'Somente convite', description: 'Apenas jogadores convidados podem entrar.' },
];

export type TableCategory = 'taverna' | 'bronze' | 'ouro' | 'lendaria';
export const TABLE_CATEGORIES: { id: TableCategory; label: string; hint: string }[] = [
  { id: 'taverna', label: 'Taverna', hint: 'Entradas baixas, clima amistoso.' },
  { id: 'bronze', label: 'Bronze', hint: 'Mesas intermediárias.' },
  { id: 'ouro', label: 'Ouro', hint: 'Apostas altas.' },
  { id: 'lendaria', label: 'Lendária', hint: 'Somente os mais ousados.' },
];

/* ----------------------------- Economia ----------------------------- */

export const CURRENCY = { MIUDA: 'MIUDA', DIAMOND: 'DIAMOND' } as const;
export type Currency = (typeof CURRENCY)[keyof typeof CURRENCY];

export type TxKind =
  | 'WELCOME_BONUS' | 'ENTRY_FEE' | 'PRIZE' | 'REFUND' | 'RAKE' | 'AGENT_COMMISSION'
  | 'BOT_REWARD' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ACHIEVEMENT' | 'LEVEL_UP'
  | 'PURCHASE' | 'LIFE_REFILL' | 'ADMIN_CREDIT' | 'ADMIN_DEBIT' | 'CLUB_PAYOUT' | 'CLUB_DEPOSIT' | 'HOUSE_ENTRY' | 'HOUSE_PRIZE' | 'GENESIS';

export const TX_LABELS: Record<TxKind, string> = {
  WELCOME_BONUS: 'Bônus de boas-vindas',
  ENTRY_FEE: 'Entrada de mesa',
  PRIZE: 'Prêmio de partida',
  REFUND: 'Reembolso',
  RAKE: 'Taxa da mesa',
  AGENT_COMMISSION: 'Comissão de agente',
  BOT_REWARD: 'Recompensa contra bot',
  TRANSFER_IN: 'Transferência recebida',
  TRANSFER_OUT: 'Transferência enviada',
  ACHIEVEMENT: 'Conquista',
  LEVEL_UP: 'Subiu de nível',
  PURCHASE: 'Compra no Relicário',
  LIFE_REFILL: 'Recarga de vidas',
  ADMIN_CREDIT: 'Crédito administrativo',
  ADMIN_DEBIT: 'Débito administrativo',
  CLUB_PAYOUT: 'Pagamento do clube',
  CLUB_DEPOSIT: 'Depósito no clube',
  HOUSE_ENTRY: 'Entrada paga pela casa (bots)',
  HOUSE_PRIZE: 'Prêmio retido pela casa',
  GENESIS: 'Tesouro inicial',
};

export const DEFAULT_SETTINGS = {
  welcomeBonus: 1000,
  welcomeDiamonds: 15,
  lifeRegenMinutes: 20,
  lifeRefillCostDiamonds: 5,
  defaultRakePct: 10,
  defaultAgentCommissionPct: 30,
  levelUpDiamonds: 5,
  maxTransfer: 50000,
  announcement: '',
  maintenance: false,
};
export type GlobalSettings = typeof DEFAULT_SETTINGS;

export const BOT_REWARDS = {
  facil: { win: { points: 30, miudas: 10, diamondChance: 0.1 }, loss: { points: 5 } },
  medio: { win: { points: 55, miudas: 25, diamondChance: 0.2 }, loss: { points: 8 } },
  dificil: { win: { points: 90, miudas: 50, diamondChance: 0.35 }, loss: { points: 12 } },
} as const;

export const TABLE_POINTS = { winBase: 80, winPerPlayer: 15, loss: 15 };

/** Nomes dos bots da casa (preenchem mesas e partidas de treino). */
export const BOT_NAMES = [
  'Grimbold', 'Hilda Cerveja-Forte', 'Tobias Mão-Leve', 'Sigrun', 'Velho Harald', 'Mira dos Dados',
  'Fenwick', 'Olga a Ruiva', 'Bartolomeu', 'Isolde', 'Gorm', 'Edric Olho-Torto', 'Petra', 'Ulf',
];

export const ROLES = ['PLAYER', 'CLUB_ADMIN', 'AGENT', 'SUPER_ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export function isUnlocked(unlock: Unlock, level: number, owned: string[], id: string): boolean {
  if (unlock.type === 'free') return true;
  if (unlock.type === 'level') return level >= unlock.level;
  return owned.includes(id);
}

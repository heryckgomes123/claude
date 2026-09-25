-- MIÚDA — Da Toca do Javali
-- Esquema PostgreSQL gerado a partir de server/db/schema.ts (não edite à mão).
-- As migrações são aplicadas automaticamente pela aplicação.

-- Migração 1: base
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT,
  is_guest BOOLEAN NOT NULL DEFAULT false,
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','banned')),
  avatar TEXT NOT NULL DEFAULT 'borg',
  frame TEXT NOT NULL DEFAULT 'madeira',
  title TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  lives INTEGER NOT NULL DEFAULT 3,
  lives_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  owned_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  tutorial_done BOOLEAN NOT NULL DEFAULT false,
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_points_idx ON users (points DESC);

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('user','club','house')),
  owner_id TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('MIUDA','DIAMOND')),
  balance BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_type, owner_id, currency),
  CHECK (balance >= 0)
);

CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  currency TEXT NOT NULL,
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  kind TEXT NOT NULL,
  description TEXT NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  counterparty_wallet_id TEXT,
  actor_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS transactions_wallet_idx ON transactions (wallet_id, id DESC);
CREATE INDEX IF NOT EXISTS transactions_created_idx ON transactions (created_at);

CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  emblem TEXT NOT NULL DEFAULT 'boar',
  color TEXT NOT NULL DEFAULT 'bronze',
  type TEXT NOT NULL DEFAULT 'aberto' CHECK (type IN ('aberto','solicitacao','convite')),
  rules TEXT NOT NULL DEFAULT '',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  owner_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS club_members (
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','agent','member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','invited','banned')),
  agent_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  commission_pct INTEGER,
  invited_by TEXT,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);
CREATE INDEX IF NOT EXISTS club_members_user_idx ON club_members (user_id);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('private','table','bot')),
  name TEXT NOT NULL,
  club_id TEXT REFERENCES clubs(id) ON DELETE CASCADE,
  host_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','playing','closed')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_game_id TEXT,
  starts_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rooms_kind_idx ON rooms (kind, status);

CREATE TABLE IF NOT EXISTS room_members (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seat INTEGER NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS room_viewers (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('private','table','bot')),
  club_id TEXT REFERENCES clubs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'playing' CHECK (status IN ('playing','finished','aborted')),
  state JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  rounds INTEGER NOT NULL,
  entry_fee BIGINT NOT NULL DEFAULT 0,
  pot BIGINT NOT NULL DEFAULT 0,
  rake BIGINT NOT NULL DEFAULT 0,
  prize BIGINT NOT NULL DEFAULT 0,
  player_count INTEGER NOT NULL,
  bot_difficulty TEXT,
  settled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS games_status_idx ON games (status);
CREATE INDEX IF NOT EXISTS games_created_idx ON games (created_at);

CREATE TABLE IF NOT EXISTS game_players (
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  seat INTEGER NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  bot TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  placement INTEGER,
  is_winner BOOLEAN NOT NULL DEFAULT false,
  entry_paid BIGINT NOT NULL DEFAULT 0,
  prize BIGINT NOT NULL DEFAULT 0,
  points_earned INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (game_id, seat)
);
CREATE INDEX IF NOT EXISTS game_players_user_idx ON game_players (user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, id DESC);

CREATE TABLE IF NOT EXISTS achievements_unlocked (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS activities (
  id BIGSERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  actor_id TEXT,
  club_id TEXT,
  message TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activities_created_idx ON activities (created_at DESC);
CREATE INDEX IF NOT EXISTS activities_club_idx ON activities (club_id, created_at DESC);

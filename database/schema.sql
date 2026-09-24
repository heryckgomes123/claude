-- ════════════════════════════════════════════════════════════════
-- LIFT 2.0 — Modelo de dados (PostgreSQL 15+)
-- Planejamento para o backend. Compatível com Supabase.
-- Tipos TypeScript equivalentes: src/types/models.ts
-- ════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────────
create type user_role           as enum ('student', 'coach', 'admin');
create type workout_level       as enum ('iniciante', 'intermediário', 'avançado');
create type booking_status      as enum ('booked', 'waitlist', 'cancelled', 'attended', 'no_show');
create type subscription_status as enum ('active', 'pending', 'expired', 'cancelled');
create type notification_type   as enum ('treino', 'aula', 'desafio', 'conquista', 'lembrete', 'aviso');
create type metric_type         as enum ('workouts', 'checkins', 'minutes', 'streak', 'classes', 'goals', 'custom');
create type achievement_tier    as enum ('bronze', 'silver', 'gold', 'lift');
create type ai_role             as enum ('user', 'assistant');
create type xp_event_type       as enum ('checkin', 'workout', 'set', 'streak', 'challenge', 'achievement', 'class');

-- ── Unidades ────────────────────────────────────────────────────
create table units (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  latitude    double precision,
  longitude   double precision,
  created_at  timestamptz not null default now()
);

-- ── users / profiles ───────────────────────────────────────────
create table users (
  id          uuid primary key default gen_random_uuid(),   -- = auth.users.id no Supabase
  email       text not null unique,
  role        user_role not null default 'student',
  created_at  timestamptz not null default now()
);

create table profiles (
  user_id       uuid primary key references users(id) on delete cascade,
  name          text not null,
  avatar_url    text,
  unit_id       uuid references units(id),
  birth_date    date,
  focus         text[] not null default '{}',
  member_since  date not null default current_date,
  preferences   jsonb not null default '{}'::jsonb,         -- som, vibração, gráficos 3D
  updated_at    timestamptz not null default now()
);

-- ── exercises / workouts ───────────────────────────────────────
create table exercises (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text not null default '',
  cues           text[] not null default '{}',
  muscle_groups  text[] not null default '{}',
  equipment      text[] not null default '{}',
  media_url      text,                                      -- vídeo/animação/modelo 3D
  created_by     uuid references users(id),
  created_at     timestamptz not null default now()
);

create table workouts (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null,                         -- "Treino B"
  title              text not null,                         -- "Performance"
  focus              text,
  modality           text,
  level              workout_level not null default 'intermediário',
  estimated_minutes  int not null check (estimated_minutes > 0),
  notes              text,
  coach_id           uuid references users(id),
  student_id         uuid references users(id),             -- null = modelo reutilizável
  weekday            smallint check (weekday between 0 and 6),
  active             boolean not null default true,
  created_at         timestamptz not null default now()
);

create table workout_exercises (
  workout_id    uuid not null references workouts(id) on delete cascade,
  position      smallint not null,
  exercise_id   uuid not null references exercises(id),
  sets          smallint not null check (sets > 0),
  reps          text not null,                              -- "10", "8-10", "30s"
  load          text,
  rest_seconds  int not null default 60,
  notes         text,
  primary key (workout_id, position)
);

create table workout_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  workout_id        uuid references workouts(id),
  started_at        timestamptz not null,
  finished_at       timestamptz,
  duration_minutes  int,
  perceived_effort  smallint check (perceived_effort between 1 and 10),
  notes             text,
  created_at        timestamptz not null default now()
);
create index on workout_sessions (user_id, started_at desc);

create table workout_sets (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references workout_sessions(id) on delete cascade,
  exercise_id   uuid not null references exercises(id),
  set_number    smallint not null,
  reps          text,
  load          text,
  completed_at  timestamptz not null default now()
);

-- ── check-ins ──────────────────────────────────────────────────
create table checkins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  unit_id     uuid not null references units(id),
  at          timestamptz not null default now(),
  method      text not null default 'app',                  -- app | qr | catraca
  created_at  timestamptz not null default now()
);
-- no máximo 1 check-in por aluno por dia (fuso da academia)
create unique index checkins_one_per_day on checkins (user_id, ((at at time zone 'America/Sao_Paulo')::date));

-- ── classes / bookings ─────────────────────────────────────────
create table classes (
  id                uuid primary key default gen_random_uuid(),
  unit_id           uuid not null references units(id),
  modality          text not null,
  title             text not null,
  coach_id          uuid references users(id),
  starts_at         timestamptz not null,
  duration_minutes  int not null,
  capacity          int not null check (capacity > 0),
  level             text,
  cancelled         boolean not null default false
);
create index on classes (starts_at);

create table class_bookings (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references classes(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  status      booking_status not null default 'booked',
  position    int,                                          -- posição na lista de espera
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (class_id, user_id)
);
-- A regra "limite de vagas" deve ser garantida no servidor (transação + lock da aula).

-- ── gamificação ────────────────────────────────────────────────
create table xp_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  type        xp_event_type not null,
  amount      int not null,
  source_id   uuid,                                         -- sessão, check-in, desafio...
  created_at  timestamptz not null default now()
);
create index on xp_events (user_id, created_at desc);

create table challenges (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null default '',
  metric       metric_type not null,
  target       int not null check (target > 0),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  xp_reward    int not null default 0,
  accent       text not null default 'lift',
  created_by   uuid references users(id),
  check (ends_at > starts_at)
);

create table challenge_participants (
  challenge_id  uuid not null references challenges(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  joined_at     timestamptz not null default now(),
  completed_at  timestamptz,
  primary key (challenge_id, user_id)
);

create table achievements (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  icon         text not null,
  name         text not null,
  description  text not null,
  tier         achievement_tier not null default 'bronze',
  metric       metric_type not null,
  target       int not null,
  xp_reward    int not null default 0
);

create table user_achievements (
  user_id         uuid not null references users(id) on delete cascade,
  achievement_id  uuid not null references achievements(id) on delete cascade,
  progress        int not null default 0,
  unlocked_at     timestamptz,
  primary key (user_id, achievement_id)
);

create table goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  title         text not null,
  description   text,
  metric        metric_type not null,
  target        int not null,
  progress      int not null default 0,                     -- usado quando metric = custom
  unit          text not null default '',
  period        text not null default 'livre',              -- semana | mês | livre
  due_at        timestamptz,
  completed_at  timestamptz,
  created_by    uuid references users(id),                  -- aluno ou coach
  created_at    timestamptz not null default now()
);

-- ── notifications ──────────────────────────────────────────────
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,  -- null = aviso geral
  type        notification_type not null,
  title       text not null,
  body        text not null,
  href        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index on notifications (user_id, created_at desc);

create table push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  endpoint    text not null unique,
  keys        jsonb not null,
  created_at  timestamptz not null default now()
);

-- ── plans / subscriptions ──────────────────────────────────────
create table plans (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text not null default '',
  benefits       text[] not null default '{}',
  price_cents    int,                                       -- definido pelo financeiro
  billing_cycle  text not null default 'mensal',
  active         boolean not null default true
);

create table subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  plan_id     uuid not null references plans(id),
  status      subscription_status not null default 'pending',
  started_at  timestamptz not null default now(),
  renews_at   timestamptz not null,
  external_id text                                          -- id no gateway de pagamento
);

-- ── IA ─────────────────────────────────────────────────────────
create table ai_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  title       text not null default 'Conversa',
  created_at  timestamptz not null default now()
);

create table ai_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references ai_conversations(id) on delete cascade,
  role             ai_role not null,
  content          text not null,
  provider         text,                                    -- anthropic | demo-rules | ...
  model            text,
  tokens_in        int,
  tokens_out       int,
  created_at       timestamptz not null default now()
);
create index on ai_messages (conversation_id, created_at);

-- ── comunidade (fase futura) ───────────────────────────────────
create table feed_items (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references users(id) on delete cascade,
  type        text not null,                                -- achievement | workout | challenge | ranking | post
  payload     jsonb not null default '{}'::jsonb,
  visibility  text not null default 'unit',
  hidden      boolean not null default false,               -- moderação
  created_at  timestamptz not null default now()
);
create table feed_reactions (
  item_id     uuid not null references feed_items(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  kind        text not null default 'fire',
  primary key (item_id, user_id)
);
create table feed_comments (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references feed_items(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  body        text not null check (char_length(body) <= 500),
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── Segurança (Supabase / RLS) ─────────────────────────────────
-- Habilite RLS em todas as tabelas com dados de aluno e crie políticas como:
--   alter table workout_sessions enable row level security;
--   create policy "aluno vê as próprias sessões" on workout_sessions
--     for select using (auth.uid() = user_id);
-- Escritas sensíveis (xp_events, user_achievements, class_bookings, subscriptions)
-- devem ser feitas APENAS pelo servidor (service role), nunca direto do cliente.

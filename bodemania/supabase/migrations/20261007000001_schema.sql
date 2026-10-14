-- Bodemania · schema principal
-- Convenções: dinheiro em numeric(10,2) (reais); datas em timestamptz; textos em português.

create type public.order_status as enum ('aguardando', 'pago', 'producao', 'enviado', 'entregue', 'cancelado');

-- ───────────────────────── Clientes ─────────────────────────

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  email       text not null default '',
  cpf         text not null default '',          -- só dígitos
  phone       text not null default '',          -- só dígitos
  newsletter  boolean not null default true,
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now()
);

create table public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  label       text not null default 'Casa',
  recipient   text not null,
  cep         text not null check (cep ~ '^\d{8}$'),
  street      text not null,
  number      text not null,
  complement  text not null default '',
  district    text not null,
  city        text not null,
  uf          text not null check (char_length(uf) = 2),
  created_at  timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);

-- ───────────────────────── Catálogo ─────────────────────────

create table public.products (
  id            text primary key,
  slug          text not null unique,
  name          text not null,
  category      text not null,
  price         numeric(10,2) not null check (price >= 0),
  compare_at    numeric(10,2) check (compare_at is null or compare_at >= 0),
  short         text not null default '',
  description   jsonb not null default '[]',      -- ["parágrafo", ...]
  highlights    jsonb not null default '[]',      -- ["texto", ...]
  specs         jsonb not null default '[]',      -- [["Medidas","35 × 40 cm"], ...]
  art           text not null default 'servico',  -- ilustração de reserva (quando não há foto)
  tone          text,
  badge         text,
  kind          text not null default 'physical' check (kind in ('physical', 'digital', 'service')),
  weight        numeric(8,3) not null default 0 check (weight >= 0),   -- kg
  width_cm      numeric(6,1) not null default 16,
  height_cm     numeric(6,1) not null default 6,
  length_cm     numeric(6,1) not null default 22,
  lead_days     integer not null default 1 check (lead_days >= 0),
  stock         integer check (stock is null or stock >= 0),            -- null = sem controle
  options       jsonb not null default '[]',
  personalization jsonb,
  photo_upload  jsonb,
  tags          text[] not null default '{}',
  href          text,
  price_from    boolean not null default false,
  images        text[] not null default '{}',     -- URLs públicas das fotos reais
  active        boolean not null default true,
  sort          integer not null default 100,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index products_category_idx on public.products (category) where active;

create table public.coupons (
  code          text primary key check (code = upper(code)),
  label         text not null,
  percent       numeric(5,4) check (percent is null or (percent > 0 and percent <= 1)),   -- 0.10 = 10%
  amount        numeric(10,2) check (amount is null or amount > 0),
  free_shipping boolean not null default false,
  min_subtotal  numeric(10,2),
  max_uses      integer,
  uses          integer not null default 0,
  expires_at    timestamptz,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  check (percent is not null or amount is not null or free_shipping)
);

-- ───────────────────────── Pedidos ─────────────────────────

create sequence public.order_seq start 10420;

create table public.orders (
  id              text primary key,
  user_id         uuid references public.profiles (id) on delete set null,
  status          public.order_status not null default 'aguardando',
  subtotal        numeric(10,2) not null check (subtotal >= 0),
  discount        numeric(10,2) not null default 0 check (discount >= 0),
  pix_discount    numeric(10,2) not null default 0 check (pix_discount >= 0),
  shipping        numeric(10,2) not null default 0 check (shipping >= 0),
  total           numeric(10,2) not null check (total >= 0),
  coupon          text,
  payment         jsonb not null default '{}',     -- método, ids do gateway, código Pix, linha do boleto…
  customer        jsonb not null,                  -- {name,email,cpf,phone} (cópia no momento da compra)
  address         jsonb,                           -- endereço de entrega (cópia)
  shipping_option jsonb not null,                  -- {id,label,detail,price,days}
  lead_days       integer not null default 0,
  estimate        timestamptz,
  tracking        text,
  notes           text,
  digital_only    boolean not null default false,
  expires_at      timestamptz,                     -- pedidos 'aguardando' vencem aqui e devolvem o estoque
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_expiry_idx on public.orders (expires_at) where status = 'aguardando';

create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        text not null references public.orders (id) on delete cascade,
  product_id      text not null,
  name            text not null,
  unit_price      numeric(10,2) not null check (unit_price >= 0),
  qty             integer not null check (qty > 0 and qty <= 99),
  variant         jsonb not null default '[]',     -- ["Rito: REAA", ...]
  personalization text,
  photo_path      text,                            -- storage: order-uploads/<uid>/...
  print           jsonb,                           -- orçamento 3D: arquivo, material, qualidade, gramas, horas…
  art             text not null default 'servico',
  color           text,
  universe        text not null default 'maconaria',
  kind            text not null default 'physical'
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_events (
  id        bigint generated always as identity primary key,
  order_id  text not null references public.orders (id) on delete cascade,
  status    public.order_status not null,
  note      text not null default '',
  actor     uuid,
  at        timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, at);

-- ───────────────────────── updated_at ─────────────────────────

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger orders_touch   before update on public.orders   for each row execute function public.touch_updated_at();

-- ───────────────────────── Perfil automático no cadastro ─────────────────────────

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, email, name, cpf, phone, newsletter)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'name', ''), 120),
    left(regexp_replace(coalesce(new.raw_user_meta_data ->> 'cpf', ''), '\D', '', 'g'), 11),
    left(regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g'), 11),
    coalesce(nullif(new.raw_user_meta_data ->> 'newsletter', '') = 'true', true)
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

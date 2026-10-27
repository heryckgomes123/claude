-- Instalação da Bodemania no projeto fzhzprzgzccmwrkujafs. Rodar UMA vez no SQL Editor.
-- Ordem: schema → RLS → funções → storage → cron → seed (28 produtos). Gerado a partir de supabase/migrations e supabase/seed.sql.

-- ===== migrations/20261007000001_schema.sql =====
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

-- ===== migrations/20261007000002_rls.sql =====
-- Bodemania · permissões (RLS)
-- Regra de ouro: o navegador (anon/authenticated) só LÊ o que é dele e escreve o mínimo.
-- Todo o resto (criar pedido, mudar status, baixar estoque) acontece em funções com service_role.

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

alter table public.profiles     enable row level security;
alter table public.addresses    enable row level security;
alter table public.products     enable row level security;
alter table public.coupons      enable row level security;
alter table public.orders       enable row level security;
alter table public.order_items  enable row level security;
alter table public.order_events enable row level security;

-- Começa sem nada e libera tabela por tabela.
revoke all on public.profiles, public.addresses, public.products, public.coupons,
              public.orders, public.order_items, public.order_events from anon, authenticated;
revoke all on sequence public.order_seq from anon, authenticated;

-- ── profiles: cada um vê e edita o próprio (menos o papel); admin vê todos ──
grant select on public.profiles to authenticated;
grant update (name, cpf, phone, newsletter) on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ── addresses: só do próprio dono ──
grant select, insert, update, delete on public.addresses to authenticated;
create policy addresses_all on public.addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── products: vitrine pública (só ativos); admin gerencia ──
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
create policy products_select on public.products for select to anon, authenticated
  using (active or public.is_admin());
create policy products_insert on public.products for insert to authenticated with check (public.is_admin());
create policy products_update on public.products for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy products_delete on public.products for delete to authenticated using (public.is_admin());

-- ── coupons: ninguém lista cupons; cliente valida via check_coupon(); admin gerencia ──
grant select, insert, update, delete on public.coupons to authenticated;
create policy coupons_admin on public.coupons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── pedidos: leitura do dono (e admin). Escrita só via service_role. ──
grant select on public.orders, public.order_items, public.order_events to authenticated;
create policy orders_select on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy order_items_select on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy order_events_select on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ===== migrations/20261007000003_functions.sql =====
-- Bodemania · regras de negócio no banco (atômicas: estoque, cupom, pagamento, vencimento)
-- Funções marcadas "somente servidor" só podem ser executadas com a chave service_role.

-- ───────────────────────── Cupom (público) ─────────────────────────

create function public.check_coupon(p_code text, p_subtotal numeric)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare c public.coupons;
begin
  select * into c from public.coupons where code = upper(trim(p_code));
  if not found
     or not c.active
     or (c.expires_at is not null and c.expires_at < now())
     or (c.max_uses is not null and c.uses >= c.max_uses) then
    return jsonb_build_object('ok', false, 'error', 'Cupom inválido ou expirado.');
  end if;
  if c.min_subtotal is not null and p_subtotal < c.min_subtotal then
    return jsonb_build_object('ok', false, 'error',
      format('Válido para pedidos a partir de R$ %s.', to_char(c.min_subtotal, 'FM999G999D00')));
  end if;
  return jsonb_build_object('ok', true, 'code', c.code, 'label', c.label, 'percent', c.percent,
                            'amount', c.amount, 'freeShipping', c.free_shipping, 'min', c.min_subtotal);
end $$;
revoke all on function public.check_coupon(text, numeric) from public;
grant execute on function public.check_coupon(text, numeric) to anon, authenticated, service_role;

-- ───────────────────────── Cancelar + devolver estoque (somente servidor) ─────────────────────────

create function public.cancel_order(p_order_id text, p_note text, p_restock boolean default true, p_actor uuid default null)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0001'; end if;
  if o.status = 'cancelado' then return false; end if;

  update public.orders set status = 'cancelado' where id = p_order_id;
  insert into public.order_events (order_id, status, note, actor) values (p_order_id, 'cancelado', p_note, p_actor);

  if p_restock then
    update public.products p set stock = p.stock + i.qty
    from (select product_id, sum(qty)::int as qty from public.order_items where order_id = p_order_id group by product_id) i
    where p.id = i.product_id and p.stock is not null;
  end if;
  -- cupom não chegou a ser aproveitado se nada foi pago
  if o.coupon is not null and o.status = 'aguardando' then
    update public.coupons set uses = greatest(uses - 1, 0) where code = o.coupon;
  end if;
  return true;
end $$;
revoke all on function public.cancel_order(text, text, boolean, uuid) from public, anon, authenticated;
grant execute on function public.cancel_order(text, text, boolean, uuid) to service_role;

-- ───────────────────────── Criar pedido (somente servidor) ─────────────────────────
-- p_order: totais, cliente, endereço, frete, pagamento. p_items: linhas já precificadas pelo servidor.

create function public.place_order(p_order jsonb, p_items jsonb)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id text := 'BM-' || nextval('public.order_seq');
  it jsonb;
  prod public.products;
  v_qty int;
  v_coupon text := nullif(p_order ->> 'coupon', '');
begin
  for it in select * from jsonb_array_elements(p_items) loop
    select * into prod from public.products where id = it ->> 'product_id' for update;
    if not found or not prod.active then
      raise exception 'product_unavailable' using errcode = 'P0001', detail = it ->> 'product_id';
    end if;
    v_qty := (it ->> 'qty')::int;
    if prod.stock is not null then
      if prod.stock < v_qty then
        raise exception 'out_of_stock' using errcode = 'P0001', detail = prod.id;
      end if;
      update public.products set stock = stock - v_qty where id = prod.id;
    end if;
  end loop;

  if v_coupon is not null then
    update public.coupons set uses = uses + 1
    where code = v_coupon and active and (max_uses is null or uses < max_uses) and (expires_at is null or expires_at > now());
    if not found then raise exception 'coupon_unavailable' using errcode = 'P0001'; end if;
  end if;

  insert into public.orders (id, user_id, subtotal, discount, pix_discount, shipping, total, coupon, payment,
                             customer, address, shipping_option, lead_days, estimate, notes, digital_only, expires_at)
  values (v_id, (p_order ->> 'user_id')::uuid, (p_order ->> 'subtotal')::numeric, (p_order ->> 'discount')::numeric,
          (p_order ->> 'pix_discount')::numeric, (p_order ->> 'shipping')::numeric, (p_order ->> 'total')::numeric,
          v_coupon, coalesce(p_order -> 'payment', '{}'), p_order -> 'customer', p_order -> 'address',
          p_order -> 'shipping_option', coalesce((p_order ->> 'lead_days')::int, 0),
          (p_order ->> 'estimate')::timestamptz, nullif(p_order ->> 'notes', ''),
          coalesce((p_order ->> 'digital_only')::boolean, false), (p_order ->> 'expires_at')::timestamptz);

  insert into public.order_items (order_id, product_id, name, unit_price, qty, variant, personalization, photo_path,
                                  print, art, color, universe, kind)
  select v_id, x.product_id, x.name, x.unit_price, x.qty, coalesce(x.variant, '[]'), nullif(x.personalization, ''),
         x.photo_path, x.print, coalesce(x.art, 'servico'), x.color, coalesce(x.universe, 'maconaria'), coalesce(x.kind, 'physical')
  from jsonb_to_recordset(p_items) as x(product_id text, name text, unit_price numeric, qty int, variant jsonb,
       personalization text, photo_path text, print jsonb, art text, color text, universe text, kind text);

  insert into public.order_events (order_id, status, note)
  values (v_id, 'aguardando', 'Pedido recebido. Aguardando a confirmação do pagamento.');
  return v_id;
end $$;
revoke all on function public.place_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb) to service_role;

-- ───────────────────────── Dados do gateway no pedido (somente servidor) ─────────────────────────
-- Mescla sem apagar o que o webhook já gravou: se o pedido já saiu de 'aguardando', o que existe prevalece.

create function public.patch_order_payment(p_order_id text, p_patch jsonb, p_expires timestamptz default null)
returns void language sql security definer set search_path = public, pg_temp as $$
  update public.orders
     set payment = case when status = 'aguardando' then payment || p_patch else p_patch || payment end,
         expires_at = case when status = 'aguardando' then coalesce(p_expires, expires_at) else expires_at end
   where id = p_order_id;
$$;
revoke all on function public.patch_order_payment(text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.patch_order_payment(text, jsonb, timestamptz) to service_role;

-- ───────────────────────── Resultado do pagamento (somente servidor) ─────────────────────────
-- Idempotente: o Mercado Pago repete notificações. Devolve {status, changed, refundNeeded}.

create function public.apply_payment(p_order_id text, p_mp_status text, p_mp_id text, p_amount numeric, p_detail text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  o public.orders;
  v_changed boolean := false;
  v_refund boolean := false;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0001'; end if;

  update public.orders
     set payment = payment || jsonb_build_object('mpId', p_mp_id, 'mpStatus', p_mp_status, 'mpDetail', p_detail)
   where id = p_order_id;

  if p_mp_status = 'approved' then
    if p_amount is not null and abs(p_amount - o.total) > 0.01 then
      raise exception 'amount_mismatch' using errcode = 'P0001', detail = format('%s <> %s', p_amount, o.total);
    end if;
    if o.status = 'aguardando' then
      update public.orders set status = 'pago', paid_at = now(), expires_at = null where id = p_order_id;
      insert into public.order_events (order_id, status, note) values (p_order_id, 'pago', 'Pagamento confirmado! Seu pedido já entrou na fila.');
      v_changed := true;
    elsif o.status = 'cancelado' then
      -- dinheiro entrou depois do cancelamento (ex.: Pix pago após o vencimento): devolver
      insert into public.order_events (order_id, status, note)
      values (p_order_id, 'cancelado', 'Pagamento recebido após o cancelamento. Estorno automático solicitado.');
      v_refund := true;
    end if;
  elsif p_mp_status in ('cancelled', 'rejected', 'expired') then
    if o.status = 'aguardando' then
      perform public.cancel_order(p_order_id, 'Pagamento não aprovado (' || coalesce(p_detail, p_mp_status) || ').');
      v_changed := true;
    end if;
  elsif p_mp_status in ('refunded', 'charged_back') then
    if o.status <> 'cancelado' then
      update public.orders set status = 'cancelado' where id = p_order_id;
      insert into public.order_events (order_id, status, note)
      values (p_order_id, 'cancelado', case p_mp_status when 'refunded' then 'Pagamento estornado.' else 'Contestação (chargeback) do pagamento.' end);
      v_changed := true;
    end if;
  end if;

  select status into o.status from public.orders where id = p_order_id;
  return jsonb_build_object('status', o.status, 'changed', v_changed, 'refundNeeded', v_refund);
end $$;
revoke all on function public.apply_payment(text, text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.apply_payment(text, text, text, numeric, text) to service_role;

-- ───────────────────────── Mudança de status pelo painel (somente servidor) ─────────────────────────

create function public.admin_set_status(p_order_id text, p_status public.order_status, p_note text, p_tracking text, p_actor uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  o public.orders;
  flow public.order_status[] := array['aguardando', 'pago', 'producao', 'enviado', 'entregue']::public.order_status[];
  cur int;
  nxt int;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0001'; end if;
  if o.status = p_status then return jsonb_build_object('status', o.status, 'changed', false); end if;
  if o.status in ('entregue', 'cancelado') then raise exception 'invalid_transition' using errcode = 'P0001'; end if;

  if p_status = 'cancelado' then
    if o.status in ('enviado') then raise exception 'invalid_transition' using errcode = 'P0001'; end if;
    perform public.cancel_order(p_order_id, coalesce(nullif(p_note, ''), 'Cancelado pela loja.'), true, p_actor);
    return jsonb_build_object('status', 'cancelado', 'changed', true);
  end if;

  cur := array_position(flow, o.status);
  nxt := array_position(flow, p_status);
  if nxt is null or nxt <= cur then raise exception 'invalid_transition' using errcode = 'P0001'; end if;

  update public.orders
     set status = p_status,
         tracking = case when p_status = 'enviado' then coalesce(nullif(p_tracking, ''), tracking) else tracking end,
         paid_at = case when p_status = 'pago' then now() else paid_at end,
         expires_at = case when p_status = 'pago' then null else expires_at end
   where id = p_order_id;
  insert into public.order_events (order_id, status, note, actor)
  values (p_order_id, p_status, coalesce(nullif(p_note, ''), case p_status
            when 'pago' then 'Pagamento confirmado pela loja.'
            when 'producao' then 'Seu pedido está sendo produzido e conferido peça a peça.'
            when 'enviado' then 'Pedido despachado.'
            else 'Pedido entregue. Obrigado por comprar na Bodemania!' end), p_actor);
  return jsonb_build_object('status', p_status, 'changed', true);
end $$;
revoke all on function public.admin_set_status(text, public.order_status, text, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_set_status(text, public.order_status, text, text, uuid) to service_role;

-- ───────────────────────── Vencimento (agendar com pg_cron — ver 20261007000005_cron.sql) ─────────────────────────

create function public.expire_unpaid_orders() returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare r record; n int := 0;
begin
  for r in select id from public.orders where status = 'aguardando' and expires_at is not null and expires_at < now()
           order by expires_at for update skip locked loop
    perform public.cancel_order(r.id, 'Pagamento não confirmado dentro do prazo.');
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.expire_unpaid_orders() from public, anon, authenticated;
grant execute on function public.expire_unpaid_orders() to service_role;

-- ===== migrations/20261007000004_storage.sql =====
-- Bodemania · armazenamento de arquivos
--   product-images : fotos da vitrine (leitura pública, escrita só admin)
--   order-uploads  : fotos para lithophane e arquivos STL dos clientes (privado: dono + admin)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images', 'product-images', true, 5242880,
     array['image/jpeg', 'image/png', 'image/webp']),
  ('order-uploads', 'order-uploads', false, 52428800,
     array['image/jpeg', 'image/png', 'image/webp', 'model/stl', 'application/sla', 'application/vnd.ms-pki.stl', 'application/octet-stream'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');
create policy product_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy product_images_update on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
create policy product_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

create policy order_uploads_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'order-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy order_uploads_select on storage.objects for select to authenticated
  using (bucket_id = 'order-uploads' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy order_uploads_delete on storage.objects for delete to authenticated
  using (bucket_id = 'order-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== migrations/20261007000005_cron.sql =====
-- Bodemania · tarefa agendada (aplicar no Supabase; pg_cron já vem disponível no projeto).
-- A cada 5 minutos cancela pedidos não pagos vencidos (Pix 30 min, boleto 4 dias) e devolve o estoque.

create extension if not exists pg_cron with schema extensions;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'bodemania-expire-unpaid-orders') then
    perform cron.unschedule('bodemania-expire-unpaid-orders');
  end if;
end $$;

select cron.schedule('bodemania-expire-unpaid-orders', '*/5 * * * *', $$select public.expire_unpaid_orders()$$);

-- ===== seed.sql =====
-- Gerado por scripts/seed-sql.mjs a partir de src/data/seedProducts.ts — não edite à mão.
-- 28 produtos. Seguro rodar mais de uma vez.
insert into public.products (id, slug, name, category, price, compare_at, short, description, highlights, specs, art, tone, badge, kind, weight, lead_days, stock, options, personalization, tags, active, sort, photo_upload, price_from, href) values
  ('p01', 'avental-mestre-macom-bordado', 'Avental de Mestre Maçom bordado à mão', 'aventais', 389.9, 449.9, 'Cetim e forro em pele sintética, bordado em fio metálico, franja e borla douradas.', '["Avental confeccionado artesanalmente, com estrutura firme que mantém o caimento perfeito em sessão. O bordado é feito à mão com fio metálico, e as bordas recebem viés e franja douradas.","Disponível nos principais ritos praticados no Brasil. Se a sua Potência exige alguma particularidade, escreva na observação do pedido ou fale com a gente no WhatsApp antes de comprar."]'::jsonb, '["Bordado à mão em fio metálico","Cinto com fecho de engate","Acompanha capa protetora"]'::jsonb, '[["Medidas","35 × 40 cm (padrão)"],["Materiais","Cetim, pele sintética, fio metálico"],["Produção","Até 7 dias úteis"]]'::jsonb, 'avental', '#1b2f57', 'Mais vendido', 'physical', 0.5, 7, 12, '[{"id":"rito","label":"Rito","type":"chips","values":[{"id":"reaa","label":"REAA"},{"id":"york","label":"York"},{"id":"moderno","label":"Moderno"},{"id":"brasileiro","label":"Brasileiro"},{"id":"schroder","label":"Schröder"}]}]'::jsonb, '{"label":"Iniciais bordadas no verso (opcional)","placeholder":"Ex.: J.A.S.","maxLength":6,"price":25}'::jsonb, array['avental', 'mestre', 'grau 3', 'bordado', 'reaa']::text[], true, 10, default, default, default),
  ('p02', 'avental-aprendiz-macom', 'Avental de Aprendiz Maçom', 'aventais', 149.9, default, 'Branco, liso e com abeta levantada — o primeiro avental, feito para durar.', '["Modelo regulamentar para o primeiro grau, em material sintético de toque macio e fácil limpeza. Ótima opção também para Lojas que mantêm aventais de visitantes."]'::jsonb, '["Fácil de limpar","Ideal para Lojas (compra em quantidade)","Cinto ajustável"]'::jsonb, '[["Medidas","35 × 40 cm"],["Material","Pele sintética"],["Produção","Pronta entrega"]]'::jsonb, 'avental', '#f5f2ea', default, 'physical', 0.35, 1, 40, '[{"id":"rito","label":"Rito","type":"chips","values":[{"id":"reaa","label":"REAA"},{"id":"york","label":"York"},{"id":"moderno","label":"Moderno"},{"id":"brasileiro","label":"Brasileiro"},{"id":"schroder","label":"Schröder"}]}]'::jsonb, default, array['avental', 'aprendiz', 'grau 1', 'branco']::text[], true, 20, default, default, default),
  ('p03', 'avental-companheiro-macom', 'Avental de Companheiro Maçom', 'aventais', 179.9, default, 'Com rosetas e acabamento conforme o rito escolhido.', '["Avental do segundo grau com rosetas aplicadas e acabamento conforme o rito. Produzido em pequenas tiragens com conferência peça a peça."]'::jsonb, '["Rosetas aplicadas","Acabamento por rito","Capa protetora"]'::jsonb, '[["Medidas","35 × 40 cm"],["Material","Pele sintética e cetim"],["Produção","Até 5 dias úteis"]]'::jsonb, 'avental', '#2f5180', default, 'physical', 0.4, 5, 18, '[{"id":"rito","label":"Rito","type":"chips","values":[{"id":"reaa","label":"REAA"},{"id":"york","label":"York"},{"id":"moderno","label":"Moderno"},{"id":"brasileiro","label":"Brasileiro"},{"id":"schroder","label":"Schröder"}]}]'::jsonb, default, array['avental', 'companheiro', 'grau 2']::text[], true, 30, default, default, default),
  ('p04', 'colar-veneravel-mestre', 'Colar de Venerável Mestre com joia', 'paramentos', 329.9, default, 'Colar em fita de gorgorão com bordado e joia de cargo em metal fundido.', '["Colar de cargo com fita de gorgorão encorpada, bordado lateral e joia em metal fundido com banho. Peça de destaque para a instalação de um novo Venerável — e um presente muito marcante."]'::jsonb, '["Joia de cargo em metal fundido","Fita encorpada que não torce","Estojo para presente"]'::jsonb, '[["Fita","Gorgorão 10 cm"],["Joia","Zamac com banho"],["Produção","Até 7 dias úteis"]]'::jsonb, 'colar', '#1b2f57', 'Exclusivo', 'physical', 0.45, 7, 6, '[{"id":"rito","label":"Rito","type":"chips","values":[{"id":"reaa","label":"REAA"},{"id":"york","label":"York"},{"id":"moderno","label":"Moderno"},{"id":"brasileiro","label":"Brasileiro"},{"id":"schroder","label":"Schröder"}]},{"id":"acabamento","label":"Acabamento","type":"color","affectsArt":true,"values":[{"id":"dourado","label":"Dourado","hex":"#c79b3b"},{"id":"prateado","label":"Prateado","hex":"#a9b0ba"}]}]'::jsonb, default, array['colar', 'venerável', 'cargo', 'instalação', 'joia']::text[], true, 40, default, default, default),
  ('p05', 'kit-luvas-brancas-algodao', 'Kit 2 pares de luvas brancas', 'paramentos', 59.9, default, 'Algodão com elastano, punho com caimento e costura reforçada.', '["Luvas brancas confortáveis, que não amarelam fácil e mantêm o formato após várias lavagens. Kit com dois pares."]'::jsonb, '["Algodão + elastano","Não deformam","Kit com 2 pares"]'::jsonb, '[["Composição","95% algodão, 5% elastano"],["Lavagem","À mão, água fria"],["Produção","Pronta entrega"]]'::jsonb, 'luvas', default, default, 'physical', 0.15, 1, 80, '[{"id":"tamanho","label":"Tamanho","type":"chips","values":[{"id":"p","label":"P"},{"id":"m","label":"M"},{"id":"g","label":"G"},{"id":"gg","label":"GG"}]}]'::jsonb, default, array['luvas', 'branca', 'paramento']::text[], true, 50, default, default, default),
  ('p06', 'anel-esquadro-compasso-aco', 'Anel Esquadro e Compasso em aço inox', 'joias-acessorios', 219.9, 259.9, 'Aço cirúrgico 316L que não escurece, com emblema em alto-relevo.', '["Anel robusto em aço inox 316L — não descasca, não escurece e é hipoalergênico. Emblema do Esquadro e Compasso em alto-relevo com acabamento escovado nas laterais.","Você pode gravar um nome, uma data ou o número da sua Loja na parte interna."]'::jsonb, '["Aço inox 316L","Gravação interna opcional","Garantia de 1 ano"]'::jsonb, '[["Material","Aço inox 316L"],["Largura","12 mm"],["Produção","Até 3 dias úteis"]]'::jsonb, 'anel', '#c79b3b', 'Mais vendido', 'physical', 0.1, 3, 25, '[{"id":"acabamento","label":"Acabamento","type":"color","affectsArt":true,"values":[{"id":"dourado","label":"Dourado","hex":"#c79b3b"},{"id":"prateado","label":"Prateado","hex":"#a9b0ba"}]},{"id":"aro","label":"Aro","type":"chips","values":[{"id":"18","label":"18"},{"id":"20","label":"20"},{"id":"22","label":"22"},{"id":"24","label":"24"},{"id":"26","label":"26"},{"id":"28","label":"28"},{"id":"30","label":"30"}]}]'::jsonb, '{"label":"Gravação interna (opcional)","placeholder":"Ex.: ARLS Luz do Oriente nº 123","maxLength":24,"price":30}'::jsonb, array['anel', 'joia', 'esquadro', 'compasso', 'presente']::text[], true, 60, default, default, default),
  ('p07', 'pin-lapela-esquadro-compasso', 'Pin de lapela Esquadro e Compasso', 'joias-acessorios', 39.9, default, 'Esmaltado, com trava borboleta. Discreto para o dia a dia.', '["Pin metálico esmaltado com trava borboleta reforçada. Perfeito para terno, blazer e paletó."]'::jsonb, '["Trava reforçada","Esmalte resistente","Embalagem individual"]'::jsonb, '[["Tamanho","18 mm"],["Material","Metal esmaltado"],["Produção","Pronta entrega"]]'::jsonb, 'pin', '#c79b3b', default, 'physical', 0.03, 1, 150, '[{"id":"acabamento","label":"Acabamento","type":"color","affectsArt":true,"values":[{"id":"dourado","label":"Dourado","hex":"#c79b3b"},{"id":"prateado","label":"Prateado","hex":"#a9b0ba"}]}]'::jsonb, default, array['pin', 'botton', 'lapela', 'presente']::text[], true, 70, default, default, default),
  ('p08', 'abotoaduras-esquadro-compasso', 'Abotoaduras Esquadro e Compasso', 'joias-acessorios', 129.9, default, 'Par de abotoaduras com estojo — elegância para sessões magnas.', '["Par de abotoaduras em metal com banho e emblema em relevo. Acompanha estojo aveludado, pronto para presentear."]'::jsonb, '["Estojo para presente","Banho resistente","Fecho giratório"]'::jsonb, '[["Diâmetro","16 mm"],["Material","Latão com banho"],["Produção","Pronta entrega"]]'::jsonb, 'abotoaduras', '#c79b3b', default, 'physical', 0.08, 1, 30, '[{"id":"acabamento","label":"Acabamento","type":"color","affectsArt":true,"values":[{"id":"dourado","label":"Dourado","hex":"#c79b3b"},{"id":"prateado","label":"Prateado","hex":"#a9b0ba"}]}]'::jsonb, default, array['abotoadura', 'joia', 'presente', 'terno']::text[], true, 80, default, default, default),
  ('p09', 'gravata-maconica-jacquard', 'Gravata maçônica em jacquard', 'joias-acessorios', 99.9, default, 'Tecido jacquard com padrão discreto de Esquadro e Compasso.', '["Gravata tradicional com padrão tecido (não estampado) — o símbolo aparece de perto e some de longe. Combina com terno preto e azul-marinho."]'::jsonb, '["Jacquard tecido","Padrão discreto","Largura clássica 7 cm"]'::jsonb, '[["Largura","7 cm"],["Material","Microfibra jacquard"],["Produção","Pronta entrega"]]'::jsonb, 'gravata', '#15263d', default, 'physical', 0.1, 1, 35, '[{"id":"cor","label":"Cor","type":"color","affectsArt":true,"values":[{"id":"azul","label":"Azul-marinho","hex":"#15263d"},{"id":"preta","label":"Preta","hex":"#18191d"},{"id":"vinho","label":"Vinho","hex":"#5d1a24"}]}]'::jsonb, default, array['gravata', 'terno', 'presente']::text[], true, 90, default, default, default),
  ('p10', 'malhete-madeira-gravado', 'Malhete em madeira nobre com gravação', 'presentes-maconicos', 189.9, default, 'Torneado em madeira maciça e envernizado. Grave o nome da Loja.', '["Malhete torneado em madeira maciça, com acabamento em verniz acetinado. Muito usado como presente de posse e homenagem — a gravação a laser deixa o nome, cargo e data para sempre."]'::jsonb, '["Madeira maciça","Gravação a laser","Suporte de mesa incluso"]'::jsonb, '[["Comprimento","28 cm"],["Material","Madeira nobre"],["Produção","Até 5 dias úteis"]]'::jsonb, 'malhete', '#7a4a28', 'Personalizável', 'physical', 0.6, 5, 10, default, '{"label":"Texto da gravação","placeholder":"Ex.: Ven∴ Mestre — Gestão 2026/2027","maxLength":40,"price":0,"required":true}'::jsonb, array['malhete', 'presente', 'posse', 'gravação', 'homenagem']::text[], true, 100, default, default, default),
  ('p11', 'quadro-esquadro-compasso-camadas', 'Quadro Esquadro e Compasso em camadas 3D', 'presentes-maconicos', 159.9, default, 'Arte em relevo impressa em 3D, com moldura e fundo em azul profundo.', '["O encontro dos nossos dois universos: o símbolo é impresso em 3D em várias camadas e montado sobre fundo azul profundo, criando sombra e profundidade reais. Fica lindo no escritório ou no Templo."]'::jsonb, '["Relevo real em camadas","Moldura pronta para pendurar","Assinatura no verso"]'::jsonb, '[["Medidas","30 × 30 cm"],["Material","PLA seda + MDF"],["Produção","Até 6 dias úteis"]]'::jsonb, 'quadro', '#c79b3b', 'Exclusivo', 'physical', 1.1, 6, 8, '[{"id":"acabamento","label":"Acabamento","type":"color","affectsArt":true,"values":[{"id":"dourado","label":"Dourado","hex":"#c79b3b"},{"id":"prateado","label":"Prateado","hex":"#a9b0ba"}]}]'::jsonb, default, array['quadro', 'decoração', '3d', 'presente', 'escritório']::text[], true, 110, default, default, default),
  ('p12', 'caneca-bode-raiz-personalizada', 'Caneca “Bode Raiz” com nome', 'presentes-maconicos', 59.9, default, 'Porcelana 325 ml com arte exclusiva Bodemania e o nome que você quiser.', '["Caneca de porcelana com arte exclusiva do nosso bode, que entende a piada interna — e o nome do Irmão ou da Loja. Pode ir ao micro-ondas."]'::jsonb, '["Porcelana 325 ml","Arte exclusiva","Nome personalizado"]'::jsonb, '[["Capacidade","325 ml"],["Material","Porcelana"],["Produção","Até 3 dias úteis"]]'::jsonb, 'caneca', '#15263d', 'Personalizável', 'physical', 0.45, 3, 50, default, '{"label":"Nome na caneca","placeholder":"Ex.: Ir∴ Carlos","maxLength":18,"price":0}'::jsonb, array['caneca', 'bode', 'presente', 'humor', 'personalizado']::text[], true, 120, default, default, default),
  ('p13', 'camiseta-bodemania-premium', 'Camiseta Bodemania algodão premium', 'presentes-maconicos', 89.9, default, 'Algodão penteado 30.1, estampa minimalista do bode geométrico.', '["Camiseta de malha penteada com toque macio e estampa minimalista do nosso bode geométrico. Para usar além da Loja — ninguém de fora entende, quem é de dentro sorri."]'::jsonb, '["Algodão penteado 30.1","Modelagem regular","Estampa que não racha"]'::jsonb, '[["Composição","100% algodão"],["Modelagem","Regular"],["Produção","Pronta entrega"]]'::jsonb, 'camiseta', '#15263d', 'Novo', 'physical', 0.25, 1, 60, '[{"id":"cor","label":"Cor","type":"color","affectsArt":true,"values":[{"id":"marinho","label":"Azul-marinho","hex":"#15263d"},{"id":"preta","label":"Preta","hex":"#1a1b1f"},{"id":"off","label":"Off-white","hex":"#efe9dc"}]},{"id":"tamanho","label":"Tamanho","type":"chips","values":[{"id":"p","label":"P"},{"id":"m","label":"M"},{"id":"g","label":"G"},{"id":"gg","label":"GG"},{"id":"xg","label":"XG"}]}]'::jsonb, default, array['camiseta', 'roupa', 'bode', 'presente']::text[], true, 130, default, default, default),
  ('p14', 'colunas-j-b-miniatura-3d', 'Colunas J e B — miniatura de mesa', 'presentes-maconicos', 139.9, default, 'Par de colunas impressas em 3D com acabamento seda, 20 cm de altura.', '["Réplica em miniatura das colunas do pórtico, impressa em alta definição com filamento seda e base com feltro. Um presente simbólico para iniciações, elevações e exaltações."]'::jsonb, '["Impressão em alta definição","Base com feltro","Caixa para presente"]'::jsonb, '[["Altura","20 cm cada"],["Material","PLA seda"],["Produção","Até 4 dias úteis"]]'::jsonb, 'colunas', '#c79b3b', default, 'physical', 0.5, 4, 15, '[{"id":"cor","label":"Acabamento","type":"color","affectsArt":true,"values":[{"id":"dourado","label":"Dourado seda","hex":"#c79b3b"},{"id":"prata","label":"Prata seda","hex":"#b9bec6"},{"id":"marmore","label":"Mármore","hex":"#e8e4dc"}]}]'::jsonb, default, array['colunas', 'presente', 'iniciação', '3d', 'decoração']::text[], true, 140, default, default, default),
  ('p15', 'esquadro-compasso-mesa-loja', 'Esquadro e Compasso de mesa com nome da Loja', 'presentes-maconicos', 119.9, default, 'Escultura 3D com base gravada: nome e número da sua Loja.', '["Escultura de mesa com o emblema em relevo e uma base onde imprimimos o nome e o número da Loja — em alto-relevo, na mesma peça. Ótima lembrança para visitantes e aniversários de Loja."]'::jsonb, '["Base personalizada","Desconto para Lojas a partir de 10 unidades","Altura 15 cm"]'::jsonb, '[["Altura","15 cm"],["Material","PLA seda"],["Produção","Até 5 dias úteis"]]'::jsonb, 'esquadro', '#c79b3b', 'Personalizável', 'physical', 0.3, 5, 40, '[{"id":"cor","label":"Cor","type":"color","affectsArt":true,"values":[{"id":"preto","label":"Preto","hex":"#1d1f24"},{"id":"branco","label":"Branco","hex":"#efeee9"},{"id":"dourado","label":"Dourado seda","hex":"#c9a14a"},{"id":"azul","label":"Azul royal","hex":"#2348a8"},{"id":"laranja","label":"Laranja","hex":"#ff6a2b"},{"id":"verde","label":"Verde","hex":"#1f9d55"},{"id":"roxo","label":"Roxo","hex":"#6a3fb5"}]}]'::jsonb, '{"label":"Nome e número da Loja","placeholder":"Ex.: ARLS Estrela do Sul nº 42","maxLength":32,"price":0,"required":true}'::jsonb, array['esquadro', 'compasso', 'loja', 'lembrança', '3d', 'personalizado']::text[], true, 150, default, default, default),
  ('p16', 'chaveiro-maconico-personalizado', 'Chaveiro maçônico com nome', 'personalizados', 24.9, default, 'Impresso em 3D em duas cores, com argola de aço.', '["Chaveiro leve e resistente com o emblema e o nome que você escolher. Ideal para lembranças de eventos, sessões brancas e aniversários de Loja — temos desconto em quantidade."]'::jsonb, '["Duas cores","Argola em aço","Desconto por quantidade (fale no WhatsApp)"]'::jsonb, '[["Tamanho","6 cm"],["Material","PLA"],["Produção","Até 3 dias úteis"]]'::jsonb, 'chaveiro', '#c79b3b', default, 'physical', 0.02, 3, 500, '[{"id":"cor","label":"Cor","type":"color","affectsArt":true,"values":[{"id":"preto","label":"Preto","hex":"#1d1f24"},{"id":"branco","label":"Branco","hex":"#efeee9"},{"id":"dourado","label":"Dourado seda","hex":"#c9a14a"},{"id":"azul","label":"Azul royal","hex":"#2348a8"},{"id":"laranja","label":"Laranja","hex":"#ff6a2b"},{"id":"verde","label":"Verde","hex":"#1f9d55"},{"id":"roxo","label":"Roxo","hex":"#6a3fb5"}]}]'::jsonb, '{"label":"Nome no chaveiro","placeholder":"Ex.: Roberto","maxLength":14,"price":0,"required":true}'::jsonb, array['chaveiro', 'lembrança', 'brinde', 'evento', 'personalizado', 'maçonaria']::text[], true, 160, default, default, default),
  ('p17', 'bode-mascote-miniatura', 'Bode Bodemania — miniatura colecionável', 'colecionaveis', 69.9, default, 'O nosso mascote em 12 cm de pura simpatia geométrica.', '["Miniatura do bode geométrico da Bodemania, com chifres em espiral e base redonda. É o presente perfeito para quem “virou bode” — ou para quem vive dizendo que vai virar."]'::jsonb, '["Design exclusivo","Base redonda com feltro","12 cm de altura"]'::jsonb, '[["Altura","12 cm"],["Material","PLA"],["Produção","Até 3 dias úteis"]]'::jsonb, 'bode', '#efeee9', 'Novo', 'physical', 0.15, 3, 30, '[{"id":"cor","label":"Cor","type":"color","affectsArt":true,"values":[{"id":"preto","label":"Preto","hex":"#1d1f24"},{"id":"branco","label":"Branco","hex":"#efeee9"},{"id":"dourado","label":"Dourado seda","hex":"#c9a14a"},{"id":"azul","label":"Azul royal","hex":"#2348a8"},{"id":"laranja","label":"Laranja","hex":"#ff6a2b"},{"id":"verde","label":"Verde","hex":"#1f9d55"},{"id":"roxo","label":"Roxo","hex":"#6a3fb5"}]}]'::jsonb, default, array['bode', 'mascote', 'miniatura', 'colecionável', 'humor', 'presente']::text[], true, 170, default, default, default),
  ('p18', 'vaso-geometrico-voronoi', 'Vaso geométrico Voronoi', 'casa-decoracao', 79.9, 94.9, 'Estrutura vazada orgânica que muda de cara com a luz. Com recipiente interno.', '["Vaso decorativo com padrão Voronoi — a mesma geometria das bolhas de sabão e das asas de libélula. Vem com recipiente interno vedado para usar com flores naturais."]'::jsonb, '["Recipiente interno à prova d’água","7 cores","22 cm de altura"]'::jsonb, '[["Altura","22 cm"],["Material","PLA"],["Produção","Até 3 dias úteis"]]'::jsonb, 'vaso', '#ff6a2b', 'Mais vendido', 'physical', 0.35, 3, 20, '[{"id":"cor","label":"Cor","type":"color","affectsArt":true,"values":[{"id":"preto","label":"Preto","hex":"#1d1f24"},{"id":"branco","label":"Branco","hex":"#efeee9"},{"id":"dourado","label":"Dourado seda","hex":"#c9a14a"},{"id":"azul","label":"Azul royal","hex":"#2348a8"},{"id":"laranja","label":"Laranja","hex":"#ff6a2b"},{"id":"verde","label":"Verde","hex":"#1f9d55"},{"id":"roxo","label":"Roxo","hex":"#6a3fb5"}]}]'::jsonb, default, array['vaso', 'decoração', 'casa', 'flores', 'design']::text[], true, 180, default, default, default),
  ('p19', 'luminaria-lua-3d', 'Luminária Lua 3D com toque', 'casa-decoracao', 149.9, default, 'Relevo lunar real (dados da NASA), 16 cores e carregamento USB-C.', '["Impressa a partir do mapa de relevo da Lua, a luminária revela crateras e mares quando acesa. Controle por toque e controle remoto, 16 cores e bateria recarregável."]'::jsonb, '["Relevo lunar real","16 cores + controle remoto","Bateria USB-C"]'::jsonb, '[["Diâmetro","conforme tamanho"],["Material","PLA branco"],["Produção","Até 4 dias úteis"]]'::jsonb, 'lua', '#f3eadb', default, 'physical', 0.4, 4, 14, '[{"id":"tamanho","label":"Diâmetro","type":"chips","values":[{"id":"12","label":"12 cm"},{"id":"15","label":"15 cm","priceDelta":30},{"id":"18","label":"18 cm","priceDelta":60}]}]'::jsonb, default, array['luminária', 'lua', 'quarto', 'presente', 'decoração', 'criança']::text[], true, 190, default, default, default),
  ('p20', 'luminaria-lithophane-foto', 'Luminária com a sua foto (lithophane)', 'personalizados', 169.9, default, 'A foto “aparece” na peça quando a luz acende. Presente que emociona.', '["Lithophane é uma técnica do século XIX em que a imagem é formada pela espessura do material: apagada, é uma peça branca; acesa, a foto surge em detalhes. Envie a sua foto e nós cuidamos do resto.","Dica: fotos com rostos grandes, boa luz e fundo simples ficam incríveis."]'::jsonb, '["Envie sua foto no pedido","Base de LED inclusa","Prévia aprovada por WhatsApp"]'::jsonb, '[["Medidas","15 × 12 cm"],["Material","PLA branco + base LED"],["Produção","Até 5 dias úteis"]]'::jsonb, 'lithophane', '#f3eadb', 'Personalizável', 'physical', 0.45, 5, 99, default, default, array['foto', 'lithophane', 'presente', 'dia das mães', 'casamento', 'personalizado', 'luminária']::text[], true, 200, '{"label":"Envie a foto","required":true}'::jsonb, default, default),
  ('p21', 'suporte-celular-articulado', 'Suporte de celular articulado', 'utilidades', 39.9, default, 'Ângulo ajustável, base pesada e encaixe para cabo.', '["Suporte de mesa com dobradiça de atrito: fica firme no ângulo que você escolher. Serve para celulares e tablets pequenos, com passagem de cabo para carregar."]'::jsonb, '["Ângulo ajustável","Passagem de cabo","Pés antiderrapantes"]'::jsonb, '[["Compatível","Celulares até 7\""],["Material","PETG"],["Produção","Até 2 dias úteis"]]'::jsonb, 'suporte', '#2348a8', default, 'physical', 0.12, 2, 45, '[{"id":"cor","label":"Cor","type":"color","affectsArt":true,"values":[{"id":"preto","label":"Preto","hex":"#1d1f24"},{"id":"branco","label":"Branco","hex":"#efeee9"},{"id":"dourado","label":"Dourado seda","hex":"#c9a14a"},{"id":"azul","label":"Azul royal","hex":"#2348a8"},{"id":"laranja","label":"Laranja","hex":"#ff6a2b"},{"id":"verde","label":"Verde","hex":"#1f9d55"},{"id":"roxo","label":"Roxo","hex":"#6a3fb5"}]}]'::jsonb, default, array['suporte', 'celular', 'mesa', 'home office', 'utilidade']::text[], true, 210, default, default, default),
  ('p22', 'suporte-headset-gamer', 'Suporte de headset gamer', 'utilidades', 69.9, default, 'Design facetado, base estável e gancho para controle.', '["Organiza o setup e protege a espuma do seu headset. Base larga com pés antiderrapantes e gancho lateral para controle."]'::jsonb, '["Gancho para controle","Base estável","Visual facetado"]'::jsonb, '[["Altura","26 cm"],["Material","PLA"],["Produção","Até 3 dias úteis"]]'::jsonb, 'headset', '#6a3fb5', default, 'physical', 0.3, 3, 18, '[{"id":"cor","label":"Cor","type":"color","affectsArt":true,"values":[{"id":"preto","label":"Preto","hex":"#1d1f24"},{"id":"branco","label":"Branco","hex":"#efeee9"},{"id":"dourado","label":"Dourado seda","hex":"#c9a14a"},{"id":"azul","label":"Azul royal","hex":"#2348a8"},{"id":"laranja","label":"Laranja","hex":"#ff6a2b"},{"id":"verde","label":"Verde","hex":"#1f9d55"},{"id":"roxo","label":"Roxo","hex":"#6a3fb5"}]}]'::jsonb, default, array['gamer', 'headset', 'setup', 'suporte', 'presente']::text[], true, 220, default, default, default),
  ('p23', 'dragao-articulado-flexi', 'Dragão articulado (flexi)', 'colecionaveis', 59.9, default, 'Sai da impressora já articulado. A criançada (e os adultos) amam.', '["Dragão impresso “print-in-place”: todas as articulações saem prontas da impressora, sem montagem. Leve, resistente e hipnotizante de mexer."]'::jsonb, '["Totalmente articulado","Sem peças pequenas soltas","30 cm de comprimento"]'::jsonb, '[["Comprimento","30 cm"],["Material","PLA seda"],["Produção","Até 2 dias úteis"]]'::jsonb, 'dragao', '#13b39c', 'Mais vendido', 'physical', 0.1, 2, 60, '[{"id":"cor","label":"Cor","type":"color","affectsArt":true,"values":[{"id":"preto","label":"Preto","hex":"#1d1f24"},{"id":"branco","label":"Branco","hex":"#efeee9"},{"id":"dourado","label":"Dourado seda","hex":"#c9a14a"},{"id":"azul","label":"Azul royal","hex":"#2348a8"},{"id":"laranja","label":"Laranja","hex":"#ff6a2b"},{"id":"verde","label":"Verde","hex":"#1f9d55"},{"id":"roxo","label":"Roxo","hex":"#6a3fb5"}]}]'::jsonb, default, array['dragão', 'brinquedo', 'criança', 'articulado', 'fidget', 'presente']::text[], true, 230, default, default, default),
  ('p24', 'organizador-mesa-modular', 'Organizador de mesa modular', 'utilidades', 54.9, default, 'Módulos hexagonais que se encaixam como colmeia.', '["Kit com 5 módulos hexagonais de alturas diferentes para canetas, clips, pincéis e ferramentas. Encaixe magnético-free: os módulos travam por geometria."]'::jsonb, '["5 módulos","Encaixe por geometria","Expansível"]'::jsonb, '[["Módulo","7 cm de lado"],["Material","PLA"],["Produção","Até 3 dias úteis"]]'::jsonb, 'organizador', '#1f9d55', default, 'physical', 0.25, 3, 22, '[{"id":"cor","label":"Cor","type":"color","affectsArt":true,"values":[{"id":"preto","label":"Preto","hex":"#1d1f24"},{"id":"branco","label":"Branco","hex":"#efeee9"},{"id":"dourado","label":"Dourado seda","hex":"#c9a14a"},{"id":"azul","label":"Azul royal","hex":"#2348a8"},{"id":"laranja","label":"Laranja","hex":"#ff6a2b"},{"id":"verde","label":"Verde","hex":"#1f9d55"},{"id":"roxo","label":"Roxo","hex":"#6a3fb5"}]}]'::jsonb, default, array['organizador', 'mesa', 'escritório', 'home office', 'utilidade']::text[], true, 240, default, default, default),
  ('p25', 'topo-de-bolo-personalizado', 'Topo de bolo personalizado', 'personalizados', 49.9, default, 'Nome e idade (ou o que você quiser) em letra cursiva.', '["Topo de bolo em letra cursiva com hastes para espetar, em acabamento seda brilhante. Envie o texto e a cor do tema da festa."]'::jsonb, '["Letra cursiva","Acabamento seda","Hastes reforçadas"]'::jsonb, '[["Largura","até 18 cm"],["Material","PLA seda"],["Produção","Até 3 dias úteis"]]'::jsonb, 'topo', '#c79b3b', 'Personalizável', 'physical', 0.05, 3, 99, '[{"id":"cor","label":"Cor","type":"color","affectsArt":true,"values":[{"id":"preto","label":"Preto","hex":"#1d1f24"},{"id":"branco","label":"Branco","hex":"#efeee9"},{"id":"dourado","label":"Dourado seda","hex":"#c9a14a"},{"id":"azul","label":"Azul royal","hex":"#2348a8"},{"id":"laranja","label":"Laranja","hex":"#ff6a2b"},{"id":"verde","label":"Verde","hex":"#1f9d55"},{"id":"roxo","label":"Roxo","hex":"#6a3fb5"}]}]'::jsonb, '{"label":"Texto do topo","placeholder":"Ex.: Ana 7 anos","maxLength":16,"price":0,"required":true}'::jsonb, array['festa', 'bolo', 'aniversário', 'personalizado', 'criança']::text[], true, 250, default, default, default),
  ('p26', 'xadrez-completo-3d', 'Jogo de xadrez completo', 'colecionaveis', 249.9, default, '32 peças com design contemporâneo e base com feltro.', '["Conjunto completo com 32 peças em duas cores, base com feltro e saquinhos de algodão. Rei com 9 cm. O tabuleiro não acompanha."]'::jsonb, '["32 peças","Rei de 9 cm","Base com feltro"]'::jsonb, '[["Rei","9 cm"],["Material","PLA seda"],["Produção","Até 6 dias úteis"]]'::jsonb, 'xadrez', '#1d1f24', default, 'physical', 0.8, 6, 5, default, default, array['xadrez', 'jogo', 'tabuleiro', 'presente', 'decoração']::text[], true, 260, default, default, default),
  ('s01', 'impressao-3d-do-seu-arquivo', 'Impressão 3D do seu arquivo', 'servicos-3d', 29, default, 'Envie o STL e receba o preço na hora. PLA, PETG, ABS, TPU ou resina.', '["Faça o orçamento instantâneo: o site lê o seu arquivo, calcula volume e medidas e mostra o preço por material, qualidade e quantidade."]'::jsonb, '["Preço na hora","5 materiais","12 cores"]'::jsonb, '[]'::jsonb, 'servico', '#ff5a36', default, 'service', 0, 3, default, default, default, array['impressão', 'stl', 'serviço', 'orçamento', 'peça', 'protótipo']::text[], true, 270, default, true, '/orcamento-3d'),
  ('s02', 'modelagem-3d-sob-medida', 'Modelagem 3D sob medida', 'servicos-3d', 190, default, 'Você descreve, nós projetamos. Entrega digital do arquivo STL + render.', '["Precisa de uma peça que não existe? Uma reposição, um encaixe, um troféu, um brinde para a sua Loja? Descreva a ideia (com fotos e medidas, se tiver) e nosso projetista desenvolve o modelo 3D.","Você recebe uma prévia para aprovar, até 2 rodadas de ajuste e, no fim, os arquivos STL e uma imagem renderizada — direto na sua conta. Se quiser, já imprimimos para você."]'::jsonb, '["Entrega digital (STL + render)","2 rodadas de ajuste","Prévia em até 3 dias úteis"]'::jsonb, '[["Entrega","Digital, na sua conta"],["Prazo","3 a 7 dias úteis"],["Formatos","STL, 3MF, STEP"]]'::jsonb, 'modelagem', '#2f5180', 'Sob encomenda', 'digital', 0, 5, default, '[{"id":"complexidade","label":"Complexidade","type":"chips","values":[{"id":"simples","label":"Simples"},{"id":"media","label":"Média","priceDelta":160},{"id":"complexa","label":"Complexa","priceDelta":410}]}]'::jsonb, '{"label":"Descreva a peça (medidas, uso, referências)","placeholder":"Ex.: suporte para 3 malhetes, base 20×8 cm, com o nome da Loja…","maxLength":400,"price":0,"required":true}'::jsonb, array['modelagem', 'projeto', 'cad', 'serviço', 'digital', 'peça', 'reposição']::text[], true, 280, default, default, default)
on conflict (id) do nothing;

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

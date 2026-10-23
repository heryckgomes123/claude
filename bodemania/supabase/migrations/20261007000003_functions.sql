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

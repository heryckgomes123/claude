-- Mensagem de valor mínimo do cupom no formato brasileiro (R$ 400,00 em vez de R$ 400.00)
create or replace function public.check_coupon(p_code text, p_subtotal numeric)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
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
      format('Válido para pedidos a partir de R$ %s.',
             translate(to_char(c.min_subtotal, 'FM999G999G990D00'), ',.', '.,')));
  end if;
  return jsonb_build_object('ok', true, 'code', c.code, 'label', c.label, 'percent', c.percent,
                            'amount', c.amount, 'freeShipping', c.free_shipping, 'min', c.min_subtotal);
end
$function$;

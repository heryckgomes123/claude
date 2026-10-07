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

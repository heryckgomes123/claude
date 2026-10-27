-- Bodemania · ajustes apontados pelo Security Advisor do Supabase + cupom anunciado no site

-- search_path fixo (evita que um schema malicioso no caminho troque a função now())
alter function public.touch_updated_at() set search_path = public, pg_temp;

-- handle_new_user só deve rodar pelo gatilho em auth.users, nunca via /rest/v1/rpc
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Cupom divulgado na faixa do topo ("Primeira compra? Use o cupom BEMVINDO10")
insert into public.coupons (code, label, percent)
values ('BEMVINDO10', '10% de boas-vindas', 0.10)
on conflict (code) do nothing;

-- Arquiva o app antigo (MIÚDA: ligas/clubes) do projeto fzhzprzgzccmwrkujafs para liberar o schema public.
-- Nada é apagado: tabelas, views, funções e dados vão para o schema arquivo_miuda (fora da API).
-- Para restaurar: mover de volta para public e recriar o gatilho on_auth_user_created.
-- Rodar no SQL Editor do Supabase (uma vez).

create schema arquivo_miuda;
revoke all on schema arquivo_miuda from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;

do $$
declare r record;
begin
  for r in select schemaname, tablename from pg_publication_tables
           where pubname = 'supabase_realtime' and schemaname = 'public' loop
    execute format('alter publication supabase_realtime drop table %I.%I', r.schemaname, r.tablename);
  end loop;

  for r in select relname, relkind from pg_class
           where relnamespace = 'public'::regnamespace and relkind in ('r', 'p', 'v', 'm') loop
    execute format('alter %s public.%I set schema arquivo_miuda',
      case r.relkind when 'v' then 'view' when 'm' then 'materialized view' else 'table' end, r.relname);
  end loop;

  for r in select p.oid::regprocedure as sig from pg_proc p
           where p.pronamespace = 'public'::regnamespace
             and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') loop
    execute format('alter routine %s set schema arquivo_miuda', r.sig);
  end loop;
end $$;

-- Solicitações de orçamento enviadas pela landing page da INTELRA.
-- Gravadas somente pela função de servidor (api/quote.ts) com a chave service_role.
-- Nenhum acesso público: RLS ligado, sem políticas, e privilégios revogados de anon/authenticated.

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  idempotency_key uuid not null unique,
  status text not null default 'new' check (status in ('new', 'in_review', 'proposal_sent', 'closed')),

  interest text,
  services text[] not null check (cardinality(services) > 0),
  reference_ids text[] not null default '{}',
  direction text,
  answers jsonb not null default '{}'::jsonb,
  budget text,
  budget_note text,

  contact_name text not null,
  company text,
  contact_channel text not null check (contact_channel in ('whatsapp', 'email')),
  contact_whatsapp text,
  contact_email text,
  marketing_consent boolean not null default false,
  privacy_notice_version text not null,

  ip_hash text,
  user_agent text,
  source_url text,

  constraint quote_requests_contact_present check (
    (contact_channel = 'whatsapp' and contact_whatsapp is not null)
    or (contact_channel = 'email' and contact_email is not null)
  )
);

comment on table public.quote_requests is 'Leads da landing page INTELRA. Leitura restrita à equipe (service_role / painel do Supabase).';
comment on column public.quote_requests.ip_hash is 'SHA-256 do IP com sal (QUOTE_IP_SALT). Usado só para limitar envios repetidos.';

create index if not exists quote_requests_created_at_idx on public.quote_requests (created_at desc);
create index if not exists quote_requests_ip_hash_created_at_idx on public.quote_requests (ip_hash, created_at desc);

alter table public.quote_requests enable row level security;

revoke all on table public.quote_requests from anon, authenticated;

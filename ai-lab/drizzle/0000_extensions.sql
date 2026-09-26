-- Extensões e funções usadas pela busca do INTELRA AI LAB.
-- unaccent: busca sem acento ("cinematico" encontra "cinemático")
-- pg_trgm: fallback por similaridade para erros de digitação
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
-- unaccent() não é IMMUTABLE; este wrapper permite usá-la em colunas geradas e índices.
CREATE OR REPLACE FUNCTION intelra_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $func$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $func$;

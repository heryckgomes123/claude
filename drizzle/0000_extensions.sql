-- Extensões necessárias: busca por trigramas (clientes) e exclusion constraint (agenda).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- REGRA CRÍTICA: um profissional nunca pode ter dois agendamentos ativos sobrepostos.
-- Garantida no banco (à prova de concorrência) além da validação na aplicação.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist (
    "professional_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  )
  WHERE ("status" NOT IN ('CANCELLED', 'NO_SHOW'));

@AGENTS.md

# AIVA — notes for agents

- Language: UI copy is pt-BR. Keep it that way.
- Entities are defined once in `src/lib/entities.ts` (zod) and `src/db/schema.ts` (Drizzle). After changing the schema run `npm run db:generate`; migrations apply automatically at runtime.
- All writes go through `src/lib/server/repo.ts` (workspace isolation, reference checks, context-engine side effects). The AI never writes directly — it emits actions validated in `src/lib/ai/actions.ts` and executed by `src/lib/server/ai/execute.ts`.
- Natural-language parsing lives in `src/lib/nlp/` and is covered by `tests/nlp.test.ts` — add a test when changing it.
- Client state: `src/store/aiva.ts` (per-shell Zustand store via context — never make it module-global).
- App screens render client-side only (timezone-dependent); see `AppShell`.
- Checks: `npm run lint && npm run typecheck && npm test && npm run build`.

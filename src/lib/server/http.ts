import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuth, type AuthContext } from "./auth";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Reject cross-site mutating requests (defence in depth on top of SameSite=Lax cookies). */
function assertSameOrigin(req: Request) {
  if (!MUTATING.has(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return; // same-origin fetches from older browsers / server-to-server
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "Origem inválida");
  }
  if (originHost !== host) throw new HttpError(403, "Origem não permitida");
}

type Handler<C> = (req: Request, ctx: C) => Promise<unknown>;

function errorResponse(err: unknown) {
  if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 400 },
    );
  }
  if (err instanceof SyntaxError) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  console.error("[api]", err);
  return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
}

function toResponse(result: unknown) {
  if (result instanceof Response) return result;
  return NextResponse.json(result ?? { ok: true });
}

/** Public route (no auth) with uniform error handling. */
export function publicRoute<P = unknown>(handler: Handler<{ params: P }>) {
  return async (req: Request, ctx: { params: Promise<P> }) => {
    try {
      assertSameOrigin(req);
      return toResponse(await handler(req, { params: await ctx.params }));
    } catch (err) {
      return errorResponse(err);
    }
  };
}

/** Authenticated route: every handler receives the caller's user + workspace. */
export function authedRoute<P = unknown>(handler: Handler<{ params: P; auth: AuthContext }>) {
  return async (req: Request, ctx: { params: Promise<P> }) => {
    try {
      assertSameOrigin(req);
      const auth = await getAuth();
      if (!auth) throw new HttpError(401, "Sessão expirada. Entre novamente.");
      return toResponse(await handler(req, { params: await ctx.params, auth }));
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export async function readJson(req: Request, maxBytes = 256_000): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "Requisição muito grande");
  return text ? JSON.parse(text) : {};
}

/** Tiny in-memory fixed-window rate limiter (per process). */
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return;
  }
  if (++b.count > limit) throw new HttpError(429, "Muitas tentativas. Aguarde um pouco.");
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

import "server-only";

/** The client sends its timezone offset (Date#getTimezoneOffset); clamp to valid range. */
export function clockFrom(req: Request, body?: { tzOffset?: unknown }) {
  const raw = body?.tzOffset ?? new URL(req.url).searchParams.get("tz");
  const n = Number(raw);
  const tzOffset = Number.isFinite(n) && Math.abs(n) <= 14 * 60 ? Math.round(n) : 180;
  return { now: new Date(), tzOffset };
}

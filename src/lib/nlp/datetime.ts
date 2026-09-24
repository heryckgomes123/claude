/**
 * Portuguese (pt-BR) date/time extraction.
 *
 * All calculations happen on "wall clock" components in the user's timezone.
 * `tzOffset` follows Date#getTimezoneOffset semantics (minutes, positive west of UTC),
 * so the same code produces correct instants on the client and on the server.
 */

export type Ctx = { now: Date; tzOffset: number };

export type Span = { start: number; end: number };

export type DateTimeResult = {
  at: Date | null;
  hasDate: boolean;
  hasTime: boolean;
  spans: Span[];
};

/** Lowercase + strip accents, preserving string length (index-aligned with the original). */
export function norm(s: string): string {
  let out = "";
  for (const ch of s) {
    const base = ch.normalize("NFD")[0] ?? ch;
    out += (base.length === ch.length ? base : ch).toLowerCase();
  }
  return out;
}

const NUM_WORDS: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
};
const NUM_WORD_RE = Object.keys(NUM_WORDS).join("|");

export function wordToNumber(w: string): number | null {
  if (/^\d+$/.test(w)) return Number(w);
  return w in NUM_WORDS ? NUM_WORDS[w] : null;
}

const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

const MONTHS: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  marco: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

/** Wall-clock parts of `now` in the user's timezone. */
export function wallParts(d: Date, tzOffset: number) {
  const w = new Date(d.getTime() - tzOffset * 60_000);
  return {
    y: w.getUTCFullYear(),
    m: w.getUTCMonth(),
    d: w.getUTCDate(),
    h: w.getUTCHours(),
    min: w.getUTCMinutes(),
    dow: w.getUTCDay(),
  };
}

/** Build an instant from wall-clock parts in the user's timezone. */
export function fromWall(y: number, m: number, d: number, h: number, min: number, tzOffset: number): Date {
  return new Date(Date.UTC(y, m, d, h, min) + tzOffset * 60_000);
}

type DayRef = { y: number; m: number; d: number };

function addDays(ref: DayRef, n: number): DayRef {
  const t = new Date(Date.UTC(ref.y, ref.m, ref.d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() };
}

export function extractDateTime(text: string, ctx: Ctx): DateTimeResult {
  const n = norm(text);
  const now = wallParts(ctx.now, ctx.tzOffset);
  const today: DayRef = { y: now.y, m: now.m, d: now.d };
  const spans: Span[] = [];
  // `as` casts stop TS from narrowing these to `null` (they are assigned inside closures).
  let day = null as DayRef | null;
  let hour = null as number | null;
  let minute = 0;
  let hasTime = false as boolean;
  let period = null as "morning" | "afternoon" | "night" | "dawn" | null;

  const take = (re: RegExp, fn: (m: RegExpExecArray) => boolean | void) => {
    re.lastIndex = 0;
    const m = re.exec(n);
    if (!m) return false;
    if (fn(m) === false) return false;
    spans.push({ start: m.index, end: m.index + m[0].length });
    return true;
  };

  /* ---------- relative amounts: "em 3 dias", "daqui a 2 horas" ---------- */
  take(
    new RegExp(`\\b(?:em|daqui a|daqui)\\s+(\\d+|${NUM_WORD_RE})\\s+(minutos?|min|horas?|h|dias?|semanas?|mes|meses)\\b`),
    (m) => {
      const qty = wordToNumber(m[1]);
      if (qty == null) return false;
      const unit = m[2];
      if (unit.startsWith("min") || unit.startsWith("h")) {
        const mins = unit.startsWith("min") ? qty : qty * 60;
        const t = new Date(ctx.now.getTime() + mins * 60_000);
        const p = wallParts(t, ctx.tzOffset);
        day = { y: p.y, m: p.m, d: p.d };
        hour = p.h;
        minute = p.min;
        hasTime = true;
      } else if (unit.startsWith("dia")) day = addDays(today, qty);
      else if (unit.startsWith("semana")) day = addDays(today, qty * 7);
      else {
        const t = new Date(Date.UTC(today.y, today.m + qty, today.d));
        day = { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() };
      }
    },
  );

  /* ---------- named days ---------- */
  if (!day) {
    [
      () =>
        take(/\b(depois de amanha)\b/g, () => void (day = addDays(today, 2))),
      () =>
        take(/\b(amanha)\b/g, () => void (day = addDays(today, 1))),
      () =>
        take(/\b(hoje|hj|agora a noite|essa noite|esta noite)\b/g, (m) => {
            day = today;
            if (m[1].includes("noite")) period = "night";
          }),
      () =>
        take(/\b(ontem)\b/g, () => void (day = addDays(today, -1))),
    ].some((attempt) => attempt());
  }

  /* ---------- weekdays ---------- */
  if (!day) {
    take(
      /\b(?:(na|no|nesta|neste|nessa|nesse|esta|este|essa|esse|proxima|proximo|toda|todo)\s+)?(segunda|terca|quarta|quinta|sexta|sabado|domingo)(?:[\s-]feira)?(\s+que vem)?\b/g,
      (m) => {
        const target = WEEKDAYS[m[2]];
        let diff = (target - now.dow + 7) % 7;
        const next = m[1]?.startsWith("proxim") || !!m[3];
        if (next && diff === 0) diff = 7;
        day = addDays(today, diff);
      },
    );
  }

  /* ---------- explicit dates ---------- */
  if (!day) {
    [
      () =>
        take(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g, (m) => {
          const d = Number(m[1]);
          const mo = Number(m[2]) - 1;
          if (d < 1 || d > 31 || mo < 0 || mo > 11) return false;
          let y = m[3] ? Number(m[3]) : today.y;
          if (y < 100) y += 2000;
          if (!m[3] && (mo < today.m || (mo === today.m && d < today.d))) y += 1;
          day = { y, m: mo, d };
        }),
      () =>
        take(
            new RegExp(`\\b(?:dia\\s+)?(\\d{1,2})\\s+de\\s+(${Object.keys(MONTHS).join("|")})(?:\\s+de\\s+(\\d{4}))?\\b`, "g"),
            (m) => {
              const d = Number(m[1]);
              const mo = MONTHS[m[2]];
              let y = m[3] ? Number(m[3]) : today.y;
              if (!m[3] && (mo < today.m || (mo === today.m && d < today.d))) y += 1;
              day = { y, m: mo, d };
            },
          ),
      () =>
        take(/\bdia\s+(\d{1,2})\b/g, (m) => {
            const d = Number(m[1]);
            if (d < 1 || d > 31) return false;
            let mo = today.m;
            let y = today.y;
            if (d < today.d) {
              mo += 1;
              if (mo > 11) {
                mo = 0;
                y += 1;
              }
            }
            day = { y, m: mo, d };
          }),
    ].some((attempt) => attempt());
  }

  /* ---------- week / month references ---------- */
  if (!day) {
    [
      () =>
        take(/\b(semana que vem|proxima semana)\b/g, () => {
          const diff = ((1 - now.dow + 7) % 7) || 7;
          day = addDays(today, diff);
        }),
      () =>
        take(/\b(?:no |neste |nesse |este |esse )?(fim de semana|final de semana|fds)\b/g, () => {
            const diff = (6 - now.dow + 7) % 7;
            day = addDays(today, diff);
          }),
      () =>
        take(/\b(mes que vem|proximo mes)\b/g, () => {
            const t = new Date(Date.UTC(today.y, today.m + 1, 1));
            day = { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: 1 };
          }),
    ].some((attempt) => attempt());
  }

  /* ---------- times ---------- */
  if (!hasTime) {
    [
      () =>
        take(/\b(?:(?:as|a|ao|pro|para o|pelo)\s+)?(meio[\s-]dia|meia[\s-]noite)(?:\s+e\s+meia)?\b/g, (m) => {
          hour = m[1].startsWith("meio") ? 12 : 0;
          minute = m[0].includes("e meia") ? 30 : 0;
          hasTime = true;
        }),
      () =>
        take(/\b(?:(?:as|a|para as|pras|pra|ate as|umas)\s+)?(\d{1,2})\s*(?::|h)\s*(\d{2})\b/g, (m) => {
            const h = Number(m[1]);
            const mi = Number(m[2]);
            if (h > 23 || mi > 59) return false;
            hour = h;
            minute = mi;
            hasTime = true;
          }),
      () =>
        take(/\b(?:(?:as|a|para as|pras|pra|ate as|umas)\s+)?(\d{1,2})\s*(?:h|hs|hrs|horas)\b(?:\s+e\s+meia)?/g, (m) => {
            const h = Number(m[1]);
            if (h > 23) return false;
            hour = h;
            minute = m[0].includes("e meia") ? 30 : 0;
            hasTime = true;
          }),
      () =>
        take(new RegExp(`\\b(?:as|para as|pras|ate as|umas)\\s+(\\d{1,2}|${NUM_WORD_RE})(?:\\s+e\\s+(meia|quinze|\\d{1,2}))?\\b`, "g"), (m) => {
            const h = wordToNumber(m[1]);
            if (h == null || h > 23) return false;
            hour = h;
            minute = m[2] === "meia" ? 30 : m[2] === "quinze" ? 15 : m[2] ? Number(m[2]) : 0;
            hasTime = true;
          }),
    ].some((attempt) => attempt());
  }

  // Period of day qualifiers ("da tarde", "à noite", "de manhã").
  take(/\b(?:da|de|pela|a|na|nessa|esta|essa|hoje a)\s+(manha|tarde|noite|madrugada)\b/g, (m) => {
    period = m[1] === "manha" ? "morning" : m[1] === "tarde" ? "afternoon" : m[1] === "noite" ? "night" : "dawn";
  });

  if (hasTime && hour != null) {
    const h: number = hour;
    if (period === "afternoon" && h < 12) hour = h + 12;
    else if (period === "night" && h < 12 && h >= 5) hour = h + 12;
    else if (period === "night" && h === 12) hour = 0;
    else if (!period && h >= 1 && h <= 6 && minute === 0) hour = h + 12; // "às três" → 15h
  } else if (period) {
    hour = period === "morning" ? 9 : period === "afternoon" ? 15 : period === "night" ? 20 : 2;
    minute = 0;
    hasTime = true;
  }

  const hasDate = day !== null;
  if (!hasDate && !hasTime) return { at: null, hasDate: false, hasTime: false, spans };

  let ref: DayRef = day ?? today;
  if (!hasDate && hasTime && hour != null) {
    // A bare time refers to today, unless that moment already passed.
    const candidate = fromWall(today.y, today.m, today.d, hour, minute, ctx.tzOffset);
    if (candidate.getTime() < ctx.now.getTime() - 5 * 60_000) ref = addDays(today, 1);
  }
  const at = hasTime
    ? fromWall(ref.y, ref.m, ref.d, hour ?? 9, minute, ctx.tzOffset)
    : fromWall(ref.y, ref.m, ref.d, 12, 0, ctx.tzOffset); // date-only → noon avoids TZ day drift
  return { at, hasDate, hasTime, spans };
}

/** Remove matched spans from the original text. */
export function cutSpans(text: string, spans: Span[]): string {
  if (!spans.length) return text;
  const sorted = [...spans].sort((a, b) => b.start - a.start);
  let out = text;
  for (const s of sorted) out = out.slice(0, s.start) + " " + out.slice(s.end);
  return out;
}

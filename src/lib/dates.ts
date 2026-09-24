const DAY = 86_400_000

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY)
export const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime()
export const daysBetween = (a: Date, b: Date) =>
  Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY)

/** Semana começando na segunda-feira */
export function startOfWeek(d: Date) {
  const s = startOfDay(d)
  const dow = (s.getDay() + 6) % 7
  return addDays(s, -dow)
}
export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', opts)
export const fmtTime = (iso: string) => fmt({ hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
export const fmtDay = (iso: string) => fmt({ day: '2-digit', month: 'short' }).format(new Date(iso)).replace('.', '')
export const fmtWeekdayShort = (d: Date) => fmt({ weekday: 'short' }).format(d).replace('.', '')
export const fmtFullDate = (iso: string) => fmt({ day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso))
export const fmtMonth = (d: Date) => fmt({ month: 'long' }).format(d)

export function greeting(d = new Date()) {
  const h = d.getHours()
  if (h < 5) return 'Boa noite'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function relativeTime(iso: string, now = new Date()) {
  const diff = now.getTime() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} h`
  const d = Math.round(h / 24)
  if (d === 1) return 'ontem'
  if (d < 7) return `${d} dias`
  return fmtDay(iso)
}

export const fmtClock = (totalSeconds: number) => {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

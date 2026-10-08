export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
export const onlyDigits = (s: string) => String(s ?? '').replace(/\D/g, '')

export function addBusinessDays(from: Date, days: number) {
  const d = new Date(from)
  let left = days
  while (left > 0) {
    d.setDate(d.getDate() + 1)
    const wd = d.getDay()
    if (wd !== 0 && wd !== 6) left--
  }
  return d
}

/** O Brasil não tem horário de verão desde 2019: Brasília é sempre UTC-3. */
export function toBrasiliaIso(date: Date) {
  const shifted = new Date(date.getTime() - 3 * 3600_000)
  return shifted.toISOString().replace('Z', '-03:00')
}

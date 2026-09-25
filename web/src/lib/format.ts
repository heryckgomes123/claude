const nf = new Intl.NumberFormat('pt-BR');
export const fmt = (n: number | null | undefined) => nf.format(Math.round(n ?? 0));
export const fmtSigned = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n));
export const compact = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.', ',')}M` : Math.abs(n) >= 10_000 ? `${Math.round(n / 1000)}mil` : fmt(n);

const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
export function timeAgo(iso: string | number | Date) {
  const d = typeof iso === 'object' ? iso.getTime() : new Date(iso).getTime();
  const s = Math.round((d - Date.now()) / 1000);
  const abs = Math.abs(s);
  if (abs < 45) return 'agora';
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(s / 86400), 'day');
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
export const shortDay = (day: string) => {
  const [, m, d] = day.split('-');
  return `${d}/${m}`;
};
export function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;

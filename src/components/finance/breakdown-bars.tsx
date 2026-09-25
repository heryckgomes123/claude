import { formatMoney } from "@/utils/money";

/** Barras horizontais simples e acessíveis (receita por serviço / forma de pagamento). */
export function BreakdownBars({ items, colors }: { items: { label: string; sublabel?: string; valueCents: number }[]; colors?: string[] }) {
  const total = items.reduce((s, i) => s + i.valueCents, 0);
  const max = Math.max(1, ...items.map((i) => i.valueCents));
  const palette = colors ?? ["#b4583f", "#9c7248", "#6f7f5e", "#7c5a7a", "#4f6f7a", "#cd7b5f", "#b58a58"];
  if (items.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">Sem dados no período.</p>;
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold">
              {item.label}
              {item.sublabel && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{item.sublabel}</span>}
            </span>
            <span className="tabular shrink-0 text-muted-foreground">
              <span className="font-bold text-foreground">{formatMoney(item.valueCents)}</span> ·{" "}
              {total ? Math.round((item.valueCents / total) * 100) : 0}%
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(item.valueCents / max) * 100}%`, backgroundColor: palette[i % palette.length] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

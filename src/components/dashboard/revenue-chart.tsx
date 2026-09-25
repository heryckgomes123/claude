"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDateKey } from "@/utils/dates";
import { formatMoney } from "@/utils/money";

type Point = { date: string; revenueCents: number; count: number };

export function RevenueChart({ data, height = 240 }: { data: Point[]; height?: number }) {
  const chartData = data.map((d) => ({
    ...d,
    label: data.length <= 7 ? formatDateKey(d.date, "weekday") : formatDateKey(d.date, "short"),
    value: d.revenueCents / 100,
  }));
  const total = data.reduce((s, d) => s + d.revenueCents, 0);
  return (
    <div role="img" aria-label={`Faturamento no período: ${formatMoney(total)}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b4583f" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#cd7b5f" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#efe7de" strokeDasharray="3 4" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#7c706a", fontSize: 11, fontWeight: 600 }}
            dy={6}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: "#9a8f88", fontSize: 11 }}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k` : String(v))}
          />
          <Tooltip
            cursor={{ fill: "#f5e2d9", opacity: 0.5 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as Point & { label: string };
              return (
                <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lifted">
                  <p className="font-semibold text-muted-foreground capitalize">{formatDateKey(p.date, "long")}</p>
                  <p className="tabular mt-0.5 text-sm font-extrabold">{formatMoney(p.revenueCents)}</p>
                  <p className="text-muted-foreground">{p.count} pagamento(s)</p>
                </div>
              );
            }}
          />
          <Bar dataKey="value" fill="url(#revenueFill)" radius={[8, 8, 2, 2]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

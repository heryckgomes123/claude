import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

type MetricCardProps = {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  hint?: React.ReactNode;
  tone?: "terracotta" | "bronze" | "sage" | "plum" | "dark";
  className?: string;
};

const TONES = {
  terracotta: "bg-terracotta-50 text-terracotta-600 ring-terracotta-100",
  bronze: "bg-bronze-50 text-bronze-600 ring-bronze-100",
  sage: "bg-sage-50 text-sage-700 ring-sage-100",
  plum: "bg-plum-100/60 text-plum-700 ring-plum-100",
  dark: "bg-charcoal text-terracotta-300 ring-charcoal",
};

export function MetricCard({ label, value, icon: Icon, hint, tone = "terracotta", className }: MetricCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lifted sm:p-5",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-gradient-to-br from-terracotta-100/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.72rem] font-bold tracking-wide text-muted-foreground uppercase">{label}</p>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl ring-1", TONES[tone])}>
          <Icon className="size-[1.1rem]" aria-hidden />
        </span>
      </div>
      <p className="tabular mt-2 truncate text-[1.45rem] leading-tight font-extrabold tracking-tight text-foreground sm:text-[1.65rem]">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

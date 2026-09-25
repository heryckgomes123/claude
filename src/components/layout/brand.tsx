import { cn } from "@/utils/cn";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-terracotta-400 via-terracotta-500 to-bronze-600 font-display text-2xl font-semibold text-cream shadow-glow",
        className,
      )}
      aria-hidden
    >
      R
      <span className="absolute inset-0 rounded-2xl ring-1 ring-white/20 ring-inset" />
    </span>
  );
}

export function BrandLockup({ tone = "dark", compact = false }: { tone?: "dark" | "light"; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <BrandMark className={compact ? "size-9 text-xl" : undefined} />
      <div className="leading-none">
        <p className={cn("font-display text-[1.45rem] font-semibold tracking-tight", tone === "dark" ? "text-cream" : "text-foreground")}>
          R Beauty
        </p>
        {!compact && (
          <p
            className={cn(
              "mt-1 text-[0.62rem] font-bold tracking-[0.22em] uppercase",
              tone === "dark" ? "text-terracotta-300/80" : "text-bronze-500",
            )}
          >
            OS · Command Center
          </p>
        )}
      </div>
    </div>
  );
}

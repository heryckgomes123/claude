import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton genérico de página: cabeçalho + cards + lista. */
export function LoadingState({ cards = 4, rows = 6 }: { cards?: number; rows?: number }) {
  return (
    <div className="animate-fade-in space-y-6" role="status" aria-label="Carregando">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-64" />
      </div>
      {cards > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: cards }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}
      <div className="space-y-2 rounded-2xl border border-border/70 bg-card p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

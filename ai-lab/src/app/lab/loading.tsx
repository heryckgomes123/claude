import { Skeleton } from '@/components/ui/misc'

export default function Loading() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    </div>
  )
}

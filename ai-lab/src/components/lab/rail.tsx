import { cn } from '@/lib/utils'

/** Faixa horizontal com rolagem no mobile e grade no desktop. */
export function Rail({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        '-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3 2xl:grid-cols-4 [&>*]:w-[78vw] [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:w-auto',
        className,
      )}
    >
      {children}
    </div>
  )
}

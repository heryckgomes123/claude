import { cn } from "@/utils/cn";

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 animate-slide-up">
        {eyebrow && <p className="mb-1 text-[0.7rem] font-bold tracking-[0.18em] text-bronze-500 uppercase">{eyebrow}</p>}
        <h1 className="font-display text-[2rem] leading-none font-semibold tracking-tight text-foreground sm:text-[2.35rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

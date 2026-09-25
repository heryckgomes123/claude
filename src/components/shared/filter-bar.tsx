"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/utils/cn";

export type FilterOption = { value: string; label: string };

/** Filtro segmentado sincronizado com a URL. */
export function FilterBar({
  param,
  options,
  defaultValue,
  className,
  label,
}: {
  param: string;
  options: FilterOption[];
  defaultValue: string;
  className?: string;
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const current = params.get(param) ?? defaultValue;

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "scrollbar-thin inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1",
        pending && "opacity-80",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === current;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              const next = new URLSearchParams(params.toString());
              if (option.value === defaultValue) next.delete(param);
              else next.set(param, option.value);
              next.delete("page");
              startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-all",
              active ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

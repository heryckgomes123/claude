"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { FilterBar } from "@/components/shared/filter-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PERIOD_LABELS, PERIODS, type ResolvedPeriod } from "@/utils/period";

export function PeriodFilter({ period }: { period: ResolvedPeriod }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <FilterBar
        label="Período"
        param="period"
        defaultValue="month"
        options={PERIODS.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
      />
      {period.key === "custom" && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const next = new URLSearchParams(params.toString());
            next.set("period", "custom");
            next.set("from", from);
            next.set("to", to);
            startTransition(() => router.replace(`${pathname}?${next.toString()}`));
          }}
        >
          <Input type="date" aria-label="Data inicial" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-auto" />
          <span className="text-sm text-muted-foreground">até</span>
          <Input type="date" aria-label="Data final" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-auto" />
          <Button type="submit" size="sm" loading={pending}>
            Aplicar
          </Button>
        </form>
      )}
    </div>
  );
}

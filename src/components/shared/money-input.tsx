"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { centsToInput, parseMoneyToCents } from "@/utils/money";
import { cn } from "@/utils/cn";

/** Campo monetário em R$ que trabalha em centavos. */
export function MoneyInput({
  id,
  value,
  onChange,
  className,
  invalid,
  ...rest
}: {
  id: string;
  value: number | null;
  onChange: (cents: number | null) => void;
  className?: string;
  invalid?: boolean;
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "id">) {
  const [text, setText] = useState(centsToInput(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (parseMoneyToCents(text) !== value) setText(centsToInput(value));
  }
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-semibold text-muted-foreground">R$</span>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        className={cn("tabular pl-10", className)}
        value={text}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const next = e.target.value.replace(/[^\d,.]/g, "");
          setText(next);
          onChange(parseMoneyToCents(next));
        }}
        onBlur={() => setText(centsToInput(parseMoneyToCents(text)))}
        {...rest}
      />
    </div>
  );
}

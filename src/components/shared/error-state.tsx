"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Algo não saiu como esperado",
  description = "Não foi possível carregar esta tela. Verifique a conexão e tente novamente.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-[#f0d3ce] bg-[#fdf6f4] px-6 py-14 text-center"
    >
      <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-[#f6e1de] text-destructive">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          <RotateCcw /> Tentar novamente
        </Button>
      )}
    </div>
  );
}

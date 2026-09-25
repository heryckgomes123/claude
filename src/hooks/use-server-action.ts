"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/types/action";

type RunOptions<T> = {
  success?: string | ((data: T) => string);
  onSuccess?: (data: T) => void;
  onError?: (result: { error: string; fieldErrors?: Record<string, string[]> }) => void;
  /** Não exibir toast de erro (quando o formulário mostra o erro inline). */
  silentError?: boolean;
};

/** Executa server actions com estado de carregamento, toast de sucesso/erro e erros por campo. */
export function useServerAction() {
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const run = useCallback(<T>(action: () => Promise<ActionResult<T>>, options: RunOptions<T> = {}) => {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) {
          setFieldErrors({});
          const message = typeof options.success === "function" ? options.success(result.data) : options.success;
          if (message) toast.success(message);
          options.onSuccess?.(result.data);
        } else {
          setFieldErrors(result.fieldErrors ?? {});
          if (!options.silentError) toast.error(result.error);
          options.onError?.(result);
        }
      } catch {
        toast.error("Falha de conexão. Verifique a internet e tente novamente.");
      }
    });
  }, []);

  const fieldError = useCallback((name: string) => fieldErrors[name]?.[0], [fieldErrors]);

  return { pending, run, fieldErrors, fieldError, setFieldErrors };
}

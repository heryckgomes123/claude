"use client";

import { Check, AlertCircle, Sparkles } from "lucide-react";
import { useAiva } from "@/store/aiva";
import { cn } from "@/lib/cn";

export function Toaster() {
  const toasts = useAiva((s) => s.toasts);
  const dismiss = useAiva((s) => s.dismissToast);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-6"
      style={{ bottom: "calc(var(--nav-h) + var(--safe-bottom) + 84px)" }}
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div key={t.id} className="glass pointer-events-auto flex w-full max-w-md animate-rise items-center gap-3 rounded-2xl py-2.5 pr-2 pl-3.5 shadow-2xl">
          <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full", t.tone === "error" ? "bg-red/20 text-red" : t.tone === "ai" ? "grad text-white" : "bg-green/20 text-green")}>
            {t.tone === "error" ? <AlertCircle className="h-3.5 w-3.5" /> : t.tone === "ai" ? <Sparkles className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          </span>
          <span className="min-w-0 flex-1 text-sm">{t.message}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.onClick();
                dismiss(t.id);
              }}
              className="pressable h-9 shrink-0 rounded-xl px-3 text-sm font-medium text-[#c9b8ff] hover:bg-surface-3"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

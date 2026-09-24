"use client";

import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/cn";

/* ---------------- Button ---------------- */

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type BtnSize = "sm" | "md" | "lg" | "icon";

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize; loading?: boolean }>(
  function Button({ className, variant = "secondary", size = "md", loading, children, disabled, ...props }, ref) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "pressable relative inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap disabled:pointer-events-none disabled:opacity-50",
          size === "sm" && "h-9 px-3 text-[13px]",
          size === "md" && "h-11 px-4 text-sm",
          size === "lg" && "h-13 px-6 text-[15px]",
          size === "icon" && "h-11 w-11 shrink-0",
          variant === "primary" && "grad text-white shadow-[0_8px_30px_-8px_rgb(139_92_255/0.7)] hover:brightness-110",
          variant === "secondary" && "border border-line bg-surface-2 text-ink hover:bg-surface-3",
          variant === "ghost" && "text-muted hover:bg-surface-2 hover:text-ink",
          variant === "soft" && "grad-soft border border-violet/25 text-ink hover:brightness-125",
          variant === "danger" && "bg-red/15 text-red hover:bg-red/25",
          className,
        )}
        {...props}
      >
        {loading && <span className="absolute inset-0 grid place-items-center"><Spinner /></span>}
        <span className={cn("inline-flex items-center gap-2", loading && "opacity-0")}>{children}</span>
      </button>
    );
  },
);

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white", className)} />;
}

/* ---------------- Inputs ---------------- */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-3.5 text-ink placeholder:text-faint outline-none transition focus:border-violet/60 focus:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full min-w-0 rounded-xl border border-line bg-surface px-3.5 py-3 text-ink placeholder:text-faint outline-none transition focus:border-violet/60 focus:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
});

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full min-w-0 appearance-none rounded-xl border border-line bg-surface bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9 pl-3.5 text-ink outline-none focus:border-violet/60 [&>option]:bg-bg-2",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236f6d86' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({ label, children, className, hint }: { label: string; children: ReactNode; className?: string; hint?: string }) {
  return (
    <label className={cn("grid min-w-0 gap-1.5", className)}>
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-faint">{hint}</span>}
    </label>
  );
}

/* ---------------- Surfaces ---------------- */

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card p-4", className)} {...props}>
      {children}
    </div>
  );
}

export function SectionTitle({ icon, title, action, className, count }: { icon?: ReactNode; title: string; action?: ReactNode; className?: string; count?: number }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="flex min-w-0 items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">
        {icon}
        <span className="truncate">{title}</span>
        {count != null && count > 0 && <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] tracking-normal text-ink">{count}</span>}
      </h2>
      {action}
    </div>
  );
}

export function Badge({ children, tone = "default", className }: { children: ReactNode; tone?: "default" | "red" | "orange" | "yellow" | "green" | "blue" | "violet" | "pink"; className?: string }) {
  const tones = {
    default: "bg-surface-3 text-muted",
    red: "bg-red/15 text-red",
    orange: "bg-orange/15 text-orange",
    yellow: "bg-yellow/15 text-yellow",
    green: "bg-green/15 text-green",
    blue: "bg-blue/15 text-blue",
    violet: "bg-violet/18 text-[#b9a2ff]",
    pink: "bg-pink/15 text-pink",
  };
  return <span className={cn("inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium", tones[tone], className)}>{children}</span>;
}

export function Chip({ active, children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "pressable inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium",
        active ? "border-transparent bg-ink text-bg" : "border-line bg-surface text-muted hover:text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-xl border border-line bg-surface p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("pressable h-8 rounded-lg px-3 text-[13px] font-medium", value === o.value ? "bg-surface-3 text-ink shadow-sm" : "text-muted hover:text-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Progress({ value, className, tone = "grad" }: { value: number; className?: string; tone?: "grad" | "green" }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div className={cn("h-full rounded-full transition-all duration-500", tone === "grad" ? "grad" : "bg-green")} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Checkbox({ checked, onChange, label, className, size = 22 }: { checked: boolean; onChange: (v: boolean) => void; label?: string; className?: string; size?: number }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label ?? (checked ? "Desmarcar" : "Concluir")}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn("pressable grid shrink-0 place-items-center rounded-full border-2 transition", checked ? "grad border-transparent" : "border-line-2 hover:border-violet", className)}
      style={{ width: size, height: size }}
    >
      {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
    </button>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("pressable relative h-7 w-12 shrink-0 rounded-full transition", checked ? "grad" : "bg-surface-3")}
    >
      <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-6" : "left-1")} />
    </button>
  );
}

export function Avatar({ name, color, size = 36 }: { name: string; color?: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, ${color ?? "#8b5cff"}, #ff4fb0)` }}>
      {initials || "?"}
    </span>
  );
}

export function EmptyState({ icon, title, text, action, className }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-10 text-center", className)}>
      {icon && <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-muted">{icon}</div>}
      <p className="font-medium">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

/* ---------------- Sheet (bottom sheet on mobile, dialog on desktop) ---------------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus(), 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center lg:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panel}
        style={{ transform: dragY ? `translateY(${dragY}px)` : undefined }}
        className={cn(
          "glass relative flex max-h-[92dvh] w-full animate-sheet flex-col rounded-t-[28px] shadow-2xl lg:max-h-[86dvh] lg:animate-pop lg:rounded-3xl",
          size === "sm" && "lg:max-w-md",
          size === "md" && "lg:max-w-xl",
          size === "lg" && "lg:max-w-3xl",
          size === "xl" && "lg:max-w-5xl",
          className,
        )}
      >
        <div
          className="flex shrink-0 touch-none justify-center pt-2.5 pb-1 lg:hidden"
          onPointerDown={(e) => (startY.current = e.clientY)}
          onPointerMove={(e) => startY.current != null && setDragY(Math.max(0, e.clientY - startY.current))}
          onPointerUp={() => {
            if (dragY > 90) onClose();
            startY.current = null;
            setDragY(0);
          }}
        >
          <span className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>
        {title !== undefined && (
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-2 pb-3 lg:pt-5">
            <div className="min-w-0 flex-1 text-lg font-semibold">{title}</div>
            <button onClick={onClose} className="pressable grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted hover:text-ink" aria-label="Fechar">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-line px-5 pt-3 pb-[max(12px,var(--safe-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- Menu ---------------- */

export function Menu({ trigger, items, align = "right" }: { trigger: ReactNode; items: { label: string; icon?: ReactNode; onClick: () => void; danger?: boolean }[]; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <div
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {trigger}
      </div>
      {open && (
        <div className={cn("glass absolute z-50 mt-1 min-w-48 animate-pop rounded-2xl p-1.5 shadow-2xl", align === "right" ? "right-0" : "left-0")}>
          {items.map((it) => (
            <button
              key={it.label}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                it.onClick();
              }}
              className={cn("flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm hover:bg-surface-3", it.danger ? "text-red" : "text-ink")}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

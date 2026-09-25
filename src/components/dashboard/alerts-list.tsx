import { AlertTriangle, BellRing, CalendarX2, Clock, PackageX, Sparkles } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import type { DashboardAlert } from "@/services/dashboard";
import { cn } from "@/utils/cn";

const TONE = {
  info: "bg-teal-soft-100 text-teal-soft-700",
  warning: "bg-bronze-100 text-bronze-700",
  danger: "bg-[#f6e1de] text-[#9e3b32]",
  success: "bg-sage-100 text-sage-700",
};

function iconFor(alert: DashboardAlert) {
  if (alert.id.startsWith("low-stock")) return PackageX;
  if (alert.id.startsWith("cancel")) return CalendarX2;
  if (alert.id.startsWith("free")) return Sparkles;
  if (alert.id.startsWith("upcoming")) return Clock;
  if (alert.id === "late") return AlertTriangle;
  return BellRing;
}

export function AlertsList({ alerts }: { alerts: DashboardAlert[] }) {
  if (alerts.length === 0) {
    return (
      <EmptyState
        compact
        icon={BellRing}
        title="Tudo em ordem"
        description="Nenhum alerta no momento."
        className="border-none bg-transparent"
      />
    );
  }
  return (
    <ul className="space-y-1.5">
      {alerts.map((alert) => {
        const Icon = iconFor(alert);
        const content = (
          <>
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", TONE[alert.tone])}>
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{alert.title}</span>
              <span className="line-clamp-2 block text-xs text-muted-foreground">{alert.description}</span>
            </span>
          </>
        );
        return (
          <li key={alert.id}>
            {alert.href ? (
              <Link href={alert.href} className="flex items-start gap-3 rounded-xl p-2 transition hover:bg-muted/60">
                {content}
              </Link>
            ) : (
              <div className="flex items-start gap-3 p-2">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

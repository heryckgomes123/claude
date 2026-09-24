"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Sheet, EmptyState, Button } from "@/components/ui";
import { useAiva } from "@/store/aiva";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";

const NONE: never[] = [];

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}

export function NotificationsSheet() {
  const open = useAiva((s) => s.ui.notificationsOpen);
  const setUI = useAiva((s) => s.setUI);
  const list = useAiva((s) => s.data?.notifications) ?? NONE;
  const sync = useAiva((s) => s.sync);
  const unread = list.filter((n) => !n.readAt).length;

  const markAll = async () => {
    await api("/api/notifications/all", { method: "POST" }).catch(() => null);
    sync();
  };
  const markOne = (id: string) => api(`/api/notifications/${id}`, { method: "POST" }).then(() => sync()).catch(() => null);

  return (
    <Sheet
      open={open}
      onClose={() => setUI({ notificationsOpen: false })}
      title="Notificações"
      size="sm"
      footer={unread > 0 ? <Button variant="ghost" size="sm" onClick={markAll}><CheckCheck className="h-4 w-4" /> Marcar todas como lidas</Button> : undefined}
    >
      {list.length === 0 ? (
        <EmptyState icon={<Bell className="h-5 w-5" />} title="Tudo tranquilo" text="Avisos úteis aparecem aqui — lives, prazos, atrasos. Sem spam." />
      ) : (
        <div className="grid gap-1.5">
          {list.map((n) => (
            <Link
              key={n.id}
              href={n.href ?? "/today"}
              onClick={() => {
                if (!n.readAt) markOne(n.id);
                setUI({ notificationsOpen: false });
              }}
              className={cn("flex gap-3 rounded-2xl px-3 py-3 hover:bg-surface-2", !n.readAt && "bg-surface")}
            >
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "grad")} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{n.title}</span>
                {n.body && <span className="block truncate text-[13px] text-muted">{n.body}</span>}
              </span>
              <span className="shrink-0 text-[11px] text-faint">{ago(n.createdAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </Sheet>
  );
}

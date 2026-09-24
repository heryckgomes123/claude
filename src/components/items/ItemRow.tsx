"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, Clapperboard, Radio, Megaphone, Users, CheckSquare, Lightbulb, Inbox, Wallet } from "lucide-react";
import type { ItemRef } from "@/lib/intelligence";
import { useAiva, useList } from "@/store/aiva";
import { Checkbox } from "@/components/ui";
import { cn } from "@/lib/cn";

const ICON = { tasks: CheckSquare, events: CalendarClock, contents: Clapperboard, lives: Radio, campaigns: Megaphone, clients: Users, ideas: Lightbulb, captures: Inbox, transactions: Wallet };
const TONE = { danger: "text-red bg-red/12", warn: "text-orange bg-orange/12", info: "text-blue bg-blue/12", ok: "text-green bg-green/12" };

/** Renders any ItemRef produced by the intelligence layer; tasks get an inline checkbox. */
export function ItemRow({ item }: { item: ItemRef }) {
  const setUI = useAiva((s) => s.setUI);
  const update = useAiva((s) => s.update);
  const toast = useAiva((s) => s.toast);
  const task = useList("tasks").find((t) => item.entity === "tasks" && t.id === item.id);
  const router = useRouter();
  const Icon = ICON[item.entity] ?? CheckSquare;
  const open = () => {
    if (["tasks", "events", "contents", "lives", "campaigns", "clients", "ideas"].includes(item.entity)) setUI({ detail: { entity: item.entity as never, id: item.id } });
    else router.push(item.href);
  };
  return (
    <div role="button" tabIndex={0} onClick={open} onKeyDown={(e) => e.key === "Enter" && open()} className="pressable flex min-h-[54px] cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-2 hover:bg-surface-2">
      {task ? (
        <Checkbox
          checked={task.status === "done"}
          onChange={(v) => {
            update("tasks", task.id, { status: v ? "done" : "todo" });
            if (v) toast({ message: "Concluída ✓", tone: "success", action: { label: "Desfazer", onClick: () => update("tasks", task.id, { status: "todo" }) } });
          }}
        />
      ) : (
        <span className={cn("grid h-[22px] w-[22px] shrink-0 place-items-center rounded-lg", TONE[item.tone ?? "info"])}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[15px]", task?.status === "done" && "text-faint line-through")}>{item.title}</p>
        {item.meta && <p className={cn("truncate text-[12px]", item.tone === "danger" ? "text-red/90" : "text-muted")}>{item.meta}</p>}
      </div>
    </div>
  );
}

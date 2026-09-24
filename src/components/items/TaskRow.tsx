"use client";

import { Repeat, ListChecks, CalendarClock, AlertTriangle, Link2 } from "lucide-react";
import { Checkbox, Badge } from "@/components/ui";
import { useAiva, useList } from "@/store/aiva";
import type { Task } from "@/lib/types";
import { fmtWhen, isOverdue } from "@/lib/intelligence";
import { PRIORITY_LABEL, PRIORITY_TONE } from "@/components/detail/fields";
import { cn } from "@/lib/cn";

export function TaskRow({ task, clock, showProject = true, className }: { task: Task; clock: { now: Date; tzOffset: number }; showProject?: boolean; className?: string }) {
  const update = useAiva((s) => s.update);
  const setUI = useAiva((s) => s.setUI);
  const toast = useAiva((s) => s.toast);
  const project = useList("projects").find((p) => p.id === task.projectId);
  const done = task.status === "done";
  const overdue = isOverdue(task, clock);
  const checks = task.checklist.length;
  const checksDone = task.checklist.filter((c) => c.done).length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setUI({ detail: { entity: "tasks", id: task.id } })}
      onKeyDown={(e) => e.key === "Enter" && setUI({ detail: { entity: "tasks", id: task.id } })}
      className={cn("pressable group flex min-h-[56px] cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-surface-2", className)}
    >
      <Checkbox
        checked={done}
        onChange={(v) => {
          update("tasks", task.id, { status: v ? "done" : "todo" });
          if (v) {
            navigator.vibrate?.(10);
            toast({ message: "Tarefa concluída", tone: "success", action: { label: "Desfazer", onClick: () => update("tasks", task.id, { status: "todo" }) } });
          }
        }}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[15px]", done && "text-faint line-through")}>{task.title}</p>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-muted">
          {task.dueAt && (
            <span className={cn("inline-flex items-center gap-1", overdue && "text-red")}>
              {overdue ? <AlertTriangle className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
              {fmtWhen(task.dueAt, task.hasTime, clock)}
            </span>
          )}
          {task.recurrence && <Repeat className="h-3 w-3" aria-label="Recorrente" />}
          {checks > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListChecks className="h-3 w-3" />
              {checksDone}/{checks}
            </span>
          )}
          {showProject && project && <span className="truncate">{project.emoji ?? "📁"} {project.name}</span>}
          {task.category && <span className="truncate">{task.category}</span>}
          {task.dependsOn.length > 0 && <Link2 className="h-3 w-3" aria-label="Tem dependências" />}
        </div>
      </div>
      {task.priority !== "none" && !done && <Badge tone={PRIORITY_TONE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>}
    </div>
  );
}

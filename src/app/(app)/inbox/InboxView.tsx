"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Check, MoreHorizontal, Sparkles, Mic, Type, ArrowRightLeft, Trash2 } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/PageHeader";
import { Button, EmptyState, Badge, Menu, SectionTitle } from "@/components/ui";
import { TaskRow } from "@/components/items/TaskRow";
import { useAiva, useList } from "@/store/aiva";
import { useClock } from "@/hooks/use-clock";
import { ENTITY_LABEL, type EntityName } from "@/lib/entities";
import { cleanTitle, suggestHook } from "@/lib/nlp/interpret";
import type { Capture } from "@/lib/types";
import { cn } from "@/lib/cn";

const TONE: Partial<Record<EntityName, "blue" | "violet" | "pink" | "yellow" | "green" | "orange">> = {
  tasks: "blue",
  events: "violet",
  ideas: "yellow",
  contents: "pink",
  notes: "green",
  clients: "orange",
};

const CONVERT: { entity: EntityName; label: string }[] = [
  { entity: "tasks", label: "Tarefa" },
  { entity: "ideas", label: "Ideia" },
  { entity: "notes", label: "Nota" },
  { entity: "contents", label: "Conteúdo" },
  { entity: "projects", label: "Projeto" },
  { entity: "clients", label: "Cliente" },
];

/** Universal Inbox — everything captured, waiting to be organized. */
export function InboxView() {
  const captures = useList("captures");
  const tasks = useList("tasks");
  const update = useAiva((s) => s.update);
  const create = useAiva((s) => s.create);
  const remove = useAiva((s) => s.remove);
  const setUI = useAiva((s) => s.setUI);
  const creator = useAiva((s) => s.me?.workspace.settings.creatorMode);
  const router = useRouter();
  const clock = useClock();
  const [showDone, setShowDone] = useState(false);

  const pending = useMemo(() => captures.filter((c) => c.status === "pending"), [captures]);
  const organized = useMemo(() => captures.filter((c) => c.status === "organized").slice(0, 30), [captures]);
  const inboxTasks = tasks.filter((t) => t.status === "inbox" && !captures.some((c) => c.entityId === t.id && c.status === "pending"));

  const open = (c: Capture) => {
    if (!c.entityType || !c.entityId) return;
    const e = c.entityType as EntityName;
    if (["tasks", "events", "contents", "lives", "campaigns", "clients", "ideas", "notes"].includes(e)) setUI({ detail: { entity: e, id: c.entityId } });
    else if (e === "projects") router.push(`/projects/${c.entityId}`);
    else if (e === "goals" || e === "habits") router.push("/goals");
    else if (e === "transactions") router.push("/finance");
  };

  const convert = async (c: Capture, to: EntityName) => {
    const title = cleanTitle(c.text) || c.text;
    let row: { id: string } | null = null;
    if (to === "tasks") row = await create("tasks", { title, status: "todo" }, { silent: true });
    if (to === "ideas") row = await create("ideas", { title, hook: suggestHook(title), status: "raw" }, { silent: true });
    if (to === "notes") row = await create("notes", { title: title.slice(0, 120), body: c.text }, { silent: true });
    if (to === "contents") row = await create("contents", { title, stage: "idea" }, { silent: true });
    if (to === "projects") row = await create("projects", { name: title, status: "active" }, { silent: true });
    if (to === "clients") row = await create("clients", { name: title, kind: "lead", stage: "new" }, { silent: true });
    if (!row) return;
    if (c.entityType && c.entityId) remove(c.entityType as EntityName, c.entityId, { label: ENTITY_LABEL[c.entityType as EntityName] ?? "Item anterior" });
    await update("captures", c.id, { entityType: to, entityId: row.id });
  };

  const organizeAll = () => router.push(`/aiva?q=${encodeURIComponent("Organize minha inbox")}`);

  return (
    <Page>
      <PageHeader
        title="Inbox"
        subtitle="Capture agora. Organize depois."
        actions={
          pending.length + inboxTasks.length > 0 ? (
            <Button variant="soft" size="sm" onClick={organizeAll}>
              <Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">Organizar com AIVA</span>
            </Button>
          ) : undefined
        }
      />

      {pending.length === 0 && inboxTasks.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title="Inbox zerada 🧘"
          text="Tudo que você capturar pelo botão + ou pela voz aparece aqui primeiro — já entendido e classificado pela AIVA."
          action={
            <Button variant="primary" onClick={() => setUI({ captureOpen: true, captureMode: "text" })}>
              Capturar algo
            </Button>
          }
        />
      ) : (
        <div className="grid gap-2">
          {pending.map((c) => (
            <div key={c.id} className="card flex animate-rise items-start gap-3 p-3.5">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">{c.source === "voice" ? <Mic className="h-4 w-4" /> : <Type className="h-4 w-4" />}</span>
              <button onClick={() => open(c)} className="min-w-0 flex-1 text-left">
                <p className="text-[15px] leading-snug">{c.text}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {c.entityType && <Badge tone={TONE[c.entityType as EntityName] ?? "default"}>→ {ENTITY_LABEL[c.entityType as EntityName] ?? c.entityType}</Badge>}
                  <span className="text-[11px] text-faint">{new Date(c.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => update("captures", c.id, { status: "organized" })} className="pressable grid h-10 w-10 place-items-center rounded-xl bg-green/12 text-green" aria-label="Marcar como organizado" title="Organizado">
                  <Check className="h-4 w-4" />
                </button>
                <Menu
                  trigger={
                    <button className="pressable grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-surface-2" aria-label="Mais ações">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  }
                  items={[
                    ...CONVERT.filter((x) => x.entity !== c.entityType && (creator || x.entity !== "contents")).map((x) => ({ label: `Converter em ${x.label}`, icon: <ArrowRightLeft className="h-4 w-4" />, onClick: () => convert(c, x.entity) })),
                    {
                      label: "Excluir",
                      icon: <Trash2 className="h-4 w-4" />,
                      danger: true,
                      onClick: () => {
                        if (c.entityType && c.entityId) remove(c.entityType as EntityName, c.entityId, { label: ENTITY_LABEL[c.entityType as EntityName] });
                        remove("captures", c.id, { label: "Captura" });
                      },
                    },
                  ]}
                />
              </div>
            </div>
          ))}

          {inboxTasks.length > 0 && (
            <section className="mt-4">
              <SectionTitle title="Tarefas sem organizar" count={inboxTasks.length} />
              <div className="card p-1">
                {inboxTasks.map((t) => (
                  <TaskRow key={t.id} task={t} clock={clock} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {organized.length > 0 && (
        <div className="mt-8">
          <button onClick={() => setShowDone((v) => !v)} className="text-[13px] text-muted hover:text-ink">
            {showDone ? "Ocultar" : "Mostrar"} organizados recentemente ({organized.length})
          </button>
          {showDone && (
            <div className="mt-3 grid gap-1.5">
              {organized.map((c) => (
                <button key={c.id} onClick={() => open(c)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-muted hover:bg-surface")}>
                  <Check className="h-4 w-4 shrink-0 text-green" /> <span className="min-w-0 flex-1 truncate">{c.text}</span>
                  {c.entityType && <Badge>{ENTITY_LABEL[c.entityType as EntityName]}</Badge>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Page>
  );
}

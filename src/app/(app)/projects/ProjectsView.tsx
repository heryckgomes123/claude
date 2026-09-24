"use client";

import Link from "next/link";
import { useState } from "react";
import { FolderKanban, Plus } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/PageHeader";
import { Button, EmptyState, Progress, Chip, Sheet, Input, Field, Badge } from "@/components/ui";
import { useAiva, useList } from "@/store/aiva";
import { useClock } from "@/hooks/use-clock";
import { fmtDay, isOverdue } from "@/lib/intelligence";
import { useRouter } from "next/navigation";

const EMOJIS = ["🚀", "🎬", "💼", "🏠", "📚", "💡", "🎯", "🛠️", "💰", "🌱", "✈️", "🎨"];
const STATUS = { active: "Ativo", paused: "Pausado", done: "Concluído", archived: "Arquivado" } as const;

export function ProjectsView() {
  const projects = useList("projects");
  const tasks = useList("tasks");
  const create = useAiva((s) => s.create);
  const clock = useClock();
  const router = useRouter();
  const [status, setStatus] = useState<keyof typeof STATUS>("active");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🚀");

  const list = projects.filter((p) => p.status === status);

  const add = async () => {
    if (!name.trim()) return;
    const row = await create("projects", { name: name.trim(), emoji, status: "active" }, { silent: true });
    setOpen(false);
    setName("");
    if (row) router.push(`/projects/${row.id}`);
  };

  return (
    <Page wide>
      <PageHeader
        title="Projetos"
        subtitle="Centros de contexto: tudo de um projeto num lugar só."
        actions={
          <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo projeto</span>
          </Button>
        }
      />
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
        {(Object.keys(STATUS) as (keyof typeof STATUS)[]).map((s) => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
            {STATUS[s]} <span className="opacity-60">{projects.filter((p) => p.status === s).length}</span>
          </Chip>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<FolderKanban className="h-5 w-5" />} title={status === "active" ? "Nenhum projeto ativo" : `Nenhum projeto ${STATUS[status].toLowerCase()}`} text="Projetos conectam tarefas, agenda, notas, pessoas e dinheiro." action={status === "active" ? <Button variant="primary" onClick={() => setOpen(true)}>Criar projeto</Button> : undefined} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const ts = tasks.filter((t) => t.projectId === p.id);
            const done = ts.filter((t) => t.status === "done").length;
            const late = ts.filter((t) => isOverdue(t, clock)).length;
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="card pressable flex flex-col gap-4 p-4 hover:bg-surface-2">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-xl">{p.emoji ?? "📁"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="line-clamp-2 text-[13px] text-muted">{p.description || `${ts.length} tarefas`}</p>
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[12px] text-muted">
                    <span>
                      {done}/{ts.length} concluídas
                    </span>
                    <span className="flex gap-1.5">
                      {late > 0 && <Badge tone="red">{late} atrasadas</Badge>}
                      {p.dueAt && <Badge>prazo {fmtDay(p.dueAt, clock)}</Badge>}
                    </span>
                  </div>
                  <Progress value={ts.length ? (done / ts.length) * 100 : 0} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Novo projeto" size="sm" footer={<Button variant="primary" className="w-full" onClick={add} disabled={!name.trim()}>Criar projeto</Button>}>
        <div className="grid gap-4">
          <Field label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Ex.: Lançamento Produto X" data-autofocus maxLength={200} />
          </Field>
          <Field label="Ícone">
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => setEmoji(e)} className={`pressable grid h-11 w-11 place-items-center rounded-xl text-xl ${emoji === e ? "grad-border" : "bg-surface"}`}>
                  {e}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Sheet>
    </Page>
  );
}

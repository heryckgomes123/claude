"use client";

import { useMemo, useState } from "react";
import { StickyNote, Plus, Link2, Pin, Search } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/PageHeader";
import { Button, Chip, EmptyState } from "@/components/ui";
import { useAiva, useList } from "@/store/aiva";
import { useOpenParam } from "@/hooks/use-open-param";
import { normalize } from "@/lib/intelligence";
import { cn } from "@/lib/cn";

const KINDS = [
  { value: "all", label: "Tudo" },
  { value: "note", label: "Notas" },
  { value: "link", label: "Links" },
  { value: "reference", label: "Referências" },
  { value: "list", label: "Listas" },
  { value: "message", label: "Mensagens" },
];

export function NotesView() {
  const notes = useList("notes");
  const projects = useList("projects");
  const create = useAiva((s) => s.create);
  const setUI = useAiva((s) => s.setUI);
  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");
  useOpenParam("notes");

  const list = useMemo(() => {
    const nq = normalize(q.trim());
    return notes
      .filter((n) => kind === "all" || n.kind === kind)
      .filter((n) => !nq || normalize(`${n.title} ${n.body ?? ""} ${n.url ?? ""}`).includes(nq))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, kind, q]);

  const add = async () => {
    const row = await create("notes", { title: "Nova nota", kind: kind === "all" ? "note" : kind }, { silent: true });
    if (row) setUI({ detail: { entity: "notes", id: row.id } });
  };

  return (
    <Page wide>
      <PageHeader title="Notas" subtitle="Ideias soltas, links, referências e listas." actions={<Button variant="primary" size="sm" onClick={add}><Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nota</span></Button>} />
      <div className="card mb-3 flex items-center gap-2 px-3.5">
        <Search className="h-4 w-4 text-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nas notas…" className="h-11 min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint" aria-label="Buscar notas" />
      </div>
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
        {KINDS.map((k) => (
          <Chip key={k.value} active={kind === k.value} onClick={() => setKind(k.value)}>{k.label}</Chip>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<StickyNote className="h-5 w-5" />} title="Nenhuma nota" text="Escreva “anotar …” na captura, cole um link, ou crie uma nota aqui." action={<Button variant="primary" onClick={add}>Nova nota</Button>} />
      ) : (
        <div className="columns-1 gap-3 sm:columns-2 xl:columns-3 [&>*]:mb-3">
          {list.map((n) => {
            const project = projects.find((p) => p.id === n.projectId);
            return (
              <button key={n.id} onClick={() => setUI({ detail: { entity: "notes", id: n.id } })} className={cn("card block w-full break-inside-avoid p-4 text-left hover:bg-surface-2", n.pinned && "border-yellow/30")}>
                <p className="flex items-start gap-2 font-medium">
                  {n.pinned && <Pin className="mt-1 h-3.5 w-3.5 shrink-0 text-yellow" />}
                  {n.kind === "link" && <Link2 className="mt-1 h-3.5 w-3.5 shrink-0 text-blue" />}
                  <span className="min-w-0 break-words">{n.title}</span>
                </p>
                {n.url && <p className="mt-1 truncate text-[12px] text-blue">{n.url}</p>}
                {n.body && n.body !== n.title && <p className="mt-2 line-clamp-6 text-[13px] whitespace-pre-line text-muted">{n.body}</p>}
                <p className="mt-3 text-[11px] text-faint">{project ? `${project.emoji ?? "📁"} ${project.name} · ` : ""}{new Date(n.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
              </button>
            );
          })}
        </div>
      )}
    </Page>
  );
}

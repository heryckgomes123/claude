"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Users, Plus, List, Columns3, Search } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/PageHeader";
import { Board } from "@/components/Board";
import { Button, Chip, EmptyState, Badge, Segmented, Avatar, Sheet, Field, Input, Select } from "@/components/ui";
import { useAiva, useList } from "@/store/aiva";
import { useClock } from "@/hooks/use-clock";
import { useOpenParam } from "@/hooks/use-open-param";
import { followUps, fmtDay, brl, normalize } from "@/lib/intelligence";
import { CLIENT_STAGE } from "@/lib/entities";
import { CLIENT_STAGE_LABEL } from "@/components/detail/fields";

const KIND_LABEL: Record<string, string> = { lead: "Lead", client: "Cliente", brand: "Marca", contact: "Contato" };
const STAGE_COLOR: Record<string, string> = { new: "#6f6d86", contacted: "#3d8bff", proposal: "#8b5cff", negotiation: "#ffa24c", won: "#3ddc97", lost: "#ff5c7a" };

export function ClientsView() {
  const clients = useList("clients");
  const create = useAiva((s) => s.create);
  const update = useAiva((s) => s.update);
  const setUI = useAiva((s) => s.setUI);
  const clock = useClock();
  const [view, setView] = useState<"list" | "board">("list");
  const params = useSearchParams();
  const [filter, setFilter] = useState(() => (params.get("filter") === "followup" ? "followup" : "all"));
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", kind: "lead", email: "", phone: "" });
  useOpenParam("clients");


  const due = useMemo(() => new Set(followUps({ clients } as never, clock).map((c) => c.id)), [clients, clock]);
  const list = clients
    .filter((c) => (filter === "all" ? true : filter === "followup" ? due.has(c.id) : c.kind === filter))
    .filter((c) => !q || normalize(`${c.name} ${c.company ?? ""} ${c.email ?? ""}`).includes(normalize(q)))
    .sort((a, b) => Number(due.has(b.id)) - Number(due.has(a.id)) || a.name.localeCompare(b.name));
  const pipelineValue = clients.filter((c) => !["won", "lost"].includes(c.stage)).reduce((a, c) => a + (c.value ?? 0), 0);

  const add = async () => {
    if (!form.name.trim()) return;
    const row = await create("clients", { name: form.name.trim(), company: form.company || null, kind: form.kind as "lead", email: form.email || null, phone: form.phone || null, stage: form.kind === "client" ? "won" : "new" }, { silent: true });
    setOpen(false);
    setForm({ name: "", company: "", kind: "lead", email: "", phone: "" });
    if (row) setUI({ detail: { entity: "clients", id: row.id } });
  };

  return (
    <Page wide>
      <PageHeader
        title="Clientes"
        subtitle={`${clients.length} contatos · ${brl(pipelineValue)} em negociação`}
        actions={
          <>
            <Segmented value={view} onChange={setView} options={[{ value: "list", label: <List className="h-4 w-4" aria-label="Lista" /> }, { value: "board", label: <Columns3 className="h-4 w-4" aria-label="Funil" /> }]} />
            <Button variant="primary" size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> <span className="hidden sm:inline">Contato</span></Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="-mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
          {[["all", "Todos"], ["followup", `Follow-up${due.size ? ` · ${due.size}` : ""}`], ["lead", "Leads"], ["client", "Clientes"], ["brand", "Marcas"], ["contact", "Contatos"]].map(([v, l]) => (
            <Chip key={v} active={filter === v} onClick={() => setFilter(v)}>{l}</Chip>
          ))}
        </div>
        <div className="card flex w-full items-center gap-2 px-3 sm:w-64">
          <Search className="h-4 w-4 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="h-10 min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint" aria-label="Buscar contatos" />
        </div>
      </div>

      {clients.length === 0 ? (
        <EmptyState icon={<Users className="h-5 w-5" />} title="Seu CRM está vazio" text="Leads, clientes, marcas e follow-ups — conectados a tarefas, projetos e financeiro." action={<Button variant="primary" onClick={() => setOpen(true)}>Adicionar contato</Button>} />
      ) : view === "list" ? (
        <div className="card divide-y divide-line p-1">
          {list.map((c) => (
            <button key={c.id} onClick={() => setUI({ detail: { entity: "clients", id: c.id } })} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-surface-2">
              <Avatar name={c.name} size={38} color={STAGE_COLOR[c.stage]} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px]">{c.name}</span>
                <span className="block truncate text-[12px] text-muted">{[c.company, KIND_LABEL[c.kind], c.value ? brl(c.value) : null].filter(Boolean).join(" · ")}</span>
              </span>
              {due.has(c.id) && <Badge tone="orange">follow-up</Badge>}
              <Badge className="hidden sm:inline-flex">{CLIENT_STAGE_LABEL[c.stage]}</Badge>
              {c.nextFollowUpAt && <span className="hidden text-[12px] text-muted sm:block">{fmtDay(c.nextFollowUpAt, clock)}</span>}
            </button>
          ))}
          {list.length === 0 && <p className="px-3 py-6 text-center text-sm text-faint">Nenhum contato neste filtro.</p>}
        </div>
      ) : (
        <Board
          columns={CLIENT_STAGE.map((s) => ({ id: s, title: CLIENT_STAGE_LABEL[s], color: STAGE_COLOR[s] }))}
          items={list}
          columnOf={(c) => c.stage}
          onMove={(c, stage) => update("clients", c.id, { stage })}
          renderCard={(c) => (
            <button onClick={() => setUI({ detail: { entity: "clients", id: c.id } })} className="card block w-full bg-bg-2 p-3 text-left hover:bg-surface-2">
              <p className="text-sm font-medium">{c.name}</p>
              <p className="text-[12px] text-muted">{c.company ?? KIND_LABEL[c.kind]}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.value != null && <Badge tone="green">{brl(c.value)}</Badge>}
                {due.has(c.id) && <Badge tone="orange">follow-up</Badge>}
              </div>
            </button>
          )}
        />
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Novo contato" size="sm" footer={<Button variant="primary" className="w-full" onClick={add} disabled={!form.name.trim()}>Salvar</Button>}>
        <div className="grid gap-4">
          <Field label="Nome"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-autofocus /></Field>
          <Field label="Empresa"><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
          <Field label="Tipo">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Telefone"><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
        </div>
      </Sheet>
    </Page>
  );
}

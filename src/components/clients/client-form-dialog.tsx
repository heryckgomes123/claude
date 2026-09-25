"use client";

import { useState } from "react";
import { createClientAction, updateClientAction } from "@/actions/clients";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import { clientInput } from "@/schemas/client";
import { formatPhone } from "@/utils/phone";

export type EditableClient = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  birthDate: string | null;
  notes: string | null;
};

type SavedClient = { id: string; name: string; phone: string | null; whatsapp: string | null };

const empty = { name: "", phone: "", whatsapp: "", email: "", birthDate: "", notes: "" };

/** Cadastro rápido de cliente: só o nome é obrigatório. */
export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  initialName,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: EditableClient | null;
  initialName?: string;
  onSaved?: (client: SavedClient) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <ClientForm client={client} initialName={initialName} onSaved={onSaved} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ClientForm({
  client,
  initialName,
  onSaved,
  onClose,
}: {
  client?: EditableClient | null;
  initialName?: string;
  onSaved?: (client: SavedClient) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(() =>
    client
      ? {
          name: client.name,
          phone: formatPhone(client.phone),
          whatsapp: formatPhone(client.whatsapp),
          email: client.email ?? "",
          birthDate: client.birthDate ?? "",
          notes: client.notes ?? "",
        }
      : { ...empty, name: initialName ?? "" },
  );
  const [sameWhatsapp, setSameWhatsapp] = useState(() => !client || !client.whatsapp || client.whatsapp === client.phone);
  const [showMore, setShowMore] = useState(Boolean(client));
  const { pending, run, fieldError, setFieldErrors } = useServerAction();

  const set = (key: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, whatsapp: sameWhatsapp ? form.phone : form.whatsapp };
    const parsed = clientInput.safeParse(payload);
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) errors[String(issue.path[0])] = [issue.message];
      setFieldErrors(errors);
      return;
    }
    if (client) {
      run(() => updateClientAction({ ...payload, clientId: client.id }), {
        success: "Cliente atualizada.",
        onSuccess: () => {
          onClose();
          onSaved?.({ id: client.id, name: form.name, phone: null, whatsapp: null });
        },
      });
    } else {
      run(() => createClientAction(payload), {
        success: (c) => `${c.name} cadastrada.`,
        onSuccess: (created) => {
          onClose();
          onSaved?.(created);
        },
      });
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogHeader>
        <DialogTitle>{client ? "Editar cliente" : "Nova cliente"}</DialogTitle>
        <DialogDescription>{client ? "Atualize os dados de contato." : "Cadastro rápido — apenas o nome é obrigatório."}</DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4 pb-5">
        <FormField id="client-name" label="Nome" required error={fieldError("name")}>
          <Input
            id="client-name"
            value={form.name}
            onChange={set("name")}
            autoFocus
            autoComplete="off"
            maxLength={120}
            aria-invalid={!!fieldError("name")}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="client-phone" label="Telefone" error={fieldError("phone")}>
            <Input
              id="client-phone"
              inputMode="tel"
              placeholder="(11) 98765-4321"
              value={form.phone}
              onChange={set("phone")}
              aria-invalid={!!fieldError("phone")}
            />
          </FormField>
          <FormField id="client-whatsapp" label="WhatsApp" error={fieldError("whatsapp")}>
            {sameWhatsapp ? (
              <label className="flex h-10 items-center gap-2 rounded-xl border border-dashed border-input px-3 text-sm text-muted-foreground">
                <Checkbox checked onCheckedChange={() => setSameWhatsapp(false)} aria-label="WhatsApp é o mesmo telefone" />
                Mesmo número do telefone
              </label>
            ) : (
              <Input
                id="client-whatsapp"
                inputMode="tel"
                placeholder="(11) 98765-4321"
                value={form.whatsapp}
                onChange={set("whatsapp")}
                aria-invalid={!!fieldError("whatsapp")}
              />
            )}
          </FormField>
        </div>
        {!showMore ? (
          <Button type="button" variant="link" size="sm" onClick={() => setShowMore(true)}>
            + E-mail, aniversário e observações
          </Button>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="client-email" label="E-mail" error={fieldError("email")}>
                <Input id="client-email" type="email" value={form.email} onChange={set("email")} aria-invalid={!!fieldError("email")} />
              </FormField>
              <FormField id="client-birth" label="Aniversário" error={fieldError("birthDate")}>
                <Input
                  id="client-birth"
                  type="date"
                  value={form.birthDate}
                  onChange={set("birthDate")}
                  max={new Date().toISOString().slice(0, 10)}
                />
              </FormField>
            </div>
            <FormField id="client-notes" label="Observações" hint="Preferências, alergias, cuidados…" error={fieldError("notes")}>
              <Textarea id="client-notes" value={form.notes} onChange={set("notes")} maxLength={2000} />
            </FormField>
          </div>
        )}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending}>
          {client ? "Salvar alterações" : "Cadastrar cliente"}
        </Button>
      </DialogFooter>
    </form>
  );
}

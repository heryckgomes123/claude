"use client";

import { CalendarPlus, MessageCircle, Pencil, Phone, Power, Sparkles } from "lucide-react";
import { useState } from "react";
import { setClientActiveAction } from "@/actions/clients";
import { useCan } from "@/components/layout/app-context";
import { useQuickActions } from "@/components/layout/quick-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";
import { whatsappLink } from "@/utils/phone";
import { ClientFormDialog, type EditableClient } from "./client-form-dialog";

export function ClientProfileActions({ client, isActive }: { client: EditableClient; isActive: boolean }) {
  const can = useCan();
  const quick = useQuickActions();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { run, pending } = useServerAction();
  const wa = whatsappLink(client.whatsapp ?? client.phone);
  const option = { id: client.id, name: client.name, phone: client.phone ?? client.whatsapp };

  return (
    <>
      {client.phone && (
        <Button asChild variant="outline" size="icon" aria-label="Ligar">
          <a href={`tel:${client.phone}`}>
            <Phone />
          </a>
        </Button>
      )}
      {wa && (
        <Button asChild variant="outline" size="icon" aria-label="Abrir conversa no WhatsApp">
          <a href={wa} target="_blank" rel="noopener noreferrer">
            <MessageCircle />
          </a>
        </Button>
      )}
      {can("clients.edit") && (
        <Button variant="outline" onClick={() => setEditing(true)}>
          <Pencil /> Editar
        </Button>
      )}
      {can("clients.deactivate") && (
        <Button
          variant="outline"
          onClick={() =>
            isActive
              ? setConfirming(true)
              : run(() => setClientActiveAction({ clientId: client.id, isActive: true }), { success: "Cliente reativada." })
          }
          loading={pending}
        >
          <Power /> {isActive ? "Desativar" : "Reativar"}
        </Button>
      )}
      {isActive && can("appointments.create") && (
        <Button variant="outline" onClick={() => quick.newWalkIn(option)}>
          <Sparkles /> Atender agora
        </Button>
      )}
      {isActive && can("appointments.create") && (
        <Button onClick={() => quick.newAppointment({ client: option })}>
          <CalendarPlus /> Agendar
        </Button>
      )}
      <ClientFormDialog open={editing} onOpenChange={setEditing} client={client} />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Desativar cliente?"
        description="Ela deixa de aparecer nas buscas e não poderá receber novos agendamentos. O histórico é preservado."
        confirmLabel="Desativar"
        destructive
        onConfirm={() => run(() => setClientActiveAction({ clientId: client.id, isActive: false }), { success: "Cliente desativada." })}
      />
    </>
  );
}

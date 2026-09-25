"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { startWalkInAction } from "@/actions/attendance";
import { ClientCombobox, type ClientOption } from "@/components/clients/client-combobox";
import { useApp } from "@/components/layout/app-context";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import { formatMoney } from "@/utils/money";

/** Atendimento imediato (encaixe) sem agendamento prévio — ocupa a agenda a partir de agora. */
export function WalkInDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientOption;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <WalkInForm initialClient={client} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function WalkInForm({ initialClient, onClose }: { initialClient?: ClientOption; onClose: () => void }) {
  const { services, professionals } = useApp();
  const router = useRouter();
  const [client, setClient] = useState<ClientOption | null>(initialClient ?? null);
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const { pending, run, fieldError, setFieldErrors } = useServerAction();

  const eligible = useMemo(() => professionals.filter((p) => !serviceId || p.serviceIds.includes(serviceId)), [professionals, serviceId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string[]> = {};
    if (!client) errors.clientId = ["Selecione a cliente."];
    if (!serviceId) errors.serviceId = ["Selecione o serviço."];
    if (!professionalId) errors.professionalId = ["Selecione a profissional."];
    if (Object.keys(errors).length) return setFieldErrors(errors);
    run(() => startWalkInAction({ clientId: client!.id, serviceId, professionalId }), {
      success: "Atendimento iniciado.",
      onSuccess: (res) => {
        onClose();
        router.push(`/painel/atendimentos/${res.id}`);
      },
    });
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DialogHeader>
        <DialogTitle>Novo atendimento</DialogTitle>
        <DialogDescription>Encaixe imediato: a cliente já está no salão.</DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4 pb-5">
        <FormField id="walkin-client" label="Cliente" required error={fieldError("clientId")}>
          <ClientCombobox id="walkin-client" value={client} onChange={setClient} />
        </FormField>
        <FormField id="walkin-service" label="Serviço" required error={fieldError("serviceId")}>
          <NativeSelect
            id="walkin-service"
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              const compatible = professionals.filter((p) => p.serviceIds.includes(e.target.value));
              if (!compatible.some((p) => p.id === professionalId)) setProfessionalId(compatible.length === 1 ? compatible[0].id : "");
            }}
          >
            <option value="">Selecione</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.categoryName} · {s.name} · {formatMoney(s.priceCents)}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="walkin-professional" label="Profissional" required error={fieldError("professionalId")}>
          <NativeSelect id="walkin-professional" value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
            <option value="">Selecione</option>
            {eligible.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending}>
          <Sparkles /> Iniciar atendimento
        </Button>
      </DialogFooter>
    </form>
  );
}

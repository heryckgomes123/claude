"use client";

import { useState } from "react";
import { updateCompanyAction } from "@/actions/settings";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import { formatPhone } from "@/utils/phone";

type Company = {
  name: string;
  logoUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  address: string | null;
};

export function CompanyForm({ company, editable }: { company: Company; editable: boolean }) {
  const [form, setForm] = useState({
    name: company.name,
    logoUrl: company.logoUrl ?? "",
    phone: formatPhone(company.phone),
    whatsapp: formatPhone(company.whatsapp),
    instagram: company.instagram ? `@${company.instagram}` : "",
    address: company.address ?? "",
  });
  const { pending, run, fieldError } = useServerAction();
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateCompanyAction(form), { success: "Dados da empresa salvos." });
      }}
    >
      <fieldset disabled={!editable} className="contents">
        <FormField id="co-name" label="Nome" required error={fieldError("name")}>
          <Input id="co-name" value={form.name} onChange={set("name")} />
        </FormField>
        <FormField id="co-logo" label="Logo (URL)" error={fieldError("logoUrl")} hint="Upload de arquivos na próxima fase.">
          <Input id="co-logo" type="url" value={form.logoUrl} onChange={set("logoUrl")} placeholder="https://…" />
        </FormField>
        <FormField id="co-phone" label="Telefone" error={fieldError("phone")}>
          <Input id="co-phone" inputMode="tel" value={form.phone} onChange={set("phone")} />
        </FormField>
        <FormField id="co-wa" label="WhatsApp" error={fieldError("whatsapp")}>
          <Input id="co-wa" inputMode="tel" value={form.whatsapp} onChange={set("whatsapp")} />
        </FormField>
        <FormField id="co-ig" label="Instagram" error={fieldError("instagram")}>
          <Input id="co-ig" value={form.instagram} onChange={set("instagram")} placeholder="@rbeauty" />
        </FormField>
        <FormField id="co-address" label="Endereço" error={fieldError("address")}>
          <Input id="co-address" value={form.address} onChange={set("address")} />
        </FormField>
      </fieldset>
      {editable ? (
        <div className="sm:col-span-2">
          <Button type="submit" loading={pending}>
            Salvar dados da empresa
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground sm:col-span-2">Somente a proprietária pode editar os dados da empresa.</p>
      )}
    </form>
  );
}

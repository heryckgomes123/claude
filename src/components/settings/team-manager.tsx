"use client";

import { Pencil, UserPlus } from "lucide-react";
import { useState } from "react";
import { createUserAction, updateUserAction } from "@/actions/settings";
import { FormField } from "@/components/shared/form-field";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_LABELS, ROLES, type Role } from "@/config/permissions";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDateTime } from "@/utils/dates";

type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
  professionalId: string | null;
  professionalName: string | null;
};

export function TeamManager({
  users,
  professionals,
  currentUserId,
}: {
  users: TeamUser[];
  professionals: { id: string; name: string }[];
  currentUserId: string;
}) {
  const [editing, setEditing] = useState<TeamUser | null | undefined>(undefined);
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing(null)}>
          <UserPlus /> Novo usuário
        </Button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Usuário</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Profissional vinculada</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} color="#9c7248" size="sm" className="ring-0" />
                    <div>
                      <p className="font-semibold">
                        {u.name} {u.id === currentUserId && <span className="text-xs text-muted-foreground">(você)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    tone={u.role === "OWNER" ? "dark" : u.role === "MANAGER" ? "terracotta" : u.role === "RECEPTION" ? "bronze" : "sage"}
                  >
                    {ROLE_LABELS[u.role]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.professionalName ?? "—"}</TableCell>
                <TableCell className="tabular text-muted-foreground">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Nunca"}</TableCell>
                <TableCell>{u.isActive ? <Badge tone="sage">Ativo</Badge> : <Badge tone="muted">Inativo</Badge>}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon-sm" aria-label={`Editar ${u.name}`} onClick={() => setEditing(u)}>
                    <Pencil />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <UserDialog
        open={editing !== undefined}
        onOpenChange={(o) => !o && setEditing(undefined)}
        user={editing}
        professionals={professionals}
      />
    </>
  );
}

function UserDialog({
  open,
  onOpenChange,
  user,
  professionals,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user?: TeamUser | null;
  professionals: { id: string; name: string }[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <UserForm user={user} professionals={professionals} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function UserForm({
  user,
  professionals,
  onClose,
}: {
  user?: TeamUser | null;
  professionals: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [form, setForm] = useState(() => ({
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: (user?.role ?? "RECEPTION") as Role,
    professionalId: user?.professionalId ?? "",
    password: "",
    isActive: user?.isActive ?? true,
  }));
  const { pending, run, fieldError } = useServerAction();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const professionalId = form.role === "PROFESSIONAL" ? form.professionalId || null : null;
    if (user) {
      run(
        () =>
          updateUserAction({
            userId: user.id,
            name: form.name,
            role: form.role,
            professionalId,
            isActive: form.isActive,
            password: form.password,
          }),
        {
          success: "Usuário atualizado.",
          onSuccess: onClose,
        },
      );
    } else {
      run(() => createUserAction({ name: form.name, email: form.email, role: form.role, professionalId, password: form.password }), {
        success: "Usuário criado.",
        onSuccess: onClose,
      });
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogHeader>
        <DialogTitle>{user ? "Editar usuário" : "Novo usuário"}</DialogTitle>
        <DialogDescription>O cargo define o que a pessoa pode ver e fazer no sistema.</DialogDescription>
      </DialogHeader>
      <DialogBody className="grid gap-4 pb-5 sm:grid-cols-2">
        <FormField id="u-name" label="Nome" required error={fieldError("name")}>
          <Input id="u-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <FormField id="u-email" label="E-mail" required error={fieldError("email")}>
          <Input
            id="u-email"
            type="email"
            value={form.email}
            disabled={!!user}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </FormField>
        <FormField id="u-role" label="Cargo" required error={fieldError("role")}>
          <NativeSelect id="u-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        {form.role === "PROFESSIONAL" && (
          <FormField id="u-prof" label="Cadastro de profissional" required error={fieldError("professionalId")}>
            <NativeSelect id="u-prof" value={form.professionalId} onChange={(e) => setForm({ ...form, professionalId: e.target.value })}>
              <option value="">Selecione</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        )}
        <FormField
          id="u-pass"
          label={user ? "Nova senha (opcional)" : "Senha"}
          required={!user}
          error={fieldError("password")}
          hint="Mínimo de 8 caracteres."
          className="sm:col-span-2"
        >
          <Input
            id="u-pass"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </FormField>
        {user && (
          <label className="flex items-center gap-3 text-sm font-semibold sm:col-span-2">
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /> Usuário ativo
          </label>
        )}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending}>
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}

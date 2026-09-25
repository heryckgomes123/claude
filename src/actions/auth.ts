"use server";

import { redirect } from "next/navigation";
import { homePathFor } from "@/config/permissions";
import { login, logout } from "@/lib/auth/session";
import { loginInput } from "@/schemas/settings";
import type { ActionResult } from "@/types/action";

export async function loginAction(raw: unknown, next?: string): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const result = await login(parsed.data.email, parsed.data.password, parsed.data.remember);
  if (!result.ok) return { ok: false, error: result.error };
  // Apenas caminhos internos do painel (evita open redirect).
  const safeNext = next && /^\/painel(\/[\w\-/]*)?$/.test(next) && result.role !== "PROFESSIONAL" ? next : null;
  return { ok: true, data: { redirectTo: safeNext ?? homePathFor(result.role) } };
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/login");
}

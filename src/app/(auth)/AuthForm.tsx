"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AivaMark } from "@/components/brand";
import { Button, Field, Input } from "@/components/ui";
import { api } from "@/lib/client-api";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/auth/${mode}`, { body: mode === "signup" ? { name, email, password } : { email, password } });
      router.replace(mode === "signup" ? "/onboarding" : "/today");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-5 pt-[var(--safe-top)] pb-[max(24px,var(--safe-bottom))]">
      <div className="pointer-events-none absolute top-1/4 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(139_92_255/0.28),transparent_65%)] blur-2xl" />
      <div className="relative w-full max-w-sm animate-rise">
        <Link href="/" className="mx-auto mb-8 grid h-16 w-16 place-items-center rounded-[20px] border border-white/10 bg-[radial-gradient(120%_120%_at_20%_10%,#241a4d,#0e0b1f_55%,#07070c)]">
          <AivaMark size={42} />
        </Link>
        <h1 className="text-center text-2xl font-semibold">{mode === "signup" ? "Crie seu segundo cérebro" : "Bem-vindo de volta"}</h1>
        <p className="mt-1.5 text-center text-sm text-muted">{mode === "signup" ? "Leva menos de um minuto." : "Entre para continuar de onde parou."}</p>

        <form onSubmit={submit} className="mt-8 grid gap-4">
          {mode === "signup" && (
            <Field label="Como podemos te chamar?">
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" required maxLength={80} placeholder="Seu nome" />
            </Field>
          )}
          <Field label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required inputMode="email" placeholder="voce@email.com" />
          </Field>
          <Field label="Senha" hint={mode === "signup" ? "Mínimo de 8 caracteres" : undefined}>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={mode === "signup" ? 8 : 1}
                className="pr-11"
              />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute top-0 right-0 grid h-11 w-11 place-items-center text-faint hover:text-ink" aria-label={show ? "Ocultar senha" : "Mostrar senha"}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          {error && <p className="rounded-xl bg-red/10 px-3 py-2 text-sm text-red" role="alert">{error}</p>}
          <Button type="submit" variant="primary" size="lg" loading={busy} className="mt-2 w-full">
            {mode === "signup" ? "Criar conta" : "Entrar"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {mode === "signup" ? "Já tem conta? " : "Novo por aqui? "}
          <Link href={mode === "signup" ? "/login" : "/signup"} className="font-medium text-ink underline-offset-4 hover:underline">
            {mode === "signup" ? "Entrar" : "Criar conta"}
          </Link>
        </p>
      </div>
    </main>
  );
}

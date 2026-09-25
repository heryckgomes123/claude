"use client";

import { AlertCircle, Eye, EyeOff, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Informe e-mail e senha.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await loginAction({ email, password, remember }, next);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.replace(result.data.redirectTo);
        router.refresh();
      } catch {
        setError("Falha de conexão. Tente novamente.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-[#f0d3ce] bg-[#fdf6f4] px-3.5 py-3 text-sm text-[#8f352d] animate-fade-in"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          placeholder="voce@rbeauty.com.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12"
          autoFocus
          aria-invalid={!!error || undefined}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 pr-11"
            aria-invalid={!!error || undefined}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-muted"
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-secondary-foreground select-none">
        <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
        Lembrar acesso neste dispositivo
      </label>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {!pending && <LogIn />} {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}

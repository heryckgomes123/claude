import { redirect } from "next/navigation";
import { BrandLockup, BrandMark } from "@/components/layout/brand";
import { homePathFor } from "@/config/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.role));
  const { next } = await searchParams;

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-charcoal lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_20%_10%,rgb(180_88_63/0.35),transparent_60%),radial-gradient(70%_60%_at_90%_90%,rgb(156_114_72/0.3),transparent_60%)]"
          aria-hidden
        />
        <div className="pointer-events-none absolute -right-24 bottom-24 size-[28rem] rounded-full border border-white/5" aria-hidden />
        <div
          className="pointer-events-none absolute -right-8 bottom-40 size-[18rem] rounded-full border border-terracotta-300/10"
          aria-hidden
        />
        <div className="relative">
          <BrandLockup />
        </div>
        <div className="relative max-w-md">
          <p className="text-[0.7rem] font-bold tracking-[0.25em] text-terracotta-300 uppercase">Command Center</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] font-semibold text-cream">
            A operação da R Beauty, <em className="text-terracotta-300">em harmonia.</em>
          </h1>
          <p className="mt-5 text-[0.95rem] leading-relaxed text-stone-400">
            Agenda, atendimento, caixa e comissões em um só lugar — pensado para cabelo, unhas, cílios e sobrancelhas.
          </p>
        </div>
        <div className="relative flex gap-6 text-xs font-semibold tracking-wider text-stone-500 uppercase">
          <span>Cabelo</span>
          <span className="text-terracotta-400/60">•</span>
          <span>Unhas</span>
          <span className="text-terracotta-400/60">•</span>
          <span>Cílios</span>
          <span className="text-terracotta-400/60">•</span>
          <span>Sobrancelhas</span>
        </div>
      </section>

      <section className="surface-grain flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-10 flex flex-col items-center text-center lg:hidden">
            <BrandMark className="size-14 text-3xl" />
            <p className="mt-3 font-display text-3xl font-semibold">R Beauty</p>
            <p className="text-[0.65rem] font-bold tracking-[0.22em] text-bronze-500 uppercase">OS · Command Center</p>
          </div>
          <h2 className="font-display text-4xl font-semibold tracking-tight">Bem-vinda de volta</h2>
          <p className="mt-2 text-sm text-muted-foreground">Entre com seu e-mail e senha para acessar o painel.</p>
          <LoginForm next={next} />
          <p className="mt-10 text-center text-xs text-muted-foreground">Acesso exclusivo da equipe R Beauty.</p>
        </div>
      </section>
    </main>
  );
}

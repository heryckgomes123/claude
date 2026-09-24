import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/server/auth";
import { AivaMark } from "@/components/brand";

export default async function Home() {
  const auth = await getAuth();
  if (auth) redirect(auth.workspace.settings.calibratedAt ? "/today" : "/onboarding");
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 pt-[var(--safe-top)] pb-[max(24px,var(--safe-bottom))] text-center">
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(139_92_255/0.35),transparent_65%)] blur-2xl" />
      <div className="relative animate-pop">
        <div className="mx-auto grid h-28 w-28 place-items-center rounded-[32px] border border-white/10 bg-[radial-gradient(120%_120%_at_20%_10%,#241a4d,#0e0b1f_55%,#07070c)] shadow-[0_20px_80px_-20px_rgb(139_92_255/0.8)]">
          <AivaMark size={78} />
        </div>
        <h1 className="mt-8 text-5xl font-semibold tracking-[0.3em]">AIVA</h1>
        <p className="mt-3 text-lg text-muted">Seu segundo cérebro.</p>
        <p className="mx-auto mt-6 max-w-sm text-[15px] leading-relaxed text-faint">
          Sua vida. Seu trabalho. Seu conteúdo. <br className="hidden sm:block" />
          Um único sistema inteligente — com IA e voz.
        </p>
      </div>
      <div className="relative mt-10 grid w-full max-w-xs animate-rise gap-3 [animation-delay:150ms]">
        <Link href="/signup" className="pressable grad flex h-13 items-center justify-center rounded-2xl font-medium text-white shadow-[0_10px_40px_-10px_rgb(139_92_255/0.9)]">
          Começar agora
        </Link>
        <Link href="/login" className="pressable flex h-13 items-center justify-center rounded-2xl border border-line bg-surface font-medium text-ink">
          Já tenho conta
        </Link>
      </div>
    </main>
  );
}

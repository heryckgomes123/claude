import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 text-center">
      <div>
        <p className="font-display text-7xl font-semibold text-terracotta-400">404</p>
        <p className="mt-2 text-lg font-semibold">Página não encontrada</p>
        <Link href="/painel" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">
          Voltar ao Command Center
        </Link>
      </div>
    </main>
  );
}

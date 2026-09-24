import { AivaMark } from "@/components/brand";

export const metadata = { title: "Offline" };

export default function Offline() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <AivaMark size={56} />
      <h1 className="text-xl font-semibold">Você está offline</h1>
      <p className="max-w-xs text-sm text-muted">
        A AIVA precisa de conexão para sincronizar. Assim que a internet voltar, tudo continua de onde parou.
      </p>
    </main>
  );
}

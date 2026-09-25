import { redirect } from "next/navigation";

/** A raiz ficará reservada para a futura experiência pública da cliente (Fase 2). */
export default function RootPage() {
  redirect("/painel");
}

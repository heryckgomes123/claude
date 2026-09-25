import { SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function PanelNotFound() {
  return (
    <div className="py-10">
      <EmptyState
        icon={SearchX}
        title="Registro não encontrado"
        description="O item que você procura não existe ou foi removido."
        action={
          <Button asChild variant="outline">
            <Link href="/painel">Voltar ao início</Link>
          </Button>
        }
      />
    </div>
  );
}

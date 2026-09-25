import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { homePathFor } from "@/config/permissions";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Acesso negado" };

export default async function AccessDeniedPage() {
  const user = await requireUser();
  return (
    <div className="py-10">
      <EmptyState
        icon={ShieldAlert}
        title="Acesso restrito"
        description="Seu perfil não tem permissão para acessar esta área. Se precisar, fale com a proprietária."
        action={
          <Button asChild>
            <Link href={homePathFor(user.role)}>Ir para minha área</Link>
          </Button>
        }
      />
    </div>
  );
}

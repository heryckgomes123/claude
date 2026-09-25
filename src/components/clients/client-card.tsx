import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/dates";
import { formatPhone } from "@/utils/phone";

export type ClientListItem = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  isActive: boolean;
  lastVisitAt: Date | null;
  visits: number;
};

/** Cartão de cliente (listas no mobile). */
export function ClientCard({ client }: { client: ClientListItem }) {
  return (
    <Link
      href={`/painel/clientes/${client.id}`}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lifted"
    >
      <Avatar name={client.name} color="#b58a58" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {client.name} {!client.isActive && <Badge tone="muted">Inativa</Badge>}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formatPhone(client.whatsapp ?? client.phone) || "Sem telefone"} · {client.visits} visita(s)
          {client.lastVisitAt && ` · última ${formatDate(client.lastVisitAt)}`}
        </p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
    </Link>
  );
}

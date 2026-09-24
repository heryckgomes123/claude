import { redirect } from "next/navigation";
import { getAuth } from "@/lib/server/auth";
import { snapshot } from "@/lib/server/repo";
import { claudeEnabled } from "@/lib/server/ai/claude";
import { AppShell } from "@/components/shell/AppShell";
import type { Me, Snapshot } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  if (!auth.workspace.settings.calibratedAt) redirect("/onboarding");
  const data = JSON.parse(JSON.stringify(await snapshot(auth.workspace.id))) as Snapshot;
  const me: Me = {
    user: auth.user,
    workspace: { id: auth.workspace.id, name: auth.workspace.name, settings: auth.workspace.settings },
    ai: { provider: claudeEnabled() ? "claude" : "local" },
  };
  return (
    <AppShell me={me} data={data}>
      {children}
    </AppShell>
  );
}

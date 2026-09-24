import { redirect } from "next/navigation";
import { getAuth } from "@/lib/server/auth";
import { Calibration } from "./Calibration";

export const metadata = { title: "Calibração" };

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ recalibrate?: string }> }) {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  const { recalibrate } = await searchParams;
  if (auth.workspace.settings.calibratedAt && !recalibrate) redirect("/today");
  return <Calibration initialName={auth.workspace.settings.displayName ?? auth.user.name.split(" ")[0]} />;
}

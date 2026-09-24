import { redirect } from "next/navigation";
import { getAuth } from "@/lib/server/auth";
import { AuthForm } from "../AuthForm";

export const metadata = { title: "Criar conta" };

export default async function Signup() {
  if (await getAuth()) redirect("/today");
  return <AuthForm mode="signup" />;
}

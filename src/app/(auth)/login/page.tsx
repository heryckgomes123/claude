import { redirect } from "next/navigation";
import { getAuth } from "@/lib/server/auth";
import { AuthForm } from "../AuthForm";

export const metadata = { title: "Entrar" };

export default async function Login() {
  if (await getAuth()) redirect("/today");
  return <AuthForm mode="login" />;
}

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/config/app";

/**
 * Checagem otimista: sem cookie de sessão, redireciona ao login.
 * A validação real (sessão no banco + RBAC) acontece no servidor em cada página e action.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.get(SESSION_COOKIE)?.value;
  if (!hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/painel/:path*"],
};

import { NextResponse, type NextRequest } from "next/server";

/**
 * Guarda de borda: barra o acesso a /coach sem cookie de sessão.
 * A validação real da assinatura acontece no servidor (requireCoach),
 * porque o segredo HMAC não deve trafegar para o runtime de edge.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("ff_session");
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/coach/:path*"],
};

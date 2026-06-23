import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/server/auth";

/**
 * Protege as áreas autenticadas:
 *  - /coach/*      e /api/coach/*      → apenas coach
 *  - /aluno/*      e demais APIs de dados → coach ou aluno autenticado
 *  - aluno só acessa a própria área (/aluno/<seu-id>)
 * Páginas → redireciona para /login.  APIs → responde 401/403 em JSON.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api");

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    if (isApi) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const coachArea =
    pathname.startsWith("/coach") || pathname.startsWith("/api/coach");
  if (coachArea && session.role !== "coach") {
    if (isApi) {
      return NextResponse.json(
        { error: "Acesso restrito ao coach" },
        { status: 403 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = `/aluno/${session.sub}`;
    return NextResponse.redirect(url);
  }

  // Aluno só enxerga a própria área.
  if (session.role === "student") {
    if (pathname === "/aluno") {
      const url = req.nextUrl.clone();
      url.pathname = `/aluno/${session.sub}`;
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/aluno/")) {
      const id = pathname.split("/")[2];
      if (id && id !== session.sub) {
        const url = req.nextUrl.clone();
        url.pathname = `/aluno/${session.sub}`;
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/coach/:path*",
    "/aluno/:path*",
    "/api/coach/:path*",
    "/api/students/:path*",
    "/api/workouts/:path*",
    "/api/logs/:path*",
    "/api/feedbacks/:path*",
  ],
};

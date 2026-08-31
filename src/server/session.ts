import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, readSessionToken, type SessionData } from "./auth";

export async function currentCoach(): Promise<SessionData | null> {
  const jar = await cookies();
  return readSessionToken(jar.get(SESSION_COOKIE)?.value);
}

/** Usar em páginas do coach: redireciona para /login se não autenticado. */
export async function requireCoach(): Promise<SessionData> {
  const coach = await currentCoach();
  if (!coach) redirect("/login");
  return coach;
}

/** Usar em route handlers: devolve null e o handler responde 401. */
export async function coachFromRequest(): Promise<SessionData | null> {
  return currentCoach();
}

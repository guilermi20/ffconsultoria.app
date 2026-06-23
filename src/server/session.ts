import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type Session } from "./auth";

/** Lê a sessão do cookie (uso em Route Handlers — runtime Node). */
export async function getServerSession(): Promise<Session | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}

/** Retorna a sessão somente se for coach; senão null. */
export async function requireCoach(): Promise<Session | null> {
  const s = await getServerSession();
  return s && s.role === "coach" ? s : null;
}

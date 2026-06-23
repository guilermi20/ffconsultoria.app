import { SignJWT, jwtVerify } from "jose";

// Segredo do JWT. Em produção, defina AUTH_SECRET nas variáveis da Vercel.
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "teamff-demo-secret-troque-em-producao"
);

export const SESSION_COOKIE = "teamff_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export type Role = "coach" | "student";

export interface Session {
  sub: string; // user id
  role: Role;
  name: string;
}

/** Assina um JWT de sessão (HS256). Edge-compatible (usado no middleware). */
export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ role: s.role, name: s.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret);
}

/** Verifica o token e devolve a sessão (ou null se inválido/expirado). */
export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      role: payload.role as Role,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

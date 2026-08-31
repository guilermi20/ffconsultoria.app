import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/* --------------------------------------------------------------------------
 * Senha do coach — scrypt (node:crypto), sem dependência nativa.
 * Formato armazenado: scrypt$<salt-hex>$<hash-hex>
 * ------------------------------------------------------------------------ */

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(plain, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/* --------------------------------------------------------------------------
 * Sessão do coach — cookie assinado (HMAC), sem estado no servidor.
 * ------------------------------------------------------------------------ */

export const SESSION_COOKIE = "ff_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error("AUTH_SECRET ausente ou muito curta (mínimo 16 caracteres).");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export type SessionData = { id: string; name: string; email: string };

export function createSessionToken(data: SessionData): string {
  const body = Buffer.from(
    JSON.stringify({ ...data, exp: Date.now() + MAX_AGE_SECONDS * 1000 })
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token: string | undefined): SessionData | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;

  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return { id: parsed.id, name: parsed.name, email: parsed.email };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

/** Token público e pessoal do aluno (usado no link fixo de check-in). */
export function newStudentToken(): string {
  return randomBytes(9).toString("base64url");
}

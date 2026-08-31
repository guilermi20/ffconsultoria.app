import { NextResponse } from "next/server";
import { one } from "@/server/db";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from "@/server/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;

  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });
  }

  const coach = await one<{
    id: string;
    name: string;
    email: string;
    password_hash: string;
  }>(`SELECT id, name, email, password_hash FROM coaches WHERE lower(email) = $1`, [
    email,
  ]);

  if (!coach || !verifyPassword(password, coach.password_hash)) {
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    SESSION_COOKIE,
    createSessionToken({ id: coach.id, name: coach.name, email: coach.email }),
    sessionCookieOptions
  );
  return response;
}

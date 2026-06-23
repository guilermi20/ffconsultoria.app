import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryOne } from "@/server/db";
import {
  signSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  type Role,
} from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let email = "";
  let password = "";
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: "Informe e-mail e senha." },
      { status: 400 }
    );
  }

  try {
    const user = await queryOne<{
      id: string;
      name: string;
      role: Role;
      password_hash: string;
    }>(
      `SELECT id, name, role, password_hash FROM users WHERE LOWER(email)=$1`,
      [email]
    );

    // Mensagem genérica para não revelar se o e-mail existe.
    const invalid = NextResponse.json(
      { error: "E-mail ou senha incorretos." },
      { status: 401 }
    );
    if (!user) return invalid;

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return invalid;

    const token = await signSession({
      sub: user.id,
      role: user.role,
      name: user.name,
    });

    const res = NextResponse.json({
      id: user.id,
      name: user.name,
      role: user.role,
    });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro no login." },
      { status: 500 }
    );
  }
}

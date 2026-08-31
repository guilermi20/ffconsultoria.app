import { NextResponse } from "next/server";
import { one, query } from "@/server/db";
import { newStudentToken } from "@/server/auth";
import { coachFromRequest } from "@/server/session";
import { normalizePhone } from "@/server/whatsapp";

export const runtime = "nodejs";

export async function GET() {
  if (!(await coachFromRequest())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const students = await query(
    `SELECT id, name, email, phone, token, status, started_at::text AS started_at
       FROM students ORDER BY (status = 'ativo') DESC, name`
  );
  return NextResponse.json({ students });
}

export async function POST(request: Request) {
  if (!(await coachFromRequest())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    string | undefined
  > | null;

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  const student = await one(
    `INSERT INTO students (name, email, phone, token, status, started_at, goal, notes)
     VALUES ($1, $2, $3, $4, COALESCE($5, 'ativo'), COALESCE($6::date, CURRENT_DATE), $7, $8)
     RETURNING id, name, token`,
    [
      name,
      body?.email?.trim() || null,
      normalizePhone(body?.phone) ?? body?.phone?.trim() ?? null,
      newStudentToken(),
      body?.status || null,
      body?.started_at || null,
      body?.goal?.trim() || null,
      body?.notes?.trim() || null,
    ]
  );

  return NextResponse.json({ student }, { status: 201 });
}

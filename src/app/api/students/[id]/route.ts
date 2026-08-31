import { NextResponse } from "next/server";
import { one, query } from "@/server/db";
import { newStudentToken } from "@/server/auth";
import { coachFromRequest } from "@/server/session";
import { normalizePhone } from "@/server/whatsapp";

export const runtime = "nodejs";

const EDITABLE = [
  "name",
  "email",
  "phone",
  "status",
  "started_at",
  "birth_date",
  "goal",
  "notes",
] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await coachFromRequest())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  // Regenerar o link pessoal do aluno (invalida o antigo).
  if (body.regenerate_token) {
    const updated = await one(
      `UPDATE students SET token = $2, updated_at = now() WHERE id = $1
       RETURNING id, token`,
      [id, newStudentToken()]
    );
    return NextResponse.json({ student: updated });
  }

  const sets: string[] = [];
  const values: unknown[] = [id];

  for (const field of EDITABLE) {
    if (!(field in body)) continue;
    let value = body[field];
    if (typeof value === "string") value = value.trim() || null;
    if (field === "phone" && value) value = normalizePhone(String(value)) ?? value;
    values.push(value);
    const cast = field === "started_at" || field === "birth_date" ? "::date" : "";
    sets.push(`${field} = $${values.length}${cast}`);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  const updated = await one(
    `UPDATE students SET ${sets.join(", ")}, updated_at = now()
      WHERE id = $1 RETURNING id, name, status`,
    values
  );
  if (!updated) {
    return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
  }
  return NextResponse.json({ student: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await coachFromRequest())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await params;
  await query(`DELETE FROM students WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}

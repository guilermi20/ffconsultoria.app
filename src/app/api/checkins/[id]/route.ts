import { NextResponse } from "next/server";
import { one } from "@/server/db";
import { coachFromRequest } from "@/server/session";

export const runtime = "nodejs";

/** Anotação do coach sobre um check-in — o retorno que ele dá para o aluno. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await coachFromRequest())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    coach_note?: string;
  } | null;

  const note = body?.coach_note?.trim() || null;
  const updated = await one(
    `UPDATE checkins SET coach_note = $2, reviewed_at = now() WHERE id = $1
     RETURNING id, coach_note`,
    [id, note]
  );

  if (!updated) {
    return NextResponse.json({ error: "Check-in não encontrado." }, { status: 404 });
  }
  return NextResponse.json({ checkin: updated });
}

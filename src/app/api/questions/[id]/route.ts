import { NextResponse } from "next/server";
import { one, query } from "@/server/db";
import { coachFromRequest } from "@/server/session";
import { NUMERIC_TYPES, type QuestionType } from "@/server/types";

export const runtime = "nodejs";

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

  // Reordenação: sobe ou desce uma posição trocando com a pergunta vizinha.
  if (body.move === "up" || body.move === "down") {
    const rows = await query<{ id: string; position: number }>(
      `SELECT id, position FROM checkin_questions ORDER BY position, label`
    );
    const index = rows.findIndex((r) => r.id === id);
    const target = body.move === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= rows.length) {
      return NextResponse.json({ ok: true });
    }
    await query(
      `UPDATE checkin_questions AS q SET position = v.pos
         FROM (VALUES ($1::uuid, $2::int), ($3::uuid, $4::int)) AS v(id, pos)
        WHERE q.id = v.id`,
      [rows[index].id, target, rows[target].id, index]
    );
    return NextResponse.json({ ok: true });
  }

  const sets: string[] = [];
  const values: unknown[] = [id];
  const push = (sql: string, value: unknown) => {
    values.push(value);
    sets.push(sql.replace("$n", `$${values.length}`));
  };

  if (typeof body.label === "string" && body.label.trim()) {
    push("label = $n", body.label.trim());
  }
  if ("help" in body) push("help = $n", String(body.help ?? "").trim() || null);
  if ("unit" in body) push("unit = $n", String(body.unit ?? "").trim() || null);
  if ("required" in body) push("required = $n", Boolean(body.required));
  if ("active" in body) push("active = $n", Boolean(body.active));
  if (Array.isArray(body.options)) {
    push("options = $n::jsonb", JSON.stringify(body.options.map(String)));
  }

  if ("track" in body) {
    const current = await one<{ type: QuestionType }>(
      `SELECT type FROM checkin_questions WHERE id = $1`,
      [id]
    );
    const allowed = current ? NUMERIC_TYPES.includes(current.type) : false;
    push("track = $n", Boolean(body.track) && allowed);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  const updated = await one(
    `UPDATE checkin_questions SET ${sets.join(", ")} WHERE id = $1
     RETURNING id, label, active, track`,
    values
  );
  return NextResponse.json({ question: updated });
}

/**
 * Perguntas com respostas não são apagadas — são desativadas, para não
 * destruir o histórico que alimenta os gráficos.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await coachFromRequest())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await params;

  const used = await one<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM checkin_answers WHERE question_id = $1`,
    [id]
  );

  if ((used?.total ?? 0) > 0) {
    await query(`UPDATE checkin_questions SET active = false WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true, archived: true });
  }

  await query(`DELETE FROM checkin_questions WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true, archived: false });
}

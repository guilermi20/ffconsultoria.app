import { NextResponse } from "next/server";
import { pool } from "@/server/db";
import { weekStart } from "@/server/dates";
import { getStudentByToken, listQuestions } from "@/server/queries";
import { NUMERIC_TYPES } from "@/server/types";

export const runtime = "nodejs";

/**
 * Envio do check-in pelo aluno. Rota pública, autenticada pelo token pessoal
 * que vem no link — o mesmo link toda semana.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const student = await getStudentByToken(token);
  if (!student) {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }
  if (student.status === "inativo") {
    return NextResponse.json(
      { error: "Este acesso está desativado. Fale com o Fábio." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    answers?: Record<string, string | number | boolean | null>;
  } | null;
  const answers = body?.answers ?? {};

  const questions = await listQuestions();
  const missing = questions.filter((q) => {
    if (!q.required) return false;
    const value = answers[q.id];
    return value === undefined || value === null || value === "";
  });
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Responda: ${missing.map((q) => q.label).join(", ")}` },
      { status: 400 }
    );
  }

  const week = weekStart();
  const client = await pool().connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO checkins (student_id, week_start, status, source, submitted_at)
       VALUES ($1, $2, 'respondido', 'app', now())
       ON CONFLICT (student_id, week_start)
       DO UPDATE SET status = 'respondido', source = 'app', submitted_at = now()
       RETURNING id`,
      [student.id, week]
    );
    const checkinId = rows[0].id;

    // Reenvio na mesma semana substitui a resposta anterior.
    await client.query(`DELETE FROM checkin_answers WHERE checkin_id = $1`, [
      checkinId,
    ]);

    for (const question of questions) {
      const raw = answers[question.id];
      if (raw === undefined || raw === null || raw === "") continue;

      let num: number | null = null;
      let txt: string | null = null;

      if (NUMERIC_TYPES.includes(question.type)) {
        if (question.type === "sim_nao") {
          const yes = raw === true || raw === 1 || raw === "1" || raw === "sim";
          num = yes ? 1 : 0;
          txt = yes ? "Sim" : "Não";
        } else {
          const parsed = Number(String(raw).replace(",", "."));
          if (Number.isFinite(parsed)) num = parsed;
          else txt = String(raw);
        }
      } else {
        txt = String(raw);
      }

      await client.query(
        `INSERT INTO checkin_answers (checkin_id, question_id, num, txt)
         VALUES ($1, $2, $3, $4)`,
        [checkinId, question.id, num, txt]
      );
    }

    // O disparo da semana já cumpriu o papel dele.
    await client.query(
      `UPDATE whatsapp_queue SET status = 'enviado', sent_at = COALESCE(sent_at, now())
        WHERE student_id = $1 AND week_start = $2 AND status = 'pendente'`,
      [student.id, week]
    );

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, week });
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { error: (error as Error).message || "Falha ao salvar." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

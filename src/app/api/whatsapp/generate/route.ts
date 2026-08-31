import { NextResponse } from "next/server";
import { pool } from "@/server/db";
import { weekStart } from "@/server/dates";
import { coachFromRequest } from "@/server/session";
import { listStudents } from "@/server/queries";
import {
  DEFAULT_TEMPLATE,
  checkinLink,
  panelLink,
  renderTemplate,
} from "@/server/whatsapp";

export const runtime = "nodejs";

/**
 * Monta (ou refaz) a fila de disparo da semana: uma mensagem por aluno ativo,
 * com o link pessoal já embutido. Não envia nada — o envio é passo separado.
 */
export async function POST(request: Request) {
  if (!(await coachFromRequest())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    week?: string;
    template?: string;
  } | null;

  const week = body?.week ?? weekStart();
  const template = body?.template?.trim() || DEFAULT_TEMPLATE;
  const students = await listStudents("ativo");
  const client = await pool().connect();

  let created = 0;
  try {
    await client.query("BEGIN");

    for (const student of students) {
      const message = renderTemplate(template, {
        nome: student.name,
        link: checkinLink(student.token),
        painel: panelLink(student.token),
      });

      // Garante que a semana exista como pendente no painel do coach.
      await client.query(
        `INSERT INTO checkins (student_id, week_start, status)
         VALUES ($1, $2, 'pendente')
         ON CONFLICT (student_id, week_start) DO NOTHING`,
        [student.id, week]
      );

      // Fila: mensagens já enviadas não são sobrescritas.
      const result = await client.query(
        `INSERT INTO whatsapp_queue (student_id, week_start, phone, message, status)
         VALUES ($1, $2, $3, $4, 'pendente')
         ON CONFLICT (student_id, week_start) DO UPDATE
           SET message = EXCLUDED.message, phone = EXCLUDED.phone
         WHERE whatsapp_queue.status = 'pendente'`,
        [student.id, week, student.phone, message]
      );
      created += result.rowCount ?? 0;
    }

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, week, total: students.length, created });
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
}

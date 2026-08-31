import { NextResponse } from "next/server";
import { pool } from "@/server/db";
import { newStudentToken } from "@/server/auth";
import { coachFromRequest } from "@/server/session";
import { listQuestions } from "@/server/queries";
import { weekStart } from "@/server/dates";
import { NUMERIC_TYPES, type QuestionType } from "@/server/types";
import {
  normalizeKey,
  parseCSV,
  parseFlexibleDate,
  parseNumber,
} from "@/server/csv";

export const runtime = "nodejs";

type Mapping = {
  studentColumn: string;
  dateColumn: string | null;
  /** cabeçalho da planilha -> id da pergunta, "novo" (criar) ou "" (ignorar) */
  columns: Record<string, string>;
  /** tipo escolhido para as colunas marcadas como "novo" */
  newTypes?: Record<string, QuestionType>;
  createStudents?: boolean;
};

function slugify(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

export async function POST(request: Request) {
  if (!(await coachFromRequest())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    csv?: string;
    analyze?: boolean;
    mapping?: Mapping;
  } | null;

  if (!body?.csv?.trim()) {
    return NextResponse.json({ error: "Envie o conteúdo do CSV." }, { status: 400 });
  }

  const sheet = parseCSV(body.csv);
  if (sheet.headers.length === 0) {
    return NextResponse.json({ error: "CSV sem cabeçalho." }, { status: 400 });
  }

  /* ---------------------------------------------------- Etapa 1: analisar */
  if (body.analyze || !body.mapping) {
    const questions = await listQuestions(false);
    const suggestions: Record<string, string> = {};

    for (const header of sheet.headers) {
      const key = normalizeKey(header);
      const match = questions.find(
        (q) => normalizeKey(q.label) === key || q.key === slugify(header)
      );
      if (match) suggestions[header] = match.id;
    }

    const guessDate = sheet.headers.find((h) =>
      /carimbo|timestamp|data|hora/i.test(h)
    );
    const guessStudent = sheet.headers.find((h) =>
      /nome|aluno|e-?mail|nome completo/i.test(h)
    );

    return NextResponse.json({
      headers: sheet.headers,
      sample: sheet.rows.slice(0, 5),
      totalRows: sheet.rows.length,
      questions,
      suggestions,
      guessDate: guessDate ?? null,
      guessStudent: guessStudent ?? null,
    });
  }

  /* ---------------------------------------------------- Etapa 2: importar */
  const mapping = body.mapping;
  const studentIndex = sheet.headers.indexOf(mapping.studentColumn);
  if (studentIndex < 0) {
    return NextResponse.json(
      { error: "Coluna que identifica o aluno não encontrada." },
      { status: 400 }
    );
  }
  const dateIndex = mapping.dateColumn
    ? sheet.headers.indexOf(mapping.dateColumn)
    : -1;

  const client = await pool().connect();
  const report = {
    checkins: 0,
    answers: 0,
    studentsCreated: 0,
    newQuestions: 0,
    skipped: [] as string[],
  };

  try {
    await client.query("BEGIN");

    // Colunas marcadas como "novo" viram perguntas antes da importação.
    const columnToQuestion = new Map<string, string>();
    let position =
      (
        await client.query<{ max: number | null }>(
          `SELECT MAX(position) AS max FROM checkin_questions`
        )
      ).rows[0]?.max ?? 0;

    for (const [header, target] of Object.entries(mapping.columns)) {
      if (!target) continue;
      if (target !== "novo") {
        columnToQuestion.set(header, target);
        continue;
      }
      const type = mapping.newTypes?.[header] ?? "texto";
      const isScale = type === "escala";
      position += 1;
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO checkin_questions
           (key, label, type, min_value, max_value, track, position, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         RETURNING id`,
        [
          `${slugify(header)}_${Date.now().toString(36).slice(-4)}_${position}`,
          header,
          type,
          isScale ? 0 : null,
          isScale ? 10 : null,
          NUMERIC_TYPES.includes(type),
          position,
        ]
      );
      columnToQuestion.set(header, rows[0].id);
      report.newQuestions += 1;
    }

    const questionTypes = new Map<string, QuestionType>(
      (
        await client.query<{ id: string; type: QuestionType }>(
          `SELECT id, type FROM checkin_questions`
        )
      ).rows.map((r) => [r.id, r.type])
    );

    // Índice de alunos por nome e por e-mail. Consultado pelo cliente da
    // transação — usar o pool aqui leria fora dela (e trava com pool de 1).
    const byKey = new Map<string, string>();
    const { rows: students } = await client.query<{
      id: string;
      name: string;
      email: string | null;
    }>(`SELECT id, name, email FROM students`);
    for (const s of students) {
      byKey.set(normalizeKey(s.name), s.id);
      if (s.email) byKey.set(normalizeKey(s.email), s.id);
    }

    for (const row of sheet.rows) {
      const identifier = (row[studentIndex] ?? "").trim();
      if (!identifier) continue;

      let studentId = byKey.get(normalizeKey(identifier));
      if (!studentId) {
        if (!mapping.createStudents) {
          report.skipped.push(identifier);
          continue;
        }
        const isEmail = identifier.includes("@");
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO students (name, email, token, status)
           VALUES ($1, $2, $3, 'ativo') RETURNING id`,
          [
            isEmail ? identifier.split("@")[0] : identifier,
            isEmail ? identifier : null,
            newStudentToken(),
          ]
        );
        studentId = rows[0].id;
        byKey.set(normalizeKey(identifier), studentId);
        report.studentsCreated += 1;
      }

      const date =
        dateIndex >= 0 ? parseFlexibleDate(row[dateIndex] ?? "") : null;
      const week = date ? weekStart(date) : weekStart();

      const { rows: checkinRows } = await client.query<{ id: string }>(
        `INSERT INTO checkins (student_id, week_start, status, source, submitted_at)
         VALUES ($1, $2, 'respondido', 'import', $3)
         ON CONFLICT (student_id, week_start)
         DO UPDATE SET status = 'respondido',
                       submitted_at = COALESCE(checkins.submitted_at, EXCLUDED.submitted_at)
         RETURNING id`,
        [studentId, week, date ?? new Date()]
      );
      const checkinId = checkinRows[0].id;
      report.checkins += 1;

      for (const [header, questionId] of columnToQuestion) {
        const columnIndex = sheet.headers.indexOf(header);
        const value = (row[columnIndex] ?? "").trim();
        if (!value) continue;

        const type = questionTypes.get(questionId) ?? "texto";
        let num: number | null = null;
        let txt: string | null = null;

        if (type === "sim_nao") {
          const yes = /^(sim|s|yes|true|1)$/i.test(value);
          num = yes ? 1 : 0;
          txt = yes ? "Sim" : "Não";
        } else if (NUMERIC_TYPES.includes(type)) {
          num = parseNumber(value);
          if (num === null) txt = value;
        } else {
          txt = value;
        }

        await client.query(
          `INSERT INTO checkin_answers (checkin_id, question_id, num, txt)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (checkin_id, question_id)
           DO UPDATE SET num = EXCLUDED.num, txt = EXCLUDED.txt`,
          [checkinId, questionId, num, txt]
        );
        report.answers += 1;
      }
    }

    await client.query("COMMIT");
    return NextResponse.json({
      ok: true,
      ...report,
      skipped: Array.from(new Set(report.skipped)).slice(0, 30),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
}

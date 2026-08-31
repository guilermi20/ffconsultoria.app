import { query, one } from "./db";
import { weekStart, recentWeeks } from "./dates";
import type { Answer, Checkin, Question, Student, StudentStatus } from "./types";

/* ------------------------------------------------------------------ Alunos */

const STUDENT_COLUMNS = `id, name, email, phone, token, status,
       started_at::text AS started_at, birth_date::text AS birth_date, goal, notes`;

export async function listStudents(status?: StudentStatus): Promise<Student[]> {
  const where = status ? "WHERE status = $1" : "";
  return query<Student>(
    `SELECT ${STUDENT_COLUMNS} FROM students ${where}
      ORDER BY (status = 'ativo') DESC, name`,
    status ? [status] : []
  );
}

export async function getStudent(id: string): Promise<Student | null> {
  return one<Student>(`SELECT ${STUDENT_COLUMNS} FROM students WHERE id = $1`, [id]);
}

export async function getStudentByToken(token: string): Promise<Student | null> {
  return one<Student>(`SELECT ${STUDENT_COLUMNS} FROM students WHERE token = $1`, [
    token,
  ]);
}

/* --------------------------------------------------------------- Perguntas */

export async function listQuestions(onlyActive = true): Promise<Question[]> {
  return query<Question>(
    `SELECT id, key, label, help, type, unit, options,
            min_value::float8 AS min_value, max_value::float8 AS max_value,
            required, track, position, active
       FROM checkin_questions
      ${onlyActive ? "WHERE active" : ""}
      ORDER BY position, label`
  );
}

/* ---------------------------------------------------------------- Check-in */

export type CheckinRow = Checkin & { student_name: string; student_token: string };

const CHECKIN_COLUMNS = `c.id, c.student_id, c.week_start::text AS week_start,
       c.status, c.source, c.submitted_at, c.coach_note,
       s.name AS student_name, s.token AS student_token`;

/** Todas as respostas, com filtros opcionais — alimenta o painel geral. */
export async function listCheckins(
  opts: {
    week?: string;
    studentId?: string;
    status?: "respondido" | "pendente";
    limit?: number;
  } = {}
): Promise<CheckinRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.week) {
    params.push(opts.week);
    conditions.push(`c.week_start = $${params.length}`);
  }
  if (opts.studentId) {
    params.push(opts.studentId);
    conditions.push(`c.student_id = $${params.length}`);
  }
  if (opts.status) {
    params.push(opts.status);
    conditions.push(`c.status = $${params.length}`);
  }
  params.push(opts.limit ?? 300);

  return query<CheckinRow>(
    `SELECT ${CHECKIN_COLUMNS}
       FROM checkins c
       JOIN students s ON s.id = c.student_id
      ${conditions.length ? "WHERE " + conditions.join(" AND ") : ""}
      ORDER BY c.week_start DESC, c.submitted_at DESC NULLS LAST, s.name
      LIMIT $${params.length}`,
    params
  );
}

export async function getCheckin(id: string): Promise<CheckinRow | null> {
  return one<CheckinRow>(
    `SELECT ${CHECKIN_COLUMNS}
       FROM checkins c
       JOIN students s ON s.id = c.student_id
      WHERE c.id = $1`,
    [id]
  );
}

export async function getAnswers(checkinId: string): Promise<Answer[]> {
  return query<Answer>(
    `SELECT question_id, num::float8 AS num, txt
       FROM checkin_answers WHERE checkin_id = $1`,
    [checkinId]
  );
}

/**
 * Situação da semana: um registro por aluno ativo, respondido ou não.
 * É a tela de abertura do coach — quem já respondeu e quem falta.
 */
export type WeekRow = {
  student_id: string;
  student_name: string;
  student_token: string;
  phone: string | null;
  checkin_id: string | null;
  status: "respondido" | "pendente";
  submitted_at: string | null;
  queue_status: string | null;
  sent_at: string | null;
};

export async function weekBoard(week = weekStart()): Promise<WeekRow[]> {
  return query<WeekRow>(
    `SELECT s.id AS student_id, s.name AS student_name, s.token AS student_token,
            s.phone, c.id AS checkin_id,
            COALESCE(c.status, 'pendente') AS status,
            c.submitted_at, q.status AS queue_status, q.sent_at
       FROM students s
       LEFT JOIN checkins c       ON c.student_id = s.id AND c.week_start = $1
       LEFT JOIN whatsapp_queue q ON q.student_id = s.id AND q.week_start = $1
      WHERE s.status = 'ativo'
      ORDER BY (COALESCE(c.status, 'pendente') = 'respondido') DESC,
               c.submitted_at DESC NULLS LAST, s.name`,
    [week]
  );
}

/* ------------------------------------------------------------------ Séries */

export type SeriesPoint = { week: string; value: number };
export type QuestionSeries = { question: Question; points: SeriesPoint[] };

/** Evolução de um aluno: uma série por pergunta marcada como "acompanhar". */
export async function studentSeries(studentId: string): Promise<QuestionSeries[]> {
  const questions = (await listQuestions()).filter((q) => q.track);
  if (questions.length === 0) return [];

  const rows = await query<{ question_id: string; week: string; value: number }>(
    `SELECT a.question_id, c.week_start::text AS week, a.num::float8 AS value
       FROM checkin_answers a
       JOIN checkins c ON c.id = a.checkin_id
      WHERE c.student_id = $1 AND c.status = 'respondido' AND a.num IS NOT NULL
      ORDER BY c.week_start`,
    [studentId]
  );

  return questions.map((question) => ({
    question,
    points: rows
      .filter((r) => r.question_id === question.id)
      .map((r) => ({ week: r.week, value: Number(r.value) })),
  }));
}

/** Média da turma por semana — usada no painel geral do coach. */
export async function teamSeries(weeks = 12): Promise<QuestionSeries[]> {
  const questions = (await listQuestions()).filter((q) => q.track);
  if (questions.length === 0) return [];

  const rows = await query<{ question_id: string; week: string; value: number }>(
    `SELECT a.question_id, c.week_start::text AS week, AVG(a.num)::float8 AS value
       FROM checkin_answers a
       JOIN checkins c ON c.id = a.checkin_id
      WHERE c.status = 'respondido' AND a.num IS NOT NULL AND c.week_start >= $1
      GROUP BY a.question_id, c.week_start
      ORDER BY c.week_start`,
    [recentWeeks(weeks)[0]]
  );

  return questions.map((question) => ({
    question,
    points: rows
      .filter((r) => r.question_id === question.id)
      .map((r) => ({ week: r.week, value: Number(r.value) })),
  }));
}

/** Taxa de resposta por semana (%) — indicador de aderência da consultoria. */
export async function adherenceSeries(weeks = 12): Promise<SeriesPoint[]> {
  const rows = await query<{ week: string; total: number; done: number }>(
    `SELECT c.week_start::text AS week,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE c.status = 'respondido')::int AS done
       FROM checkins c
      WHERE c.week_start >= $1
      GROUP BY c.week_start
      ORDER BY c.week_start`,
    [recentWeeks(weeks)[0]]
  );
  return rows.map((r) => ({
    week: r.week,
    value: r.total ? Math.round((r.done / r.total) * 100) : 0,
  }));
}

/* -------------------------------------------------------------------- KPIs */

export type Overview = {
  activeStudents: number;
  answered: number;
  pending: number;
  rate: number;
  sent: number;
  lastAnswerAt: string | null;
};

export async function overview(week = weekStart()): Promise<Overview> {
  const row = await one<{
    active: number;
    answered: number;
    sent: number;
    last_answer: string | null;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM students WHERE status = 'ativo') AS active,
       (SELECT COUNT(*)::int FROM checkins c
          JOIN students s ON s.id = c.student_id
         WHERE c.week_start = $1 AND c.status = 'respondido'
           AND s.status = 'ativo') AS answered,
       (SELECT COUNT(*)::int FROM whatsapp_queue
         WHERE week_start = $1 AND status = 'enviado') AS sent,
       (SELECT MAX(submitted_at) FROM checkins WHERE week_start = $1) AS last_answer`,
    [week]
  );

  const activeStudents = row?.active ?? 0;
  const answered = row?.answered ?? 0;
  return {
    activeStudents,
    answered,
    pending: Math.max(activeStudents - answered, 0),
    rate: activeStudents ? Math.round((answered / activeStudents) * 100) : 0,
    sent: row?.sent ?? 0,
    lastAnswerAt: row?.last_answer ?? null,
  };
}

/** Resumo por aluno para a listagem: última resposta e sequência de semanas. */
export type StudentSummary = Student & {
  last_checkin: string | null;
  total_checkins: number;
  streak: number;
};

export async function studentSummaries(): Promise<StudentSummary[]> {
  const students = await listStudents();
  const stats = await query<{
    student_id: string;
    last_checkin: string | null;
    total: number;
  }>(
    `SELECT student_id, MAX(week_start)::text AS last_checkin, COUNT(*)::int AS total
       FROM checkins WHERE status = 'respondido'
      GROUP BY student_id`
  );

  const weeks = recentWeeks(8);
  const recent = await query<{ student_id: string; week_start: string }>(
    `SELECT student_id, week_start::text AS week_start
       FROM checkins WHERE status = 'respondido' AND week_start >= $1`,
    [weeks[0]]
  );

  return students.map((s) => {
    const stat = stats.find((x) => x.student_id === s.id);
    const answered = new Set(
      recent.filter((r) => r.student_id === s.id).map((r) => r.week_start)
    );
    // Semanas seguidas respondidas, contadas de trás para frente.
    let streak = 0;
    for (let i = weeks.length - 1; i >= 0; i--) {
      if (answered.has(weeks[i])) streak++;
      else if (i < weeks.length - 1) break;
    }
    return {
      ...s,
      last_checkin: stat?.last_checkin ?? null,
      total_checkins: stat?.total ?? 0,
      streak,
    };
  });
}

/* ------------------------------------------------- Fila de disparo semanal */

export type QueueItem = {
  id: string;
  student_id: string;
  student_name: string;
  phone: string | null;
  message: string;
  status: "pendente" | "enviado" | "falhou" | "cancelado";
  error: string | null;
  sent_at: string | null;
  answered: boolean;
};

export async function listQueue(week: string): Promise<QueueItem[]> {
  return query<QueueItem>(
    `SELECT q.id, q.student_id, s.name AS student_name, q.phone, q.message,
            q.status, q.error, q.sent_at,
            (c.status = 'respondido') AS answered
       FROM whatsapp_queue q
       JOIN students s ON s.id = q.student_id
       LEFT JOIN checkins c ON c.student_id = q.student_id AND c.week_start = q.week_start
      WHERE q.week_start = $1
      ORDER BY (q.status = 'pendente') DESC, s.name`,
    [week]
  );
}

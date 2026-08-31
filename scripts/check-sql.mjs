#!/usr/bin/env node
/**
 * Smoke test do SQL contra um Postgres real (PGlite, em memória).
 * Aplica o schema, insere dados e roda todas as consultas do painel.
 *
 *   node scripts/check-sql.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const db = new PGlite();
let failures = 0;

async function step(name, fn) {
  try {
    const result = await fn();
    console.log(`  ✓ ${name}${result ? ` — ${result}` : ""}`);
  } catch (error) {
    failures++;
    console.log(`  ✗ ${name}\n      ${error.message}`);
  }
}

function weekStart(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
function addWeeks(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d + n * 7).toISOString().slice(0, 10);
}

const WEEK = weekStart();

console.log("\nSchema");
await step("aplica db/schema.sql", async () => {
  await db.exec(readFileSync(resolve(root, "db/schema.sql"), "utf8"));
});
await step("reaplicar é idempotente", async () => {
  await db.exec(readFileSync(resolve(root, "db/schema.sql"), "utf8"));
});

console.log("\nDados");
let studentId, questionId, textQuestionId, checkinId;

await step("insere aluno", async () => {
  const { rows } = await db.query(
    `INSERT INTO students (name, phone, token, started_at)
     VALUES ('Ana Beatriz', '5511990001122', 'tok_ana', CURRENT_DATE - 90)
     RETURNING id`
  );
  studentId = rows[0].id;
});

await step("insere perguntas", async () => {
  const escala = await db.query(
    `INSERT INTO checkin_questions (key, label, type, min_value, max_value, track, position)
     VALUES ('sono', 'Qualidade do sono', 'escala', 0, 10, true, 0) RETURNING id`
  );
  questionId = escala.rows[0].id;
  const texto = await db.query(
    `INSERT INTO checkin_questions (key, label, type, track, position)
     VALUES ('obs', 'Como foi a semana?', 'texto_longo', false, 1) RETURNING id`
  );
  textQuestionId = texto.rows[0].id;
});

await step("check-ins de 6 semanas com respostas", async () => {
  for (let i = 5; i >= 0; i--) {
    const week = addWeeks(WEEK, -i);
    const { rows } = await db.query(
      `INSERT INTO checkins (student_id, week_start, status, source, submitted_at)
       VALUES ($1, $2, 'respondido', 'app', now()) RETURNING id`,
      [studentId, week]
    );
    checkinId = rows[0].id;
    await db.query(
      `INSERT INTO checkin_answers (checkin_id, question_id, num) VALUES ($1, $2, $3)`,
      [checkinId, questionId, 6 + (5 - i) * 0.5]
    );
    await db.query(
      `INSERT INTO checkin_answers (checkin_id, question_id, txt) VALUES ($1, $2, $3)`,
      [checkinId, textQuestionId, "Semana boa."]
    );
  }
  return "6 semanas";
});

await step("UNIQUE (student_id, week_start) faz upsert", async () => {
  const { rows } = await db.query(
    `INSERT INTO checkins (student_id, week_start, status, source, submitted_at)
     VALUES ($1, $2, 'respondido', 'app', now())
     ON CONFLICT (student_id, week_start)
     DO UPDATE SET status = 'respondido', submitted_at = now()
     RETURNING id`,
    [studentId, WEEK]
  );
  if (rows[0].id !== checkinId) throw new Error("upsert criou linha nova");
  return "sem duplicar";
});

console.log("\nConsultas do painel");

await step("weekBoard (painel da semana)", async () => {
  const { rows } = await db.query(
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
    [WEEK]
  );
  if (rows.length !== 1) throw new Error(`esperava 1 linha, veio ${rows.length}`);
  if (rows[0].status !== "respondido") throw new Error("status errado");
  return `${rows.length} aluno`;
});

await step("overview (KPIs)", async () => {
  const { rows } = await db.query(
    `SELECT
       (SELECT COUNT(*)::int FROM students WHERE status = 'ativo') AS active,
       (SELECT COUNT(*)::int FROM checkins c
          JOIN students s ON s.id = c.student_id
         WHERE c.week_start = $1 AND c.status = 'respondido'
           AND s.status = 'ativo') AS answered,
       (SELECT COUNT(*)::int FROM whatsapp_queue
         WHERE week_start = $1 AND status = 'enviado') AS sent,
       (SELECT MAX(submitted_at) FROM checkins WHERE week_start = $1) AS last_answer`,
    [WEEK]
  );
  if (rows[0].active !== 1 || rows[0].answered !== 1) {
    throw new Error(JSON.stringify(rows[0]));
  }
  return `${rows[0].answered}/${rows[0].active}`;
});

await step("studentSeries (gráfico de evolução)", async () => {
  const { rows } = await db.query(
    `SELECT a.question_id, c.week_start::text AS week, a.num::float8 AS value
       FROM checkin_answers a
       JOIN checkins c ON c.id = a.checkin_id
      WHERE c.student_id = $1 AND c.status = 'respondido' AND a.num IS NOT NULL
      ORDER BY c.week_start`,
    [studentId]
  );
  if (rows.length !== 6) throw new Error(`esperava 6 pontos, veio ${rows.length}`);
  if (typeof rows[0].value !== "number") throw new Error("valor não é número");
  if (rows[0].value >= rows[5].value) throw new Error("ordem cronológica errada");
  return `${rows.length} pontos, ${rows[0].value} → ${rows[5].value}`;
});

await step("teamSeries (média da turma)", async () => {
  const { rows } = await db.query(
    `SELECT a.question_id, c.week_start::text AS week, AVG(a.num)::float8 AS value
       FROM checkin_answers a
       JOIN checkins c ON c.id = a.checkin_id
      WHERE c.status = 'respondido' AND a.num IS NOT NULL AND c.week_start >= $1
      GROUP BY a.question_id, c.week_start
      ORDER BY c.week_start`,
    [addWeeks(WEEK, -11)]
  );
  if (rows.length !== 6) throw new Error(`esperava 6, veio ${rows.length}`);
  return `${rows.length} semanas`;
});

await step("adherenceSeries (taxa de resposta)", async () => {
  const { rows } = await db.query(
    `SELECT c.week_start::text AS week,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE c.status = 'respondido')::int AS done
       FROM checkins c
      WHERE c.week_start >= $1
      GROUP BY c.week_start
      ORDER BY c.week_start`,
    [addWeeks(WEEK, -11)]
  );
  if (rows[0].total !== rows[0].done) throw new Error("taxa != 100%");
  return `${rows.length} semanas a 100%`;
});

await step("studentSummaries (lista de alunos)", async () => {
  const { rows } = await db.query(
    `SELECT student_id, MAX(week_start)::text AS last_checkin, COUNT(*)::int AS total
       FROM checkins WHERE status = 'respondido'
      GROUP BY student_id`
  );
  if (rows[0].total !== 6) throw new Error(`total ${rows[0].total}`);
  return `${rows[0].total} check-ins`;
});

await step("listCheckins com filtros", async () => {
  const { rows } = await db.query(
    `SELECT c.id, c.week_start::text AS week_start, c.status, s.name AS student_name
       FROM checkins c JOIN students s ON s.id = c.student_id
      WHERE c.student_id = $1 AND c.status = $2
      ORDER BY c.week_start DESC, c.submitted_at DESC NULLS LAST, s.name
      LIMIT $3`,
    [studentId, "respondido", 300]
  );
  if (rows.length !== 6) throw new Error(`veio ${rows.length}`);
  return `${rows.length} respostas`;
});

console.log("\nFila de WhatsApp");

await step("monta fila (insert + on conflict)", async () => {
  await db.query(
    `INSERT INTO whatsapp_queue (student_id, week_start, phone, message, status)
     VALUES ($1, $2, '5511990001122', 'msg v1', 'pendente')`,
    [studentId, WEEK]
  );
  await db.query(
    `INSERT INTO whatsapp_queue (student_id, week_start, phone, message, status)
     VALUES ($1, $2, '5511990001122', 'msg v2', 'pendente')
     ON CONFLICT (student_id, week_start) DO UPDATE
       SET message = EXCLUDED.message, phone = EXCLUDED.phone
     WHERE whatsapp_queue.status = 'pendente'`,
    [studentId, WEEK]
  );
  const { rows } = await db.query(
    `SELECT message FROM whatsapp_queue WHERE student_id = $1`,
    [studentId]
  );
  if (rows.length !== 1 || rows[0].message !== "msg v2") {
    throw new Error(JSON.stringify(rows));
  }
  return "regerada sem duplicar";
});

await step("fila já enviada não é sobrescrita", async () => {
  await db.query(
    `UPDATE whatsapp_queue SET status = 'enviado', sent_at = now() WHERE student_id = $1`,
    [studentId]
  );
  await db.query(
    `INSERT INTO whatsapp_queue (student_id, week_start, phone, message, status)
     VALUES ($1, $2, '5511990001122', 'msg v3', 'pendente')
     ON CONFLICT (student_id, week_start) DO UPDATE
       SET message = EXCLUDED.message
     WHERE whatsapp_queue.status = 'pendente'`,
    [studentId, WEEK]
  );
  const { rows } = await db.query(
    `SELECT message, status FROM whatsapp_queue WHERE student_id = $1`,
    [studentId]
  );
  if (rows[0].message !== "msg v2" || rows[0].status !== "enviado") {
    throw new Error(JSON.stringify(rows[0]));
  }
  return "preservada";
});

await step("listQueue (tela de disparos)", async () => {
  const { rows } = await db.query(
    `SELECT q.id, q.student_id, s.name AS student_name, q.phone, q.message,
            q.status, q.error, q.sent_at,
            (c.status = 'respondido') AS answered
       FROM whatsapp_queue q
       JOIN students s ON s.id = q.student_id
       LEFT JOIN checkins c ON c.student_id = q.student_id AND c.week_start = q.week_start
      WHERE q.week_start = $1
      ORDER BY (q.status = 'pendente') DESC, s.name`,
    [WEEK]
  );
  if (rows[0].answered !== true) throw new Error("answered deveria ser true");
  return `${rows.length} item`;
});

console.log("\nIntegridade");

await step("check-in duplicado é bloqueado", async () => {
  try {
    await db.query(
      `INSERT INTO checkins (student_id, week_start) VALUES ($1, $2)`,
      [studentId, WEEK]
    );
    throw new Error("deveria ter falhado");
  } catch (error) {
    if (!/duplicate key|unique/i.test(error.message)) throw error;
  }
  return "UNIQUE ok";
});

await step("status inválido é rejeitado", async () => {
  try {
    await db.query(
      `INSERT INTO students (name, token, status) VALUES ('X', 'tok_x', 'sumido')`
    );
    throw new Error("deveria ter falhado");
  } catch (error) {
    if (!/check constraint|violates/i.test(error.message)) throw error;
  }
  return "CHECK ok";
});

await step("apagar aluno remove check-ins e respostas", async () => {
  await db.query(`DELETE FROM students WHERE id = $1`, [studentId]);
  const { rows } = await db.query(
    `SELECT (SELECT COUNT(*)::int FROM checkins) AS c,
            (SELECT COUNT(*)::int FROM checkin_answers) AS a,
            (SELECT COUNT(*)::int FROM whatsapp_queue) AS q`
  );
  if (rows[0].c || rows[0].a || rows[0].q) throw new Error(JSON.stringify(rows[0]));
  return "CASCADE ok";
});

console.log(
  failures === 0
    ? "\n✓ SQL validado contra Postgres real (PGlite).\n"
    : `\n✗ ${failures} verificação(ões) falharam.\n`
);
process.exit(failures === 0 ? 0 : 1);

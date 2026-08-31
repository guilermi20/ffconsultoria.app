#!/usr/bin/env node
/**
 * Prepara o banco do Módulo 1.
 *
 *   node scripts/setup-db.mjs           schema + coach + perguntas padrão
 *   node scripts/setup-db.mjs --demo    ...e uma base de demonstração
 *   node scripts/setup-db.mjs --reset   apaga os dados antes (destrutivo)
 *
 * O schema é não-destrutivo: pode rodar quantas vezes precisar.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const withDemo = args.includes("--demo");
const withReset = args.includes("--reset");

/* ----------------------------------------------------------- .env.local */

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

if (!process.env.DATABASE_URL) {
  console.error(
    "\n  DATABASE_URL não definida.\n  Copie .env.local.example para .env.local e preencha.\n"
  );
  process.exit(1);
}

function hashPassword(plain) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${scryptSync(plain, salt, 64).toString("hex")}`;
}

function token() {
  return randomBytes(9).toString("base64url");
}

/** Segunda-feira da semana, "YYYY-MM-DD". */
function weekStart(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function addWeeks(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + n * 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

/* -------------------------------------------------- Perguntas padrão */

const DEFAULT_QUESTIONS = [
  {
    key: "peso",
    label: "Peso da semana",
    type: "numero",
    unit: "kg",
    track: true,
    required: true,
    help: "Pese-se em jejum, no mesmo dia da semana.",
  },
  {
    key: "adesao_treino",
    label: "Quantos treinos você fez esta semana?",
    type: "numero",
    unit: "treinos",
    track: true,
    required: true,
  },
  {
    key: "dieta",
    label: "Aderência à dieta",
    type: "escala",
    track: true,
    required: true,
    help: "0 = fugiu totalmente · 10 = seguiu à risca",
  },
  {
    key: "sono",
    label: "Qualidade do sono",
    type: "escala",
    track: true,
    required: true,
    help: "0 = péssimo · 10 = excelente",
  },
  {
    key: "energia",
    label: "Nível de energia e disposição",
    type: "escala",
    track: true,
    required: true,
  },
  {
    key: "estresse",
    label: "Nível de estresse",
    type: "escala",
    track: true,
    required: true,
    help: "0 = tranquilo · 10 = muito estressado",
  },
  {
    key: "dores",
    label: "Sentiu alguma dor ou desconforto?",
    type: "sim_nao",
    track: true,
    required: true,
  },
  {
    key: "observacoes",
    label: "Como foi sua semana? Algo que eu precise saber?",
    type: "texto_longo",
    track: false,
    required: false,
    help: "Quanto mais detalhe, melhor eu ajusto seu treino.",
  },
];

const DEMO_STUDENTS = [
  { name: "Ana Beatriz Rocha", phone: "5511990001122", goal: "Recomposição corporal", base: 62 },
  { name: "Carlos Mendes", phone: "5511990002233", goal: "Hipertrofia", base: 84 },
  { name: "Débora Lima", phone: "5511990003344", goal: "Meia maratona", base: 58 },
  { name: "Eduardo Prado", phone: "5511990004455", goal: "Emagrecimento", base: 96 },
  { name: "Fernanda Souza", phone: "5511990005566", goal: "Força e estética", base: 65 },
  { name: "Gustavo Ribeiro", phone: "5511990006677", goal: "Triatlo sprint", base: 78 },
  { name: "Helena Martins", phone: "5511990007788", goal: "Saúde e disposição", base: 70 },
  { name: "Igor Nascimento", phone: "5511990008899", goal: "Ganho de massa", base: 73 },
];

const DEMO_NOTES = [
  "Semana boa, consegui treinar tudo. Só o sábado que foi corrido.",
  "Peguei um resfriado no meio da semana e perdi dois treinos.",
  "Dieta apertou no fim de semana, mas voltei firme na segunda.",
  "Melhor semana até agora, energia lá em cima.",
  "Dormi mal por causa do trabalho, senti no treino de perna.",
  "Consegui aumentar a carga no supino, muito feliz!",
];

/* ------------------------------------------------------------- Execução */

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const needsSsl =
  /sslmode=require/.test(connectionString) ||
  /neon\.tech|supabase\.co|render\.com|railway\.app/.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const client = await pool.connect();

  try {
    console.log("→ Aplicando schema...");
    await client.query(readFileSync(resolve(root, "db/schema.sql"), "utf8"));

    if (withReset) {
      console.log("→ --reset: limpando dados...");
      await client.query(
        `TRUNCATE checkin_answers, checkins, whatsapp_queue,
                  checkin_questions, students RESTART IDENTITY CASCADE`
      );
    }

    /* Coach */
    const email = (process.env.COACH_EMAIL ?? "fabio@ffconsultoria.com").toLowerCase();
    const password = process.env.COACH_PASSWORD ?? "ff2026";
    const name = process.env.COACH_NAME ?? "Fábio Filho";

    await client.query(
      `INSERT INTO coaches (name, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name`,
      [name, email, hashPassword(password)]
    );
    console.log(`→ Coach: ${email} / ${password}`);

    /* Perguntas padrão (só cria as que ainda não existem) */
    let position = 0;
    for (const q of DEFAULT_QUESTIONS) {
      await client.query(
        `INSERT INTO checkin_questions
           (key, label, help, type, unit, min_value, max_value, required, track, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (key) DO NOTHING`,
        [
          q.key,
          q.label,
          q.help ?? null,
          q.type,
          q.unit ?? null,
          q.type === "escala" ? 0 : null,
          q.type === "escala" ? 10 : null,
          Boolean(q.required),
          Boolean(q.track),
          position++,
        ]
      );
    }
    console.log(`→ ${DEFAULT_QUESTIONS.length} perguntas padrão garantidas.`);

    if (!withDemo) {
      console.log("\n✓ Pronto. Rode com --demo para popular dados de apresentação.\n");
      return;
    }

    /* ------------------------------------------------------ Demonstração */

    const { rows: questions } = await client.query(
      `SELECT id, key, type FROM checkin_questions`
    );
    const byKey = Object.fromEntries(questions.map((q) => [q.key, q]));
    const currentWeek = weekStart();
    const WEEKS = 14;

    console.log(`→ Gerando ${DEMO_STUDENTS.length} alunos e ${WEEKS} semanas...`);

    for (const [index, demo] of DEMO_STUDENTS.entries()) {
      // Idempotente por nome: rodar --demo de novo não duplica a turma.
      const existing = await client.query(`SELECT id FROM students WHERE name = $1`, [
        demo.name,
      ]);
      const { rows } = existing.rows.length
        ? existing
        : await client.query(
            `INSERT INTO students (name, phone, email, token, status, started_at, goal)
             VALUES ($1, $2, $3, $4, 'ativo', $5::date, $6)
             RETURNING id`,
            [
              demo.name,
              demo.phone,
              `${demo.name.split(" ")[0].toLowerCase()}@exemplo.com`,
              token(),
              addWeeks(currentWeek, -(WEEKS + 2)),
              demo.goal,
            ]
          );
      const studentId = rows[0].id;

      // Tendência levemente positiva, com ruído — parece dado real, não reta.
      let weight = demo.base;
      const losing = demo.goal.match(/Emagrecimento|Recomposição/) !== null;

      for (let w = 0; w < WEEKS; w++) {
        const week = addWeeks(currentWeek, -(WEEKS - 1 - w));
        const isCurrentWeek = week === currentWeek;

        // Nem todo mundo responde toda semana: ~85% de aderência.
        const answered = Math.random() < 0.85;
        // Na semana corrente, metade da turma ainda não respondeu.
        const respondeu = isCurrentWeek ? index % 2 === 0 : answered;

        const { rows: checkinRows } = await client.query(
          `INSERT INTO checkins (student_id, week_start, status, source, submitted_at)
           VALUES ($1, $2, $3, 'app', $4)
           ON CONFLICT (student_id, week_start) DO NOTHING
           RETURNING id`,
          [
            studentId,
            week,
            respondeu ? "respondido" : "pendente",
            respondeu ? new Date(`${week}T19:30:00`) : null,
          ]
        );
        if (!respondeu || checkinRows.length === 0) continue;

        const checkinId = checkinRows[0].id;
        const progress = w / (WEEKS - 1);
        weight += (losing ? -0.35 : 0.18) + (Math.random() - 0.5) * 0.5;

        const values = {
          peso: Number(weight.toFixed(1)),
          adesao_treino: Math.max(2, Math.min(6, Math.round(3.5 + progress * 1.5 + (Math.random() - 0.5) * 1.6))),
          dieta: Math.max(3, Math.min(10, Math.round(6 + progress * 2.5 + (Math.random() - 0.5) * 2))),
          sono: Math.max(3, Math.min(10, Math.round(6.2 + progress * 1.8 + (Math.random() - 0.5) * 2.4))),
          energia: Math.max(3, Math.min(10, Math.round(6 + progress * 2.6 + (Math.random() - 0.5) * 2))),
          estresse: Math.max(1, Math.min(10, Math.round(6 - progress * 2.2 + (Math.random() - 0.5) * 2.2))),
          dores: Math.random() < 0.25 ? 1 : 0,
        };

        for (const [key, value] of Object.entries(values)) {
          const question = byKey[key];
          if (!question) continue;
          await client.query(
            `INSERT INTO checkin_answers (checkin_id, question_id, num, txt)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (checkin_id, question_id) DO NOTHING`,
            [
              checkinId,
              question.id,
              value,
              question.type === "sim_nao" ? (value ? "Sim" : "Não") : null,
            ]
          );
        }

        if (byKey.observacoes && Math.random() < 0.6) {
          await client.query(
            `INSERT INTO checkin_answers (checkin_id, question_id, txt)
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [
              checkinId,
              byKey.observacoes.id,
              DEMO_NOTES[Math.floor(Math.random() * DEMO_NOTES.length)],
            ]
          );
        }
      }
    }

    const { rows: counts } = await client.query(
      `SELECT (SELECT COUNT(*) FROM students)::int AS alunos,
              (SELECT COUNT(*) FROM checkins WHERE status = 'respondido')::int AS checkins,
              (SELECT COUNT(*) FROM checkin_answers)::int AS respostas`
    );

    console.log(
      `\n✓ Base de demonstração: ${counts[0].alunos} alunos, ` +
        `${counts[0].checkins} check-ins, ${counts[0].respostas} respostas.\n`
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("\n✗ Falhou:", error.message, "\n");
  process.exit(1);
});

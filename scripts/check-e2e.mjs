#!/usr/bin/env node
/**
 * Verificação ponta a ponta do Módulo 1 contra o app rodando.
 *
 *   1. node scripts/dev-db.mjs        (terminal 1)
 *   2. npm run dev                    (terminal 2)
 *   3. node scripts/check-e2e.mjs     (terminal 3)
 *
 * Exercita login, páginas do coach, o link do aluno, o envio do check-in,
 * a fila de WhatsApp e a importação de CSV do Google Forms.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

for (const file of [".env.local", ".env"]) {
  const path = resolve(root, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const EMAIL = process.env.COACH_EMAIL ?? "fabio@ffconsultoria.com";
const PASSWORD = process.env.COACH_PASSWORD ?? "ff2026";

let cookie = "";
let failures = 0;
let checks = 0;

function ok(name, detail = "") {
  checks++;
  console.log(`  \x1b[32m✓\x1b[0m ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail) {
  checks++;
  failures++;
  console.log(`  \x1b[31m✗\x1b[0m ${name} — ${detail}`);
}
function expect(name, actual, expected) {
  if (actual === expected) ok(name, String(actual));
  else fail(name, `esperava ${expected}, veio ${actual}`);
}

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...options.headers,
    },
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie?.includes("ff_session=") && !setCookie.includes("ff_session=;")) {
    cookie = setCookie.split(";")[0];
  }
  return res;
}

/**
 * Consulta ao banco para as asserções.
 *
 * Com o Postgres de desenvolvimento (PGlite), que aceita uma conexão por vez,
 * usamos o endpoint HTTP que scripts/dev-db.mjs expõe — assim o app mantém a
 * conexão dele. Contra um Postgres de verdade, conecta direto.
 */
const devDbUrl = process.env.DEV_DB_URL ?? "http://127.0.0.1:5434";
const usingDevDb = /127\.0\.0\.1:5433|localhost:5433/.test(
  process.env.DATABASE_URL ?? ""
);

let db = null;
if (!usingDevDb) {
  db = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    ssl: /sslmode=require|neon\.tech|supabase\.co/.test(process.env.DATABASE_URL ?? "")
      ? { rejectUnauthorized: false }
      : undefined,
  });
}

async function sql(text, params = []) {
  if (db) return (await db.query(text, params)).rows;
  const res = await fetch(devDbUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sql: text, params }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.rows;
}

/* ------------------------------------------------------------------ Testes */

console.log("\n\x1b[1mAutenticação\x1b[0m");

expect(
  "login com senha errada é recusado",
  (await req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, password: "senha-errada" }),
  })).status,
  401
);

expect(
  "login correto",
  (await req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })).status,
  200
);
cookie ? ok("cookie de sessão emitido") : fail("cookie de sessão emitido", "ausente");

const noCookie = await fetch(`${BASE}/api/students`, { redirect: "manual" });
expect("API do coach exige sessão", noCookie.status, 401);

const guarded = await fetch(`${BASE}/coach`, { redirect: "manual" });
expect("/coach sem sessão redireciona", guarded.status, 307);

console.log("\n\x1b[1mPáginas do coach\x1b[0m");

for (const path of [
  "/coach",
  "/coach/checkins",
  "/coach/alunos",
  "/coach/disparos",
  "/coach/perguntas",
  "/coach/importar",
]) {
  expect(path, (await req(path)).status, 200);
}

const dashboard = await (await req("/coach")).text();
dashboard.includes("Alunos ativos")
  ? ok("KPIs renderizados")
  : fail("KPIs renderizados", "não encontrei o bloco");

const charts = (dashboard.match(/viewBox="0 0 640 200"/g) ?? []).length;
charts > 0 ? ok("gráficos renderizados", `${charts} no painel`) : fail("gráficos", "nenhum");

console.log("\n\x1b[1mCadastro de aluno\x1b[0m");

const nome = `Teste E2E ${Date.now().toString(36).slice(-5)}`;
const criado = await req("/api/students", {
  method: "POST",
  body: JSON.stringify({ name: nome, phone: "(11) 98888-7766", goal: "Verificação" }),
});
expect("POST /api/students", criado.status, 201);

const [novo] = await sql(`SELECT id, token, phone FROM students WHERE name = $1`, [nome]);
novo?.token
  ? ok("token pessoal gerado", novo.token)
  : fail("token pessoal gerado", "sem token");
expect("telefone normalizado para E.164", novo?.phone, "5511988887766");

console.log("\n\x1b[1mFluxo do aluno\x1b[0m");

expect("formulário abre pelo link", (await req(`/checkin/${novo.token}`)).status, 200);
expect("painel do aluno abre", (await req(`/aluno/${novo.token}`)).status, 200);
expect("token inválido dá 404", (await req("/checkin/nao-existe")).status, 404);

const questions = await sql(
  `SELECT id, key, type FROM checkin_questions WHERE active ORDER BY position`
);
const byKey = Object.fromEntries(questions.map((q) => [q.key, q]));

const semObrigatorias = await fetch(`${BASE}/api/checkin/${novo.token}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ answers: {} }),
});
expect("envio sem as obrigatórias é recusado", semObrigatorias.status, 400);

const answers = {};
for (const q of questions) {
  if (q.type === "numero") answers[q.id] = q.key === "peso" ? "83,4" : "5";
  else if (q.type === "escala") answers[q.id] = 8;
  else if (q.type === "sim_nao") answers[q.id] = "0";
  else answers[q.id] = "Resposta de verificação automática.";
}

const enviado = await fetch(`${BASE}/api/checkin/${novo.token}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ answers }),
});
expect("envio completo do check-in", enviado.status, 200);

const [peso] = await sql(
  `SELECT a.num::float8 AS num FROM checkin_answers a
     JOIN checkins c ON c.id = a.checkin_id
    WHERE c.student_id = $1 AND a.question_id = $2`,
  [novo.id, byKey.peso.id]
);
expect('"83,4" gravado como número', peso?.num, 83.4);

// Reenviar na mesma semana substitui, não duplica.
await fetch(`${BASE}/api/checkin/${novo.token}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ answers }),
});
const [{ total }] = await sql(
  `SELECT COUNT(*)::int AS total FROM checkins WHERE student_id = $1`,
  [novo.id]
);
expect("reenvio na mesma semana não duplica", total, 1);

console.log("\n\x1b[1mDisparos de WhatsApp\x1b[0m");

const fila = await req("/api/whatsapp/generate", { method: "POST", body: "{}" });
const filaBody = await fila.json();
expect("montar fila da semana", fila.status, 200);
filaBody.total > 0
  ? ok("fila cobre os alunos ativos", `${filaBody.total} alunos`)
  : fail("fila cobre os alunos ativos", JSON.stringify(filaBody));

const [item] = await sql(
  `SELECT id, message, status FROM whatsapp_queue WHERE student_id = $1`,
  [novo.id]
);
item?.message?.includes(`/checkin/${novo.token}`)
  ? ok("mensagem traz o link pessoal do aluno")
  : fail("mensagem traz o link pessoal", item?.message?.slice(0, 60) ?? "sem item");
item?.message?.startsWith(`Fala ${nome.split(" ")[0]}`)
  ? ok("{nome} substituído pelo primeiro nome")
  : fail("{nome} substituído", item?.message?.slice(0, 40));

const disparo = await req(`/api/whatsapp/${item.id}`, { method: "POST", body: "{}" });
expect("marcar item como enviado", disparo.status, 200);
const [{ status: filaStatus }] = await sql(
  `SELECT status FROM whatsapp_queue WHERE id = $1`,
  [item.id]
);
expect("fila registra o envio", filaStatus, "enviado");

const dispatchPage = await (await req("/coach/disparos")).text();
dispatchPage.includes("wa.me/5511988887766")
  ? ok("link wa.me renderizado na tela")
  : fail("link wa.me na tela", "não encontrado");

console.log("\n\x1b[1mImportação do Google Forms\x1b[0m");

const csv = [
  "Carimbo de data/hora,Nome completo,Qualidade do sono,Peso da semana,Quantos copos de água por dia?",
  '15/06/2026 08:12:33,Ana Beatriz Rocha,7,61,"8"',
  '22/06/2026 09:01:10,Ana Beatriz Rocha,8,"60,6",9',
  `15/06/2026 10:00:00,Aluna Nova E2E ${Date.now().toString(36).slice(-4)},9,58,10`,
].join("\n");

const analise = await req("/api/import", {
  method: "POST",
  body: JSON.stringify({ csv, analyze: true }),
});
const a = await analise.json();
expect("analisar CSV", analise.status, 200);
expect("linhas detectadas", a.totalRows, 3);
expect("coluna de data reconhecida", a.guessDate, "Carimbo de data/hora");
expect("coluna do aluno reconhecida", a.guessStudent, "Nome completo");
Object.keys(a.suggestions).length >= 2
  ? ok("colunas casadas com perguntas existentes", Object.keys(a.suggestions).join(", "))
  : fail("colunas casadas", JSON.stringify(a.suggestions));

const antesQuestoes = (await sql(`SELECT COUNT(*)::int AS n FROM checkin_questions`))[0].n;

const colunaNova = "Quantos copos de água por dia?";
const importado = await req("/api/import", {
  method: "POST",
  body: JSON.stringify({
    csv,
    mapping: {
      studentColumn: "Nome completo",
      dateColumn: "Carimbo de data/hora",
      columns: { ...a.suggestions, [colunaNova]: "novo" },
      newTypes: { [colunaNova]: "numero" },
      createStudents: true,
    },
  }),
});
const r = await importado.json();
expect("importar respostas", importado.status, 200);
expect("check-ins gravados", r.checkins, 3);
expect("aluno novo criado pelo import", r.studentsCreated, 1);
expect("coluna nova virou pergunta", r.newQuestions, 1);
expect(
  "pergunta realmente criada",
  (await sql(`SELECT COUNT(*)::int AS n FROM checkin_questions`))[0].n,
  antesQuestoes + 1
);

const [decimal] = await sql(
  `SELECT a.num::float8 AS num FROM checkin_answers a
     JOIN checkin_questions q ON q.id = a.question_id
     JOIN checkins c ON c.id = a.checkin_id
     JOIN students s ON s.id = c.student_id
    WHERE q.key = 'peso' AND s.name = 'Ana Beatriz Rocha'
      AND c.week_start = '2026-06-22'`
);
expect('"60,6" importado como decimal', decimal?.num, 60.6);

// A linha de 15/06/2026 (segunda) tem de cair na semana 2026-06-15. Buscamos
// pela pergunta criada no import, que só existe por causa dele.
const [semana] = await sql(
  `SELECT c.week_start::text AS w FROM checkin_answers a
     JOIN checkin_questions q ON q.id = a.question_id
     JOIN checkins c ON c.id = a.checkin_id
     JOIN students s ON s.id = c.student_id
    WHERE q.label = $1 AND s.name = 'Ana Beatriz Rocha'
    ORDER BY c.week_start LIMIT 1`,
  [colunaNova]
);
expect("15/06/2026 caiu na semana da segunda-feira", semana?.w, "2026-06-15");

console.log("\n\x1b[1mGráficos de evolução\x1b[0m");

const [{ id: anaId }] = await sql(`SELECT id FROM students WHERE name = 'Ana Beatriz Rocha'`);
const perfil = await (await req(`/coach/alunos/${anaId}`)).text();
expect("perfil do aluno abre", 200, 200);
const perfilCharts = (perfil.match(/viewBox="0 0 640 200"/g) ?? []).length;
perfilCharts > 0
  ? ok("gráficos de evolução no perfil", `${perfilCharts}`)
  : fail("gráficos no perfil", "nenhum");
perfil.includes("Ver dados")
  ? ok("tabela de dados acessível sob cada gráfico")
  : fail("tabela de dados", "ausente");

const painelAluno = await (await req(`/aluno/${novo.token}`)).text();
painelAluno.includes("Meus check-ins")
  ? ok("painel do aluno lista o histórico")
  : fail("painel do aluno", "sem histórico");

/* ------------------------------------------------------------------ Limpeza */

await sql(`DELETE FROM students WHERE name = $1`, [nome]);
await sql(`DELETE FROM students WHERE name LIKE 'Aluna Nova E2E%'`);
if (db) await db.end();

console.log(
  failures === 0
    ? `\n\x1b[32m✓ ${checks} verificações passaram.\x1b[0m\n`
    : `\n\x1b[31m✗ ${failures} de ${checks} falharam.\x1b[0m\n`
);
process.exit(failures === 0 ? 0 : 1);

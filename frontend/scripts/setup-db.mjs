// =====================================================================
// Setup do banco — roda schema.sql + seed.sql contra o DATABASE_URL.
// Uso:
//   1) defina DATABASE_URL (Neon / Vercel Postgres / Supabase / local)
//      via frontend/.env.local  OU  variável de ambiente
//   2) cd frontend && npm run db:setup
// =====================================================================
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

// Carrega .env.local se existir (sem quebrar caso o dotenv falte)
try {
  const dotenv = await import("dotenv");
  dotenv.config({ path: resolve(process.cwd(), ".env.local") });
  dotenv.config(); // .env como fallback
} catch {
  /* dotenv opcional */
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbDir = resolve(__dirname, "../../db"); // repo/db

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error(
    "❌ Defina DATABASE_URL (em frontend/.env.local ou no ambiente).\n" +
      "   Ex.: postgres://user:pass@host/db?sslmode=require"
  );
  process.exit(1);
}

const isLocal = /localhost|127\.0\.0\.1|@db:/.test(connectionString);
const ssl =
  isLocal || /sslmode=disable/.test(connectionString)
    ? undefined
    : { rejectUnauthorized: false };

const schema = readFileSync(resolve(dbDir, "schema.sql"), "utf8");
const seed = readFileSync(resolve(dbDir, "seed.sql"), "utf8");

const client = new pg.Client({ connectionString, ssl });

try {
  await client.connect();
  console.log("→ Conectado. Aplicando schema.sql…");
  await client.query(schema);
  console.log("  ✓ schema aplicado");

  console.log("→ Aplicando seed.sql…");
  await client.query(seed);
  console.log("  ✓ seed aplicado");

  const { rows } = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM users)::int AS users,
      (SELECT COUNT(*) FROM training_plans)::int AS plans,
      (SELECT COUNT(*) FROM workouts)::int AS workouts,
      (SELECT COUNT(*) FROM workout_exercises)::int AS exercises,
      (SELECT COUNT(*) FROM workout_logs)::int AS logs,
      (SELECT COUNT(*) FROM exercise_feedbacks)::int AS feedbacks
  `);
  console.log("\n✅ Banco pronto:", rows[0]);
} catch (err) {
  console.error("❌ Falha:", err.message);
  process.exit(1);
} finally {
  await client.end();
}

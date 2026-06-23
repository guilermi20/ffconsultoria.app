import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/server/db";
import { SCHEMA_SQL, SEED_SQL } from "@/server/sql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Token de proteção. Pode ser sobrescrito por env SEED_TOKEN.
// (Endpoint de demonstração — remova após semear, se quiser.)
const SEED_TOKEN = process.env.SEED_TOKEN ?? "ffseed-2026-7Kq9aZ";

// pgcrypto não é necessário (gen_random_uuid é nativo no PG13+) e pode
// falhar por permissão em alguns provedores — então removemos a linha.
const schema = SCHEMA_SQL.replace(/CREATE EXTENSION[^\n]*\n/g, "");

async function runSeed() {
  await pool.query(schema); // cria tipos/tabelas/índices (idempotente)
  await pool.query(SEED_SQL); // TRUNCATE + popula dados de exemplo
  const r = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users)::int            AS users,
      (SELECT COUNT(*) FROM training_plans)::int   AS plans,
      (SELECT COUNT(*) FROM workouts)::int          AS workouts,
      (SELECT COUNT(*) FROM workout_exercises)::int AS exercises,
      (SELECT COUNT(*) FROM workout_logs)::int      AS logs,
      (SELECT COUNT(*) FROM exercise_feedbacks)::int AS feedbacks
  `);
  return r.rows[0];
}

async function handle(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token !== SEED_TOKEN) {
    return NextResponse.json(
      { error: "Não autorizado. Informe ?token=… correto." },
      { status: 401 }
    );
  }
  // Seed é DESTRUTIVO (TRUNCATE). Em produção fica bloqueado por padrão —
  // para migrar o schema sem apagar dados, use /api/admin/migrate.
  const enabled =
    process.env.SEED_ENABLED === "true" || process.env.NODE_ENV !== "production";
  if (!enabled) {
    return NextResponse.json(
      {
        error:
          "Seed desabilitado em produção (apaga dados). Para migrar o schema sem perder dados use /api/admin/migrate. Para semear demo, defina SEED_ENABLED=true.",
      },
      { status: 403 }
    );
  }
  try {
    const counts = await runSeed();
    return NextResponse.json({
      ok: true,
      message: "Banco semeado com sucesso. 🎉",
      counts,
      next: "Acesse /coach ou /aluno. Recomendado remover este endpoint depois.",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

// GET (clicável no navegador) e POST — ambos exigem o token.
export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}

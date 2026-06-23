import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/server/db";
import { SCHEMA_SQL } from "@/server/sql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MIGRATE_TOKEN = process.env.MIGRATE_TOKEN ?? process.env.SEED_TOKEN ?? "ffseed-2026-7Kq9aZ";

// pgcrypto não é necessário (gen_random_uuid é nativo no PG13+).
const schema = SCHEMA_SQL.replace(/CREATE EXTENSION[^\n]*\n/g, "");

/**
 * Migração de schema NÃO-DESTRUTIVA — roda apenas o schema.sql, que é
 * idempotente (CREATE TABLE/INDEX IF NOT EXISTS + ALTER ADD COLUMN IF NOT
 * EXISTS). NUNCA dá TRUNCATE. Seguro para produção: preserva todos os dados.
 */
async function handle(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token !== MIGRATE_TOKEN) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    await pool.query(schema);
    const r = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users)::int AS users,
        (SELECT COUNT(*) FROM workout_logs)::int AS logs
    `);
    return NextResponse.json({
      ok: true,
      message: "Schema migrado (sem apagar dados).",
      counts: r.rows[0],
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}

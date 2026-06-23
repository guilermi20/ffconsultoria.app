import { NextResponse } from "next/server";
import { pool } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check + diagnóstico de deploy.
 * Não vaza segredos — só informa SE as variáveis existem, se conecta e
 * se o banco já foi semeado. Ajuda a diagnosticar erros 500 sem logs.
 */
export async function GET() {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    POSTGRES_URL: Boolean(process.env.POSTGRES_URL),
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
    seed_enabled:
      process.env.SEED_ENABLED === "true" || process.env.NODE_ENV !== "production",
  };

  let db: "up" | "down" = "down";
  let dbError: string | null = null;
  let seeded: boolean | null = null;
  let users: number | null = null;

  try {
    await pool.query("SELECT 1");
    db = "up";
    try {
      const r = await pool.query("SELECT COUNT(*)::int AS n FROM users");
      users = r.rows[0].n as number;
      seeded = users > 0;
    } catch {
      // tabela inexistente → banco conectado, porém NÃO semeado
      seeded = false;
    }
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  const hint = !env.DATABASE_URL && !env.POSTGRES_URL
    ? "Nenhuma variável de conexão no deploy. Conecte o Postgres ao projeto (Storage → Connect Project) e REDEPLOY."
    : db === "down"
      ? "Conexão falhou (veja dbError). Verifique a connection string e SSL."
      : seeded === false
        ? "Banco conectado, mas SEM dados. Rode o schema.sql + seed.sql no SQL editor (ou npm run db:setup)."
        : "OK — banco conectado e semeado.";

  return NextResponse.json({
    status: "ok",
    service: "teamff",
    env,
    db,
    seeded,
    users,
    dbError,
    hint,
    timestamp: new Date().toISOString(),
  });
}

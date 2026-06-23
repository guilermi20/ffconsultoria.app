import { Pool } from "pg";

/**
 * Pool do PostgreSQL otimizado para ambiente serverless (Vercel).
 *
 * - Reaproveita o mesmo Pool entre invocações "quentes" da função (cache no
 *   objeto global) — evita estourar o limite de conexões do Postgres.
 * - SSL é ligado automaticamente quando o host NÃO é local (Neon, Vercel
 *   Postgres, Supabase exigem SSL).
 * - Use uma connection string COM POOLER (ex.: host "-pooler" do Neon) na
 *   Vercel para escalar melhor.
 */

const connectionString =
  process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";

function needsSsl(conn: string): boolean {
  if (!conn) return false;
  if (/sslmode=disable/.test(conn)) return false;
  if (/localhost|127\.0\.0\.1|@db:/.test(conn)) return false;
  return true;
}

const globalForPg = globalThis as unknown as { __teamffPool?: Pool };

export const pool =
  globalForPg.__teamffPool ??
  new Pool({
    connectionString,
    // Pequeno por instância: muitas instâncias serverless × poucas conexões.
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: needsSsl(connectionString)
      ? { rejectUnauthorized: false }
      : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.__teamffPool = pool;
}

export async function query<T = any>(
  text: string,
  params: any[] = []
): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function queryOne<T = any>(
  text: string,
  params: any[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

import { Pool, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __ffPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não definida. Copie .env.local.example para .env.local."
    );
  }
  const needsSsl =
    /sslmode=require/.test(connectionString) ||
    /neon\.tech|supabase\.co|render\.com|railway\.app/.test(connectionString);

  return new Pool({
    connectionString,
    // O Postgres de desenvolvimento (scripts/dev-db.mjs) aceita uma conexão
    // por vez; em produção o padrão de 5 vale.
    max: Number(process.env.DB_POOL_MAX ?? 5),
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
}

export function pool(): Pool {
  if (!global.__ffPool) global.__ffPool = createPool();
  return global.__ffPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pool().query<T>(text, params);
  return res.rows;
}

export async function one<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

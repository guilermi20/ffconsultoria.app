import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://teamff:teamff@localhost:5432/teamff",
  max: 10,
});

/** Helper de query tipado e enxuto. */
export async function query<T = any>(
  text: string,
  params: any[] = []
): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

/** Retorna a primeira linha ou null. */
export async function queryOne<T = any>(
  text: string,
  params: any[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Aguarda o Postgres ficar disponível (importante no docker-compose,
 * onde o backend pode subir antes do banco estar pronto).
 */
export async function waitForDb(retries = 30, delayMs = 2000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(
        `[db] aguardando PostgreSQL (tentativa ${attempt}/${retries})… ${msg}`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("[db] não foi possível conectar ao PostgreSQL.");
}

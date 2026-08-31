#!/usr/bin/env node
/**
 * Postgres efêmero para desenvolvimento local (PGlite via protocolo wire).
 * Sem Docker, sem instalar nada. Os dados vivem em .pglite/.
 *
 *   node scripts/dev-db.mjs            porta 5433, persistente em .pglite/
 *   node scripts/dev-db.mjs --fresh    zera antes de subir
 *
 * Depois: DATABASE_URL=postgres://postgres@127.0.0.1:5433/postgres
 *
 * ATENÇÃO: o PGlite aceita UMA conexão de socket por vez — por isso o app
 * roda com DB_POOL_MAX=1. Para que as ferramentas de verificação possam
 * consultar o banco enquanto o app está conectado, este script também expõe
 * um endpoint HTTP local (porta 5434) que roda SQL na mesma instância.
 * Isso é ferramenta de desenvolvimento: escuta só em 127.0.0.1 e nunca sobe
 * junto com a aplicação em produção.
 */

import { rmSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = resolve(root, ".pglite");
const port = Number(process.env.DEV_DB_PORT ?? 5433);
const httpPort = port + 1;

if (process.argv.includes("--fresh")) {
  rmSync(dataDir, { recursive: true, force: true });
  console.log("→ .pglite/ apagado");
}

const db = await PGlite.create({ dataDir });
const socketServer = new PGLiteSocketServer({ db, port, host: "127.0.0.1" });
await socketServer.start();

const httpServer = createServer((request, response) => {
  if (request.method !== "POST") {
    response.writeHead(405).end();
    return;
  }
  let body = "";
  request.on("data", (chunk) => (body += chunk));
  request.on("end", async () => {
    try {
      const { sql, params } = JSON.parse(body);
      const result = await db.query(sql, params ?? []);
      response
        .writeHead(200, { "content-type": "application/json" })
        .end(JSON.stringify({ rows: result.rows }));
    } catch (error) {
      response
        .writeHead(400, { "content-type": "application/json" })
        .end(JSON.stringify({ error: error.message }));
    }
  });
});
httpServer.listen(httpPort, "127.0.0.1");

console.log(`\n  Postgres de desenvolvimento em 127.0.0.1:${port}`);
console.log(`  DATABASE_URL=postgres://postgres@127.0.0.1:${port}/postgres`);
console.log(`  Consulta p/ verificação: http://127.0.0.1:${httpPort}\n`);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    httpServer.close();
    await socketServer.stop();
    await db.close();
    process.exit(0);
  });
}

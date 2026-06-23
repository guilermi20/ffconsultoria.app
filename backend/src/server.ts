import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";

import { waitForDb } from "./db.js";
import { coachRoutes } from "./routes/coach.js";
import { logRoutes } from "./routes/logs.js";
import { workoutRoutes } from "./routes/workouts.js";
import { uploadRoutes } from "./routes/uploads.js";

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

async function main() {
  const app = Fastify({ logger: { transport: undefined } });

  await app.register(cors, {
    // No demo liberamos o frontend local (e qualquer origem se "*").
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(","),
  });

  app.get("/api/health", async () => ({
    status: "ok",
    service: "teamff-backend",
    timestamp: new Date().toISOString(),
  }));

  await app.register(coachRoutes);
  await app.register(logRoutes);
  await app.register(workoutRoutes);
  await app.register(uploadRoutes);

  await waitForDb();

  await app.listen({ port: PORT, host: HOST });
  console.log(`\n🟢 TEAM FF API rodando em http://localhost:${PORT}\n`);
}

main().catch((err) => {
  console.error("Falha ao iniciar o servidor:", err);
  process.exit(1);
});

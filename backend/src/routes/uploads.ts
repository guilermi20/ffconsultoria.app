import type { FastifyInstance } from "fastify";

const MEDIA_BASE =
  process.env.PUBLIC_MEDIA_BASE_URL ?? "https://media.teamff.dev";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function uploadRoutes(app: FastifyInstance) {
  // -------------------------------------------------------------------
  // Presigned URL (STUB de demonstração).
  // Na arquitetura real, o cliente envia o vídeo de execução DIRETO para o
  // storage (Cloudflare R2 / S3) via esta URL assinada, sem passar pelo
  // servidor de mídia. Aqui devolvemos uma URL fictícia, mas com o mesmo
  // formato de contrato esperado pelo frontend.
  // -------------------------------------------------------------------
  app.post<{
    Body: { fileName?: string; contentType?: string; studentId?: string };
  }>("/api/uploads/presign", async (req, reply) => {
    const { fileName, contentType } = req.body ?? {};
    if (!fileName) {
      return reply.code(400).send({ error: "fileName é obrigatório." });
    }

    const key = `uploads/${Date.now()}-${slugify(fileName)}`;
    const publicUrl = `${MEDIA_BASE}/${key}`;

    return {
      method: "PUT",
      // URL assinada fictícia — em produção viria do SDK do R2/S3.
      uploadUrl: `${publicUrl}?X-Amz-Demo-Signature=stub&content-type=${encodeURIComponent(
        contentType ?? "video/mp4"
      )}`,
      publicUrl,
      key,
      headers: { "Content-Type": contentType ?? "video/mp4" },
      note: "STUB de demonstração — nenhum upload real é realizado.",
    };
  });
}

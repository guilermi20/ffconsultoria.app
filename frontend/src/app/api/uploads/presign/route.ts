import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

/**
 * Presigned URL (STUB de demonstração). Na arquitetura real, o cliente
 * enviaria o vídeo DIRETO para o storage (Cloudflare R2 / S3) via esta URL
 * assinada. Aqui devolvemos uma URL fictícia com o mesmo contrato.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const fileName: string | undefined = body?.fileName;
  const contentType: string = body?.contentType ?? "video/mp4";

  if (!fileName) {
    return NextResponse.json(
      { error: "fileName é obrigatório." },
      { status: 400 }
    );
  }

  const key = `uploads/${Date.now()}-${slugify(fileName)}`;
  const publicUrl = `${MEDIA_BASE}/${key}`;

  return NextResponse.json({
    method: "PUT",
    uploadUrl: `${publicUrl}?X-Amz-Demo-Signature=stub&content-type=${encodeURIComponent(
      contentType
    )}`,
    publicUrl,
    key,
    headers: { "Content-Type": contentType },
    note: "STUB de demonstração — nenhum upload real é realizado.",
  });
}

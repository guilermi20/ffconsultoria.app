import { NextResponse } from "next/server";
import { one } from "@/server/db";
import { coachFromRequest } from "@/server/session";
import { whatsappProvider } from "@/server/whatsapp";

export const runtime = "nodejs";

/**
 * Envia um item da fila.
 *
 * No provedor "manual" (padrão do Módulo 1) o coach abre o link wa.me e o
 * item é apenas marcado como enviado. Com um provedor configurado, o envio
 * acontece aqui — a tela não muda.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await coachFromRequest())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: string };

  const item = await one<{ id: string; phone: string | null; message: string }>(
    `SELECT id, phone, message FROM whatsapp_queue WHERE id = $1`,
    [id]
  );
  if (!item) {
    return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
  }

  if (body.action === "cancelar") {
    await one(`UPDATE whatsapp_queue SET status = 'cancelado' WHERE id = $1 RETURNING id`, [
      id,
    ]);
    return NextResponse.json({ ok: true, status: "cancelado" });
  }

  const provider = whatsappProvider();
  const result = await provider.send(item.phone ?? "", item.message);

  if (!result.ok) {
    await one(
      `UPDATE whatsapp_queue SET status = 'falhou', error = $2, provider = $3
        WHERE id = $1 RETURNING id`,
      [id, result.error, provider.name]
    );
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  await one(
    `UPDATE whatsapp_queue
        SET status = 'enviado', sent_at = now(), provider = $2,
            provider_ref = $3, error = NULL
      WHERE id = $1 RETURNING id`,
    [id, provider.name, result.ref]
  );

  return NextResponse.json({ ok: true, status: "enviado", manual: provider.manual });
}

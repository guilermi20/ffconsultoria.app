import { NextResponse } from "next/server";
import { reviewFeedback } from "@/server/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const comment = (body?.coach_video_comment ?? "").trim();
    if (!comment) {
      return NextResponse.json(
        { error: "Comentário do coach é obrigatório." },
        { status: 400 }
      );
    }
    const updated = await reviewFeedback(params.id, comment);
    if (!updated) {
      return NextResponse.json(
        { error: "Feedback não encontrado." },
        { status: 404 }
      );
    }
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    );
  }
}

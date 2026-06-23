import { NextResponse } from "next/server";
import { updateStudentProfile } from "@/server/queries";
import { requireCoach } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const coach = await requireCoach();
  if (!coach) {
    return NextResponse.json(
      { error: "Acesso restrito ao coach." },
      { status: 403 }
    );
  }
  const body = await req.json().catch(() => ({}));
  try {
    const updated = await updateStudentProfile(params.id, {
      instagram_handle: body?.instagram_handle ?? null,
      avatar_url: body?.avatar_url ?? null,
      is_active: typeof body?.is_active === "boolean" ? body.is_active : null,
      goal: body?.goal ?? null,
    });
    if (!updated) {
      return NextResponse.json(
        { error: "Aluno não encontrado." },
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

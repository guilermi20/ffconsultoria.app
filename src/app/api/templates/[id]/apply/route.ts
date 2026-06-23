import { NextResponse } from "next/server";
import { applyTemplate } from "@/server/queries";
import { requireCoach } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await requireCoach())) {
    return NextResponse.json({ error: "Acesso restrito ao coach." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  if (!body?.student_id) {
    return NextResponse.json({ error: "Informe o aluno." }, { status: 400 });
  }
  try {
    // Cria uma CÓPIA independente do template no plano do aluno.
    const workoutId = await applyTemplate(params.id, body.student_id);
    return NextResponse.json({ id: workoutId }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    );
  }
}

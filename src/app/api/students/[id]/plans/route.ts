import { NextResponse } from "next/server";
import { createActivePlan } from "@/server/queries";
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
  if (!body?.title) {
    return NextResponse.json({ error: "Informe o título do plano." }, { status: 400 });
  }
  try {
    const plan = await createActivePlan(params.id, body);
    return NextResponse.json(plan, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    );
  }
}

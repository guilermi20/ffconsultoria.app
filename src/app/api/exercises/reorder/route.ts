import { NextResponse } from "next/server";
import { reorderWorkoutExercises } from "@/server/queries";
import { requireCoach } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await requireCoach())) {
    return NextResponse.json({ error: "Acesso restrito ao coach." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body?.ordered_ids) ? body.ordered_ids : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "ordered_ids vazio." }, { status: 400 });
  }
  try {
    await reorderWorkoutExercises(ids);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    );
  }
}

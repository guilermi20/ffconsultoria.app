import { NextResponse } from "next/server";
import { addWorkoutExercise } from "@/server/queries";
import { requireCoach } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
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
  if (!body?.exercise_name) {
    return NextResponse.json(
      { error: "Nome do exercício é obrigatório." },
      { status: 400 }
    );
  }
  try {
    const exercise = await addWorkoutExercise(params.id, body);
    return NextResponse.json(exercise, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createLog } from "@/server/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.student_id || !body?.workout_id) {
      return NextResponse.json(
        { error: "student_id e workout_id são obrigatórios." },
        { status: 400 }
      );
    }
    const id = await createLog(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao registrar o treino." },
      { status: 500 }
    );
  }
}

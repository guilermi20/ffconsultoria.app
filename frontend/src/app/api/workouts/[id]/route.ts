import { NextResponse } from "next/server";
import { getWorkout } from "@/server/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await getWorkout(params.id);
    if (!data) {
      return NextResponse.json(
        { error: "Treino não encontrado." },
        { status: 404 }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    );
  }
}

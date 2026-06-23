import { NextResponse } from "next/server";
import { getLogDetail, setLogCoachFeedback } from "@/server/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await getLogDetail(params.id);
    if (!data) {
      return NextResponse.json(
        { error: "Registro não encontrado." },
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

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const feedback = (body?.general_coach_feedback ?? "").trim();
    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback do coach é obrigatório." },
        { status: 400 }
      );
    }
    const updated = await setLogCoachFeedback(params.id, feedback);
    if (!updated) {
      return NextResponse.json(
        { error: "Registro não encontrado." },
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

import { NextResponse } from "next/server";
import { getExerciseCatalog } from "@/server/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const group = new URL(req.url).searchParams.get("group");
    return NextResponse.json(await getExerciseCatalog(group));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    );
  }
}

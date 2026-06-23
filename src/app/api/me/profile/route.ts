import { NextResponse } from "next/server";
import { getUserProfile, updateOwnProfile } from "@/server/queries";
import { getServerSession } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  try {
    return NextResponse.json(await getUserProfile(session.sub));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  try {
    const updated = await updateOwnProfile(session.sub, body);
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === "23505") {
      return NextResponse.json(
        { error: "Esse e-mail já está em uso." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    );
  }
}

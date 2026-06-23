import { NextResponse } from "next/server";
import { listStudents, createStudent } from "@/server/queries";
import { requireCoach } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listStudents());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!(await requireCoach())) {
    return NextResponse.json({ error: "Acesso restrito ao coach." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  if (!body?.name || !body?.email) {
    return NextResponse.json(
      { error: "Informe nome e e-mail." },
      { status: 400 }
    );
  }
  try {
    const student = await createStudent(body);
    return NextResponse.json(student, { status: 201 });
  } catch (e: any) {
    if (e?.code === "23505") {
      return NextResponse.json(
        { error: "Já existe um usuário com esse e-mail." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { one } from "@/server/db";
import { coachFromRequest } from "@/server/session";
import { listQuestions } from "@/server/queries";
import { NUMERIC_TYPES, type QuestionType } from "@/server/types";

export const runtime = "nodejs";

const TYPES: QuestionType[] = [
  "escala",
  "numero",
  "texto",
  "texto_longo",
  "escolha",
  "sim_nao",
];

/** "Sono (0 a 10)" -> "sono_0_a_10" */
function slugify(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

export async function GET() {
  if (!(await coachFromRequest())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  return NextResponse.json({ questions: await listQuestions(false) });
}

export async function POST(request: Request) {
  if (!(await coachFromRequest())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  const label = String(body?.label ?? "").trim();
  const type = String(body?.type ?? "") as QuestionType;

  if (!label) {
    return NextResponse.json({ error: "Informe a pergunta." }, { status: 400 });
  }
  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  }

  const options = Array.isArray(body?.options)
    ? (body!.options as unknown[]).map(String).filter(Boolean)
    : [];

  // Só faz sentido acompanhar em gráfico o que vira número.
  const track = Boolean(body?.track) && NUMERIC_TYPES.includes(type);

  const isScale = type === "escala";
  const key = `${slugify(label)}_${Date.now().toString(36).slice(-4)}`;

  const question = await one(
    `INSERT INTO checkin_questions
       (key, label, help, type, unit, options, min_value, max_value,
        required, track, position, active)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10,
             COALESCE((SELECT MAX(position) + 1 FROM checkin_questions), 0), true)
     RETURNING id, key, label`,
    [
      key,
      label,
      String(body?.help ?? "").trim() || null,
      type,
      String(body?.unit ?? "").trim() || null,
      JSON.stringify(options),
      isScale ? 0 : (body?.min_value as number | null) ?? null,
      isScale ? 10 : (body?.max_value as number | null) ?? null,
      Boolean(body?.required),
      track,
    ]
  );

  return NextResponse.json({ question }, { status: 201 });
}

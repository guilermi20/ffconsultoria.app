import Link from "next/link";
import { notFound } from "next/navigation";
import { LineChart } from "@/components/charts";
import { chartBounds } from "@/components/chart-bounds";
import { Motto, WordmarkStatic } from "@/components/Brand";
import { Card, CardHeader, EmptyState, Stat } from "@/components/ui";
import { formatDate, formatDateTime, weekLabel } from "@/server/dates";
import {
  getAnswers,
  getStudentByToken,
  listCheckins,
  listQuestions,
  studentSeries,
} from "@/server/queries";
import { NUMERIC_TYPES } from "@/server/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Minha evolução | TEAM FF",
  robots: { index: false, follow: false },
};

export default async function StudentPanel({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const student = await getStudentByToken(token);
  if (!student) notFound();

  const [series, checkins, questions] = await Promise.all([
    studentSeries(student.id),
    listCheckins({ studentId: student.id, status: "respondido", limit: 100 }),
    listQuestions(false),
  ]);

  const withData = series.filter((s) => s.points.length > 0);

  // Respostas completas de cada check-in — o aluno vê tudo que já preencheu.
  const history = await Promise.all(
    checkins.map(async (checkin) => ({
      checkin,
      answers: await getAnswers(checkin.id),
    }))
  );

  const questionById = new Map(questions.map((q) => [q.id, q]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="text-center">
        <WordmarkStatic />
        <div className="mt-3">
          <Motto />
        </div>
      </header>

      <div className="mt-10 animate-fade-up">
        <h1 className="text-2xl font-black tracking-tight text-white">
          {student.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Na consultoria desde {formatDate(student.started_at)}
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Check-ins enviados" value={checkins.length} />
        <Stat
          label="Último envio"
          value={
            checkins[0] ? weekLabel(checkins[0].week_start).split(" a ")[0] : "—"
          }
          hint={checkins[0] ? formatDate(checkins[0].submitted_at) : "nenhum ainda"}
        />
        <Stat label="Métricas acompanhadas" value={withData.length} />
      </div>

      <div className="mt-8">
        <Link
          href={`/checkin/${token}`}
          className="block w-full rounded-lg bg-red-600 py-3.5 text-center text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-red-500"
        >
          Responder o check-in da semana
        </Link>
      </div>

      {/* Evolução */}
      <h2 className="mb-3 mt-10 text-sm font-bold uppercase tracking-[0.18em] text-neutral-400">
        Minha evolução
      </h2>

      {withData.length === 0 ? (
        <EmptyState
          title="Ainda sem gráficos"
          description="Assim que você enviar alguns check-ins, sua evolução aparece aqui."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {withData.map((s) => (
            <Card key={s.question.id}>
              <CardHeader title={s.question.label} />
              <div className="p-4">
                <LineChart
                  points={s.points}
                  label={s.question.label}
                  unit={s.question.unit}
                  {...chartBounds(s.question)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Histórico completo de respostas */}
      <h2 className="mb-3 mt-10 text-sm font-bold uppercase tracking-[0.18em] text-neutral-400">
        Meus check-ins
      </h2>

      {history.length === 0 ? (
        <EmptyState title="Nenhum check-in enviado ainda" />
      ) : (
        <div className="space-y-3">
          {history.map(({ checkin, answers }) => (
            <details
              key={checkin.id}
              className="rounded-2xl border border-neutral-900 bg-neutral-950"
            >
              <summary className="flex cursor-pointer select-none items-center justify-between px-5 py-4">
                <span>
                  <span className="block text-sm font-semibold text-white">
                    Semana de {weekLabel(checkin.week_start)}
                  </span>
                  <span className="block text-xs text-neutral-500">
                    {formatDateTime(checkin.submitted_at)}
                  </span>
                </span>
                <span className="text-xs text-neutral-600">ver respostas</span>
              </summary>

              <dl className="divide-y divide-neutral-900 border-t border-neutral-900">
                {answers.map((answer) => {
                  const question = questionById.get(answer.question_id);
                  if (!question) return null;
                  const isNumeric =
                    NUMERIC_TYPES.includes(question.type) && answer.num !== null;

                  return (
                    <div key={answer.question_id} className="px-5 py-3">
                      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                        {question.label}
                      </dt>
                      <dd className="mt-1 text-sm text-neutral-200">
                        {isNumeric ? (
                          <span className="font-bold tabular-nums">
                            {answer.num}
                            {question.type === "escala" ? "/10" : ""}
                            {question.unit ? ` ${question.unit}` : ""}
                          </span>
                        ) : (
                          <span className="whitespace-pre-wrap">
                            {answer.txt ?? "—"}
                          </span>
                        )}
                      </dd>
                    </div>
                  );
                })}

                {checkin.coach_note ? (
                  <div className="bg-red-600/5 px-5 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-red-400">
                      Retorno do Fábio
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm text-neutral-200">
                      {checkin.coach_note}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

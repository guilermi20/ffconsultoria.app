import Link from "next/link";
import { notFound } from "next/navigation";
import CoachNote from "@/components/CoachNote";
import { Card, CardHeader, PageTitle } from "@/components/ui";
import { formatDateTime, weekLabel } from "@/server/dates";
import { getAnswers, getCheckin, listQuestions } from "@/server/queries";
import { NUMERIC_TYPES } from "@/server/types";

export const dynamic = "force-dynamic";

export default async function CheckinDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const checkin = await getCheckin(id);
  if (!checkin) notFound();

  const [questions, answers] = await Promise.all([
    listQuestions(false),
    getAnswers(checkin.id),
  ]);

  const byQuestion = new Map(answers.map((a) => [a.question_id, a]));
  const answered = questions.filter((q) => byQuestion.has(q.id));

  return (
    <div className="animate-fade-up">
      <PageTitle
        title={checkin.student_name}
        subtitle={`Check-in da semana de ${weekLabel(checkin.week_start)} · enviado ${formatDateTime(
          checkin.submitted_at
        )}`}
        action={
          <Link
            href={`/coach/alunos/${checkin.student_id}`}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-neutral-300 transition hover:border-neutral-700 hover:text-white"
          >
            Ver evolução do aluno
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Respostas" hint={`${answered.length} de ${questions.length} perguntas`} />
            <dl className="divide-y divide-neutral-900">
              {answered.map((question) => {
                const answer = byQuestion.get(question.id)!;
                const isNumeric =
                  NUMERIC_TYPES.includes(question.type) && answer.num !== null;

                return (
                  <div key={question.id} className="px-5 py-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      {question.label}
                    </dt>
                    <dd className="mt-1.5">
                      {question.type === "escala" && answer.num !== null ? (
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-black tabular-nums text-white">
                            {answer.num}
                            <span className="text-sm font-bold text-neutral-600">/10</span>
                          </span>
                          <div
                            className="h-1.5 w-40 overflow-hidden rounded-full bg-neutral-900"
                            role="img"
                            aria-label={`${answer.num} de 10`}
                          >
                            <div
                              className="h-full rounded-full bg-[#ef4444]"
                              style={{ width: `${(answer.num / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      ) : isNumeric ? (
                        <span className="text-2xl font-black tabular-nums text-white">
                          {answer.num}
                          {question.unit ? (
                            <span className="ml-1 text-sm font-bold text-neutral-600">
                              {question.unit}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">
                          {answer.txt ?? "—"}
                        </p>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader
              title="Anotação do coach"
              hint="Fica registrada no histórico deste check-in"
            />
            <CoachNote checkinId={checkin.id} initial={checkin.coach_note} />
          </Card>
        </div>
      </div>
    </div>
  );
}

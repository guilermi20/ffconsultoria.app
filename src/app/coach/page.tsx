import Link from "next/link";
import { BarChart, LineChart } from "@/components/charts";
import { chartBounds } from "@/components/chart-bounds";
import { Card, CardHeader, EmptyState, PageTitle, Stat, StatusBadge } from "@/components/ui";
import { formatDateTime, weekLabel, weekStart } from "@/server/dates";
import {
  adherenceSeries,
  overview,
  teamSeries,
  weekBoard,
} from "@/server/queries";

export const dynamic = "force-dynamic";

export default async function CoachHome({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const { semana } = await searchParams;
  const week = semana ?? weekStart();

  const [kpis, board, adherence, team] = await Promise.all([
    overview(week),
    weekBoard(week),
    adherenceSeries(12),
    teamSeries(12),
  ]);

  const answered = board.filter((r) => r.status === "respondido");
  const pending = board.filter((r) => r.status !== "respondido");

  return (
    <div className="animate-fade-up">
      <PageTitle
        title="Painel da semana"
        subtitle={`Semana de ${weekLabel(week)} · quem já respondeu e quem falta`}
        action={
          <Link
            href="/coach/disparos"
            className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-red-500"
          >
            Disparar check-in
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Alunos ativos" value={kpis.activeStudents} />
        <Stat
          label="Responderam"
          value={kpis.answered}
          hint={`${kpis.rate}% da turma`}
          tone={kpis.rate >= 70 ? "ok" : "default"}
        />
        <Stat
          label="Faltam responder"
          value={kpis.pending}
          tone={kpis.pending > 0 ? "late" : "ok"}
        />
        <Stat
          label="Último check-in"
          value={kpis.lastAnswerAt ? formatDateTime(kpis.lastAnswerAt).split(" · ")[1] : "—"}
          hint={kpis.lastAnswerAt ? formatDateTime(kpis.lastAnswerAt).split(" · ")[0] : "nenhum ainda"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Taxa de resposta"
            hint="Percentual da turma que respondeu, por semana"
          />
          <div className="p-4">
            <BarChart points={adherence} />
          </div>
        </Card>

        {team.slice(0, 1).map((series) => (
          <Card key={series.question.id}>
            <CardHeader
              title={`Média da turma · ${series.question.label}`}
              hint="Média semanal de todos os alunos que responderam"
            />
            <div className="p-4">
              <LineChart
                points={series.points}
                label={series.question.label}
                unit={series.question.unit}
                {...chartBounds(series.question)}
              />
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={`Responderam (${answered.length})`}
            hint="Clique para ver o check-in completo"
          />
          {answered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Ninguém respondeu ainda"
                description="Assim que os alunos enviarem o check-in da semana eles aparecem aqui."
              />
            </div>
          ) : (
            <ul className="divide-y divide-neutral-900">
              {answered.map((row) => (
                <li key={row.student_id}>
                  <Link
                    href={`/coach/checkins/${row.checkin_id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-neutral-900/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {row.student_name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatDateTime(row.submitted_at)}
                      </p>
                    </div>
                    <StatusBadge status="respondido" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title={`Faltam responder (${pending.length})`}
            hint="Cobrança individual pelo painel de disparos"
          />
          {pending.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Turma 100% em dia"
                description="Todos os alunos ativos responderam o check-in desta semana."
              />
            </div>
          ) : (
            <ul className="divide-y divide-neutral-900">
              {pending.map((row) => (
                <li
                  key={row.student_id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-300">
                      {row.student_name}
                    </p>
                    <p className="text-xs text-neutral-600">
                      {row.queue_status === "enviado"
                        ? `Link enviado · ${formatDateTime(row.sent_at)}`
                        : "Link ainda não enviado"}
                    </p>
                  </div>
                  <StatusBadge
                    status={row.queue_status === "enviado" ? "atrasado" : "pendente"}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {team.length > 1 ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {team.slice(1).map((series) => (
            <Card key={series.question.id}>
              <CardHeader title={`Média da turma · ${series.question.label}`} />
              <div className="p-4">
                <LineChart
                  points={series.points}
                  label={series.question.label}
                  unit={series.question.unit}
                  {...chartBounds(series.question)}
                />
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

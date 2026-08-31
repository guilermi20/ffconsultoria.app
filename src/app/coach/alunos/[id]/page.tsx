import Link from "next/link";
import { notFound } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import { LineChart } from "@/components/charts";
import { chartBounds } from "@/components/chart-bounds";
import { Card, CardHeader, EmptyState, PageTitle, Stat, StatusBadge } from "@/components/ui";
import { formatDate, formatDateTime, weekLabel } from "@/server/dates";
import {
  getStudent,
  listCheckins,
  studentSeries,
} from "@/server/queries";
import { checkinLink, panelLink, waMeLink } from "@/server/whatsapp";

export const dynamic = "force-dynamic";

export default async function StudentProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) notFound();

  const [series, checkins] = await Promise.all([
    studentSeries(student.id),
    listCheckins({ studentId: student.id, status: "respondido", limit: 100 }),
  ]);

  const withData = series.filter((s) => s.points.length > 0);
  const link = checkinLink(student.token);
  const painel = panelLink(student.token);
  const whatsapp = waMeLink(
    student.phone,
    `Fala ${student.name.split(" ")[0]}! Segue o link do teu check-in da semana: ${link}`
  );

  return (
    <div className="animate-fade-up">
      <PageTitle
        title={student.name}
        subtitle={`Na consultoria desde ${formatDate(student.started_at)}${
          student.goal ? ` · ${student.goal}` : ""
        }`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={student.status} />
            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-red-500"
              >
                Cobrar no WhatsApp
              </a>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Check-ins respondidos" value={checkins.length} />
        <Stat
          label="Último check-in"
          value={checkins[0] ? weekLabel(checkins[0].week_start).split(" a ")[0] : "—"}
          hint={checkins[0] ? formatDateTime(checkins[0].submitted_at) : "nenhum ainda"}
        />
        <Stat label="Métricas acompanhadas" value={withData.length} />
        <Stat
          label="Contato"
          value={student.phone ? "WhatsApp" : "—"}
          hint={student.phone ?? student.email ?? "sem contato cadastrado"}
        />
      </div>

      {/* Links pessoais — o mesmo link vale todas as semanas */}
      <Card className="mt-6">
        <CardHeader
          title="Links pessoais do aluno"
          hint="Fixos: o mesmo link serve para todas as semanas"
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
              Responder check-in
            </p>
            <p className="mt-1.5 break-all font-mono text-xs text-neutral-400">{link}</p>
            <div className="mt-2 flex gap-2">
              <CopyButton value={link} />
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-300 transition hover:border-neutral-700 hover:text-white"
              >
                Abrir
              </a>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
              Painel do aluno
            </p>
            <p className="mt-1.5 break-all font-mono text-xs text-neutral-400">{painel}</p>
            <div className="mt-2 flex gap-2">
              <CopyButton value={painel} />
              <a
                href={painel}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-300 transition hover:border-neutral-700 hover:text-white"
              >
                Abrir
              </a>
            </div>
          </div>
        </div>
      </Card>

      {/* Gráficos de evolução — um por métrica acompanhada */}
      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-[0.18em] text-neutral-400">
        Evolução
      </h2>

      {withData.length === 0 ? (
        <EmptyState
          title="Sem histórico para plotar"
          description="Os gráficos aparecem quando houver respostas numéricas. Marque perguntas como “acompanhar em gráfico” e importe o histórico do Google Forms."
          action={
            <Link
              href="/coach/perguntas"
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-neutral-300 hover:text-white"
            >
              Configurar perguntas
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {withData.map((s) => {
            const values = s.points.map((p) => p.value);
            const first = values[0];
            const last = values[values.length - 1];
            const delta = last - first;

            return (
              <Card key={s.question.id}>
                <CardHeader
                  title={s.question.label}
                  hint={`${s.points.length} ${
                    s.points.length === 1 ? "registro" : "registros"
                  } · atual ${last}${s.question.unit ? " " + s.question.unit : ""}${
                    s.points.length > 1
                      ? ` · ${delta >= 0 ? "+" : ""}${Number(delta.toFixed(1))} desde o início`
                      : ""
                  }`}
                />
                <div className="p-4">
                  <LineChart
                    points={s.points}
                    label={s.question.label}
                    unit={s.question.unit}
                    {...chartBounds(s.question)}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Histórico completo */}
      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-[0.18em] text-neutral-400">
        Histórico de check-ins
      </h2>

      {checkins.length === 0 ? (
        <EmptyState title="Nenhum check-in respondido ainda" />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-neutral-900">
            {checkins.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/coach/checkins/${c.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-neutral-900/60"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Semana de {weekLabel(c.week_start)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatDateTime(c.submitted_at)}
                      {c.source === "import" ? " · Google Forms" : ""}
                    </p>
                  </div>
                  <span className="text-xs text-neutral-600">ver respostas →</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {student.notes ? (
        <Card className="mt-6">
          <CardHeader title="Observações" />
          <p className="whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-neutral-300">
            {student.notes}
          </p>
        </Card>
      ) : null}
    </div>
  );
}

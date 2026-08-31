import Link from "next/link";
import { Card, EmptyState, PageTitle, StatusBadge } from "@/components/ui";
import { formatDateTime, recentWeeks, weekLabel } from "@/server/dates";
import { listCheckins, listStudents } from "@/server/queries";

export const dynamic = "force-dynamic";

export default async function CheckinsPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; aluno?: string }>;
}) {
  const { semana, aluno } = await searchParams;

  const [rows, students] = await Promise.all([
    listCheckins({
      week: semana || undefined,
      studentId: aluno || undefined,
      status: "respondido",
    }),
    listStudents(),
  ]);

  const weeks = recentWeeks(12).reverse();

  return (
    <div className="animate-fade-up">
      <PageTitle
        title="Check-ins"
        subtitle="Todas as respostas da base, de todos os alunos e semanas"
      />

      {/* Filtros em uma linha acima da tabela */}
      <form className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            Semana
          </span>
          <select
            name="semana"
            defaultValue={semana ?? ""}
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-red-600"
          >
            <option value="">Todas</option>
            {weeks.map((w) => (
              <option key={w} value={w}>
                {weekLabel(w)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            Aluno
          </span>
          <select
            name="aluno"
            defaultValue={aluno ?? ""}
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-red-600"
          >
            <option value="">Todos</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-neutral-300 transition hover:border-neutral-700 hover:text-white"
        >
          Filtrar
        </button>

        {semana || aluno ? (
          <Link
            href="/coach/checkins"
            className="px-1 py-2 text-xs text-neutral-500 hover:text-white"
          >
            Limpar
          </Link>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhuma resposta encontrada"
          description="Ajuste os filtros ou importe o histórico do Google Forms."
          action={
            <Link
              href="/coach/importar"
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white hover:bg-red-500"
            >
              Importar histórico
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-900 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-bold">Aluno</th>
                  <th className="px-5 py-3 font-bold">Semana</th>
                  <th className="px-5 py-3 font-bold">Enviado em</th>
                  <th className="px-5 py-3 font-bold">Origem</th>
                  <th className="px-5 py-3 font-bold">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-neutral-900/60">
                    <td className="px-5 py-3">
                      <Link
                        href={`/coach/checkins/${row.id}`}
                        className="font-semibold text-white hover:text-red-400"
                      >
                        {row.student_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-neutral-400">
                      {weekLabel(row.week_start)}
                    </td>
                    <td className="px-5 py-3 text-neutral-500">
                      {formatDateTime(row.submitted_at)}
                    </td>
                    <td className="px-5 py-3 text-neutral-500">
                      {row.source === "import"
                        ? "Google Forms"
                        : row.source === "manual"
                          ? "Manual"
                          : "App"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status="respondido" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import NewStudentForm from "@/components/NewStudentForm";
import { Card, EmptyState, PageTitle, StatusBadge } from "@/components/ui";
import { formatDate } from "@/server/dates";
import { studentSummaries } from "@/server/queries";
import { checkinLink } from "@/server/whatsapp";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const students = await studentSummaries();
  const active = students.filter((s) => s.status === "ativo").length;

  return (
    <div className="animate-fade-up">
      <PageTitle
        title="Alunos"
        subtitle={`${students.length} cadastrados · ${active} ativos na consultoria`}
        action={<NewStudentForm />}
      />

      {students.length === 0 ? (
        <EmptyState
          title="Nenhum aluno cadastrado"
          description="Cadastre os alunos ativos da consultoria para começar a receber os check-ins semanais. Você também pode importar a base do Google Forms."
          action={
            <Link
              href="/coach/importar"
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-neutral-300 hover:text-white"
            >
              Importar do Google Forms
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
                  <th className="px-5 py-3 font-bold">Desde</th>
                  <th className="px-5 py-3 font-bold">Check-ins</th>
                  <th className="px-5 py-3 font-bold">Sequência</th>
                  <th className="px-5 py-3 font-bold">Situação</th>
                  <th className="px-5 py-3 font-bold">Link do aluno</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {students.map((student) => (
                  <tr key={student.id} className="transition hover:bg-neutral-900/60">
                    <td className="px-5 py-3">
                      <Link
                        href={`/coach/alunos/${student.id}`}
                        className="font-semibold text-white hover:text-red-400"
                      >
                        {student.name}
                      </Link>
                      <p className="text-xs text-neutral-600">
                        {student.goal ?? student.phone ?? "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-neutral-500">
                      {formatDate(student.started_at)}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-neutral-300">
                      {student.total_checkins}
                    </td>
                    <td className="px-5 py-3">
                      {student.streak > 0 ? (
                        <span className="tabular-nums text-neutral-300">
                          {student.streak}{" "}
                          <span className="text-xs text-neutral-600">
                            {student.streak === 1 ? "semana" : "semanas"}
                          </span>
                        </span>
                      ) : (
                        <span className="text-neutral-700">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={student.status} />
                    </td>
                    <td className="px-5 py-3">
                      <CopyButton value={checkinLink(student.token)} label="Copiar" />
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

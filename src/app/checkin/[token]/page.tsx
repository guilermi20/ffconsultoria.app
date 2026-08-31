import Link from "next/link";
import { notFound } from "next/navigation";
import CheckinForm from "@/components/CheckinForm";
import { Motto, WordmarkStatic } from "@/components/Brand";
import { EmptyState } from "@/components/ui";
import { weekLabel, weekStart } from "@/server/dates";
import { getStudentByToken, listCheckins, listQuestions } from "@/server/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Check-in semanal | TEAM FF",
  robots: { index: false, follow: false },
};

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const student = await getStudentByToken(token);
  if (!student) notFound();

  const week = weekStart();
  const [questions, existing] = await Promise.all([
    listQuestions(),
    listCheckins({ studentId: student.id, week, status: "respondido", limit: 1 }),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="text-center">
        <WordmarkStatic />
        <div className="mt-3">
          <Motto />
        </div>
      </header>

      <div className="mt-10 animate-fade-up">
        <h1 className="text-2xl font-black tracking-tight text-white">
          Fala, {student.name.split(" ")[0]}!
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Check-in da semana de {weekLabel(week)}
        </p>
      </div>

      <div className="mt-6">
        {student.status === "inativo" ? (
          <EmptyState
            title="Acesso desativado"
            description="Fale com o Fábio para reativar seu acompanhamento."
          />
        ) : questions.length === 0 ? (
          <EmptyState
            title="Check-in ainda não configurado"
            description="O Fábio está montando as perguntas. Volte em instantes."
          />
        ) : (
          <CheckinForm
            token={token}
            questions={questions}
            firstName={student.name.split(" ")[0]}
            alreadyAnswered={existing.length > 0}
          />
        )}
      </div>

      <footer className="mt-10 text-center">
        <Link
          href={`/aluno/${token}`}
          className="text-xs uppercase tracking-[0.2em] text-neutral-600 hover:text-white"
        >
          Ver minha evolução →
        </Link>
      </footer>
    </div>
  );
}

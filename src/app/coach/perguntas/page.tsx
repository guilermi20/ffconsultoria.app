import QuestionsEditor from "@/components/QuestionsEditor";
import { PageTitle } from "@/components/ui";
import { listQuestions } from "@/server/queries";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const questions = await listQuestions(false);

  return (
    <div className="animate-fade-up">
      <PageTitle
        title="Perguntas do check-in"
        subtitle="Monte o formulário que o aluno responde toda semana"
      />
      <QuestionsEditor questions={questions} />
    </div>
  );
}

"use client";

import CoachShell from "@/components/CoachShell";
import { StudentGrid } from "@/components/StudentGrid";

export default function AtivosPage() {
  return (
    <CoachShell>
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
          ✅ Alunos ativos
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Alunos com plano regularizado (com acesso liberado ao app).
        </p>
        <div className="mt-6">
          <StudentGrid
            filter={(s) => s.is_active}
            emptyMsg="Nenhum aluno ativo no momento."
          />
        </div>
      </div>
    </CoachShell>
  );
}

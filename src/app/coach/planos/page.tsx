"use client";

import CoachShell from "@/components/CoachShell";
import { StudentGrid } from "@/components/StudentGrid";

export default function PlanosPage() {
  return (
    <CoachShell>
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
          📋 Planos ativos
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Alunos que têm um plano de treino ativo no momento.
        </p>
        <div className="mt-6">
          <StudentGrid
            filter={(s) => !!s.active_plan_title}
            emptyMsg="Nenhum plano ativo."
          />
        </div>
      </div>
    </CoachShell>
  );
}

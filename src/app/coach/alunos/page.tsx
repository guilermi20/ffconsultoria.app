"use client";

import CoachShell from "@/components/CoachShell";
import { StudentGrid } from "@/components/StudentGrid";

export default function AlunosPage() {
  return (
    <CoachShell>
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
          👥 Alunos
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Todos os seus alunos. Toque para ver o perfil, treinos e evolução.
        </p>
        <div className="mt-6">
          <StudentGrid />
        </div>
      </div>
    </CoachShell>
  );
}

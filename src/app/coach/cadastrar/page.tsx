"use client";

import CoachShell from "@/components/CoachShell";
import { StudentGrid } from "@/components/StudentGrid";

export default function CadastrarPage() {
  return (
    <CoachShell>
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
          ➕ Cadastrar treino
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Selecione o aluno para montar um novo treino (peso, séries, reps e exercícios).
          No perfil do aluno você também edita treinos existentes e aplica templates.
        </p>
        <div className="mt-6">
          <StudentGrid />
        </div>
      </div>
    </CoachShell>
  );
}

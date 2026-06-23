"use client";

import Link from "next/link";
import { useApi, type StudentSummary } from "@/lib/api";
import { Wordmark } from "@/components/Brand";
import { fmtRelative, initials } from "@/lib/format";

export default function AlunoChooser() {
  const { data, loading, error } = useApi<StudentSummary[]>("/api/students");

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <div className="flex items-center justify-between">
        <Wordmark small />
        <Link
          href="/coach"
          className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white"
        >
          ← Painel
        </Link>
      </div>

      <div className="mt-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-neutral-500">
          Pré-visualizar como aluno
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Área do Aluno
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Coach: escolha um aluno para ver a experiência mobile dele.
        </p>
      </div>

      {loading && (
        <p className="mt-8 text-sm text-neutral-500">Carregando alunos…</p>
      )}
      {error && <p className="mt-8 text-sm text-red-300">Erro: {error}</p>}

      <div className="mt-6 space-y-2.5">
        {data?.map((s) => (
          <Link
            key={s.id}
            href={`/aluno/${s.id}`}
            className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-600"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-700 text-sm font-black">
              {initials(s.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold leading-tight">{s.name}</div>
              <div className="truncate text-[11px] text-neutral-500">
                {s.active_plan_title ?? "Sem plano ativo"}
              </div>
            </div>
            <div className="text-right text-[10px] text-neutral-600">
              {s.last_log_at ? fmtRelative(s.last_log_at) : "novo"}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

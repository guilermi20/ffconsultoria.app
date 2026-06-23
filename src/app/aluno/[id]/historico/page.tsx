"use client";

import Link from "next/link";
import { useApi, type StudentDetail } from "@/lib/api";
import { Wordmark } from "@/components/Brand";
import StudentNav from "@/components/StudentNav";
import { fmtDate, fmtNumber, fmtRelative, rpeTone, weekdayShort } from "@/lib/format";

export default function HistoricoPage({ params }: { params: { id: string } }) {
  const { data, loading, error } = useApi<StudentDetail>(`/api/students/${params.id}`);
  const logs = data?.logs ?? [];

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-24 pt-8">
      <div className="flex items-center justify-between">
        <Wordmark small />
        <Link href={`/aluno/${params.id}`} className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white">
          ← Início
        </Link>
      </div>

      <h1 className="mt-6 flex items-center gap-2 text-2xl font-black tracking-tight">📅 Histórico</h1>
      <p className="mt-1 text-sm text-neutral-500">Todos os seus treinos registrados.</p>

      {loading && <p className="mt-8 text-sm text-neutral-500">Carregando…</p>}
      {error && <p className="mt-8 text-sm text-red-300">Erro: {error}</p>}

      <div className="mt-6 space-y-2">
        {data && logs.length === 0 && (
          <p className="text-sm text-neutral-600">Nenhum treino ainda. Bora? 💪</p>
        )}
        {logs.map((l) => (
          <Link
            key={l.id}
            href={`/aluno/${params.id}/log/${l.id}`}
            className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 transition hover:border-neutral-600"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest text-neutral-500">{weekdayShort(l.day_sequence)}</span>
                <span className="truncate text-sm font-bold">{l.workout_focus}</span>
                {l.skipped_count > 0 && (
                  <span className="rounded-full bg-amber-950 px-2 py-0.5 text-[9px] font-bold text-amber-300 ring-1 ring-amber-800">
                    {l.skipped_count} pulado{l.skipped_count > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[11px] text-neutral-500">
                {fmtDate(l.completed_at)} · {fmtRelative(l.completed_at)} · {fmtNumber(l.tonnage)}kg
                {l.general_coach_feedback ? " · 💬 feedback" : ""}
              </div>
            </div>
            <div className="flex items-center gap-2 pl-2">
              {l.rpe && <span className={`font-mono text-xs font-bold ${rpeTone(l.rpe)}`}>{l.rpe}</span>}
              <span className="text-neutral-600">›</span>
            </div>
          </Link>
        ))}
      </div>

      <StudentNav studentId={params.id} />
    </main>
  );
}

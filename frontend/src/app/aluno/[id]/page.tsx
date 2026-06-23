"use client";

import Link from "next/link";
import { useApi, type StudentDetail } from "@/lib/api";
import { Wordmark } from "@/components/Brand";
import {
  fmtDate,
  fmtNumber,
  fmtRelative,
  rpeTone,
  weekdayFull,
  weekdayShort,
} from "@/lib/format";

export default function AlunoHome({ params }: { params: { id: string } }) {
  const { data, loading, error } = useApi<StudentDetail>(
    `/api/students/${params.id}`
  );

  const firstName = data?.student.name.split(" ")[0] ?? "";

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <div className="flex items-center justify-between">
        <Wordmark small />
        <Link
          href="/aluno"
          className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white"
        >
          Trocar aluno
        </Link>
      </div>

      {loading && (
        <p className="mt-10 text-sm text-neutral-500">Carregando…</p>
      )}
      {error && <p className="mt-10 text-sm text-red-300">Erro: {error}</p>}

      {data && (
        <>
          <div className="mt-8">
            <p className="text-sm text-neutral-500">Olá,</p>
            <h1 className="text-3xl font-black tracking-tight">{firstName} 👊</h1>
            <p className="mt-1 text-sm text-neutral-400">
              {data.activePlan?.title ?? "Sem plano ativo"}
            </p>
          </div>

          {/* Stats rápidas */}
          <div className="mt-6 grid grid-cols-3 gap-2">
            <Stat label="Treinos" value={data.logs.length} />
            <Stat
              label="Último"
              value={
                data.logs[0] ? fmtRelative(data.logs[0].completed_at) : "—"
              }
              small
            />
            <Stat
              label="Volume total"
              value={`${fmtNumber(
                data.logs.reduce((a, l) => a + (l.tonnage || 0), 0)
              )}kg`}
              small
            />
          </div>

          {/* Treinos do plano */}
          <section className="mt-8">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
              Seu plano · {data.workouts.length} treinos
            </h2>
            <div className="space-y-2.5">
              {data.workouts.map((w, idx) => (
                <Link
                  key={w.id}
                  href={`/aluno/${params.id}/treino/${w.id}`}
                  className="block rounded-xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-600"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-neutral-900 px-2 py-0.5 text-[10px] font-bold tracking-widest text-neutral-300">
                      {weekdayFull(w.day_sequence)}
                    </span>
                    {idx === 0 && (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-black">
                        Próximo
                      </span>
                    )}
                  </div>
                  <div className="mt-2 font-bold leading-tight">
                    {w.target_focus}
                  </div>
                  <div className="mt-1 text-[11px] text-neutral-500">
                    {w.exercises?.length ?? 0} exercícios · toque para registrar
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Últimos registros */}
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                Últimos registros
              </h2>
            </div>
            <div className="space-y-2">
              {data.logs.slice(0, 5).map((l) => (
                <Link
                  key={l.id}
                  href={`/aluno/${params.id}/log/${l.id}`}
                  className="flex items-center justify-between rounded-lg border border-neutral-900 px-4 py-3 transition hover:border-neutral-700"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-widest text-neutral-500">
                        {weekdayShort(l.day_sequence)}
                      </span>
                      <span className="truncate text-sm font-medium">
                        {l.workout_focus}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-neutral-500">
                      {fmtDate(l.completed_at)} · {fmtNumber(l.tonnage)}kg
                      {l.general_coach_feedback ? " · 💬 feedback" : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-2">
                    {l.rpe && (
                      <span
                        className={`font-mono text-xs font-bold ${rpeTone(
                          l.rpe
                        )}`}
                      >
                        {l.rpe}
                      </span>
                    )}
                    <span className="text-neutral-600">›</span>
                  </div>
                </Link>
              ))}
              {data.logs.length === 0 && (
                <p className="text-sm text-neutral-600">
                  Você ainda não registrou treinos. Bora começar!
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  small,
}: {
  label: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-center">
      <div
        className={`font-black tracking-tight ${small ? "text-sm" : "text-xl"}`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
        {label}
      </div>
    </div>
  );
}

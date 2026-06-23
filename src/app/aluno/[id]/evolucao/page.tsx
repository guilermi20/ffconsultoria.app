"use client";

import Link from "next/link";
import { useApi, type StudentDetail } from "@/lib/api";
import { Wordmark } from "@/components/Brand";
import StudentNav from "@/components/StudentNav";
import { EvolutionChart } from "@/components/Charts";
import { pickEquivalence } from "@/lib/equivalences";
import { fmtDate, fmtNumber } from "@/lib/format";

export default function EvolucaoPage({ params }: { params: { id: string } }) {
  const { data, loading, error } = useApi<StudentDetail>(`/api/students/${params.id}`);

  const logs = data?.logs ?? [];
  const totalVol = logs.reduce((a, l) => a + (l.tonnage || 0), 0);
  const eq = pickEquivalence(totalVol);
  const rpes = logs.filter((l) => l.rpe).map((l) => l.rpe as number);
  const avgRpe = rpes.length ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : "—";
  const best = logs.reduce((m, l) => Math.max(m, l.tonnage || 0), 0);
  const evo = [...logs].reverse().map((l) => ({ label: fmtDate(l.completed_at), value: l.tonnage }));

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-24 pt-8">
      <div className="flex items-center justify-between">
        <Wordmark small />
        <Link href={`/aluno/${params.id}`} className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white">
          ← Início
        </Link>
      </div>

      <h1 className="mt-6 flex items-center gap-2 text-2xl font-black tracking-tight">📈 Sua evolução</h1>

      {loading && <p className="mt-8 text-sm text-neutral-500">Carregando…</p>}
      {error && <p className="mt-8 text-sm text-red-300">Erro: {error}</p>}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Stat label="Volume total" value={`${fmtNumber(totalVol)}kg`} />
            <Stat label="Treinos" value={logs.length} />
            <Stat label="RPE médio" value={avgRpe} />
            <Stat label="Melhor sessão" value={`${fmtNumber(best)}kg`} />
          </div>

          {eq && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-800/60 bg-gradient-to-br from-red-950/40 to-black p-4">
              <span className="text-4xl">{eq.emoji}</span>
              <div>
                <div className="text-sm font-black">{eq.countLabel} {eq.noun}</div>
                <div className="text-[11px] text-neutral-400">é o total que você já moveu. Monstro! 🔥</div>
              </div>
            </div>
          )}

          <section className="mt-8">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">Volume por treino</h2>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <EvolutionChart points={evo} />
            </div>
          </section>

          {logs.length === 0 && (
            <p className="mt-6 text-sm text-neutral-600">Registre treinos para ver sua evolução. 💪</p>
          )}
        </>
      )}

      <StudentNav studentId={params.id} />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-center">
      <div className="text-xl font-black tracking-tight">{value}</div>
      <div className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-neutral-500">{label}</div>
    </div>
  );
}

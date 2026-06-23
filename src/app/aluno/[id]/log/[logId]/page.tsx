"use client";

import Link from "next/link";
import { useApi, type LogDetail } from "@/lib/api";
import { Wordmark } from "@/components/Brand";
import ShareableCard, {
  type ShareableCardData,
} from "@/components/ShareableCard";
import { PumpCard } from "@/components/PumpCard";
import { fmtNumber, fmtWeight, weekdayFull } from "@/lib/format";
import { pickEquivalence } from "@/lib/equivalences";

export default function LogResultPage({
  params,
}: {
  params: { id: string; logId: string };
}) {
  const { data, loading, error } = useApi<LogDetail>(
    `/api/logs/${params.logId}`
  );

  const cardData: ShareableCardData | null = data
    ? {
        title: data.log.target_focus.toUpperCase(),
        dayOfWeek: weekdayFull(data.log.day_sequence).toUpperCase(),
        instagram: "@teamff.consultoria",
        totalTonnage: data.tonnage,
        exercises: data.feedbacks.map((f) => ({
          name: f.exercise_name,
          sets: f.sets,
          reps: f.reps_performed ? String(f.reps_performed) : f.reps_range,
          weight: f.weight_used ? parseFloat(f.weight_used) : 0,
        })),
      }
    : null;

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <div className="flex items-center justify-between">
        <Wordmark small />
        <Link
          href={`/aluno/${params.id}`}
          className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white"
        >
          ← Início
        </Link>
      </div>

      {loading && <p className="mt-10 text-sm text-neutral-500">Carregando…</p>}
      {error && <p className="mt-10 text-sm text-red-300">Erro: {error}</p>}

      {data && cardData && (
        <>
          <div className="mt-8 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-neutral-500">
              Treino concluído ✓
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">
              {data.log.target_focus}
            </h1>
            <p className="mt-2 text-sm text-neutral-400">
              <span className="font-mono text-white">
                {fmtNumber(data.tonnage)} kg
              </span>{" "}
              de volume total movido
              {data.log.rpe ? ` · RPE ${data.log.rpe}` : ""}
            </p>
          </div>

          {/* Gamificação — equivalência de peso */}
          {(() => {
            const eq = pickEquivalence(data.tonnage);
            if (!eq) return null;
            return (
              <div className="mt-6 overflow-hidden rounded-2xl border border-red-800/60 bg-gradient-to-br from-red-950/40 via-black to-black p-6 text-center">
                <div className="text-6xl leading-none">{eq.emoji}</div>
                <p className="mt-3 text-lg font-black leading-snug text-white">
                  {eq.phrase}
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-widest text-red-400">
                  Isso é muito peso. Disciplina virando resultado. 🔥
                </p>
              </div>
            );
          })()}

          {/* Feedback do coach (se houver) */}
          {data.log.general_coach_feedback && (
            <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Feedback do coach Fábio
              </div>
              <p className="mt-1 text-sm text-neutral-200">
                “{data.log.general_coach_feedback}”
              </p>
            </div>
          )}

          {/* Comentários de execução por exercício */}
          {data.feedbacks.some((f) => f.coach_video_comment) && (
            <div className="mt-4 space-y-2">
              {data.feedbacks
                .filter((f) => f.coach_video_comment)
                .map((f) => (
                  <div
                    key={f.id}
                    className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">
                        {f.exercise_name}
                      </span>
                      <span className="font-mono text-[11px] text-neutral-400">
                        {fmtWeight(f.weight_used)}kg × {f.reps_performed}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-neutral-200">
                      💬 {f.coach_video_comment}
                    </p>
                  </div>
                ))}
            </div>
          )}

          {/* Card do pump (foto + equivalência) */}
          {data.log.pump_photo_url &&
            (() => {
              const eq = pickEquivalence(data.tonnage);
              if (!eq) return null;
              return (
                <div className="mt-8">
                  <h2 className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                    📸 Card do pump
                  </h2>
                  <PumpCard
                    photo={data.log.pump_photo_url}
                    emoji={eq.emoji}
                    phrase={eq.phrase}
                    tonnage={data.tonnage}
                  />
                </div>
              );
            })()}

          {/* Card compartilhável */}
          <div className="mt-8">
            <h2 className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
              Compartilhe nos Stories
            </h2>
            <ShareableCard data={cardData} />
          </div>

          <div className="mt-10 flex gap-2">
            <Link
              href={`/aluno/${params.id}`}
              className="flex-1 rounded-lg border border-neutral-800 py-3 text-center text-xs font-bold uppercase tracking-widest text-neutral-300 hover:border-neutral-600"
            >
              Voltar ao início
            </Link>
          </div>
        </>
      )}
    </main>
  );
}

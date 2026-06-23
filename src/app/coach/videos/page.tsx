"use client";

import Link from "next/link";
import { useApi, type CoachOverview } from "@/lib/api";
import CoachShell from "@/components/CoachShell";
import { Avatar } from "@/components/Avatar";
import { fmtRelative, fmtWeight } from "@/lib/format";

export default function VideosPage() {
  const { data, loading, error } = useApi<CoachOverview>("/api/coach/overview");
  const list = data?.pendingVideos ?? [];

  return (
    <CoachShell>
      <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
          🎬 Vídeos para revisar
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Execuções enviadas pelos alunos aguardando seu feedback.
        </p>

        {loading && <p className="mt-8 text-sm text-neutral-500">Carregando…</p>}
        {error && <p className="mt-8 text-sm text-red-300">Erro: {error}</p>}

        {data && (
          <div className="mt-6 space-y-2">
            {list.length === 0 && (
              <p className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-center text-sm text-neutral-500">
                Tudo revisado! 🎉
              </p>
            )}
            {list.map((v) => (
              <Link
                key={v.feedback_id}
                href={`/coach/review/${v.log_id}`}
                className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-red-700"
              >
                <div className="flex aspect-[9/16] w-12 flex-none items-center justify-center rounded-md border border-neutral-800 bg-gradient-to-b from-neutral-900 to-black text-neutral-600">
                  ▶
                </div>
                <Avatar name={v.student_name} src={v.avatar_url} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{v.student_name}</div>
                  <div className="truncate text-[12px] text-neutral-400">
                    {v.exercise_name} ·{" "}
                    <span className="font-mono text-neutral-300">
                      {fmtWeight(v.weight_used)}kg × {v.reps_performed}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-600">{v.target_focus}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
                    revisar
                  </span>
                  <span className="text-[10px] text-neutral-600">{fmtRelative(v.completed_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CoachShell>
  );
}

"use client";

import Link from "next/link";
import { useApi, type CoachOverview } from "@/lib/api";
import CoachShell from "@/components/CoachShell";
import { Avatar } from "@/components/Avatar";
import { fmtDate, fmtRelative, rpeTone } from "@/lib/format";

export default function Treinos7dPage() {
  const { data, loading, error } = useApi<CoachOverview>("/api/coach/overview");
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const list = (data?.recentActivity ?? []).filter(
    (a) => new Date(a.completed_at).getTime() >= weekAgo
  );

  return (
    <CoachShell>
      <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
          📆 Treinos · últimos 7 dias
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sessões registradas pelos alunos na última semana.
        </p>

        {loading && <p className="mt-8 text-sm text-neutral-500">Carregando…</p>}
        {error && <p className="mt-8 text-sm text-red-300">Erro: {error}</p>}

        {data && (
          <div className="mt-6 space-y-2">
            {list.length === 0 && (
              <p className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-center text-sm text-neutral-500">
                Nenhum treino registrado nos últimos 7 dias.
              </p>
            )}
            {list.map((a) => (
              <Link
                key={a.log_id}
                href={`/coach/alunos/${a.student_id}`}
                className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-600"
              >
                <Avatar name={a.student_name} src={a.avatar_url} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{a.student_name}</div>
                  <div className="truncate text-[12px] text-neutral-400">{a.target_focus}</div>
                </div>
                <div className="flex items-center gap-3">
                  {a.pending_videos > 0 && (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
                      🎬 {a.pending_videos}
                    </span>
                  )}
                  {a.rpe && (
                    <span className={`font-mono text-xs font-bold ${rpeTone(a.rpe)}`}>RPE {a.rpe}</span>
                  )}
                  <span className="text-right text-[10px] text-neutral-600">
                    {fmtDate(a.completed_at)}
                    <br />
                    {fmtRelative(a.completed_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CoachShell>
  );
}

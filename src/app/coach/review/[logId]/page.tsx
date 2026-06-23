"use client";

import Link from "next/link";
import { useState } from "react";
import { apiSend, useApi, type LogDetail } from "@/lib/api";
import CoachShell from "@/components/CoachShell";
import { muscleEmoji, muscleLabel } from "@/lib/muscles";
import { fmtDate, fmtWeight } from "@/lib/format";

export default function ReviewPage({ params }: { params: { logId: string } }) {
  const { data, loading, error } = useApi<LogDetail>(`/api/logs/${params.logId}`);
  const withVideo = data?.feedbacks.filter((f) => f.video_url) ?? [];

  return (
    <CoachShell>
      <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
        <Link
          href="/coach/videos"
          className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white"
        >
          ← Fila de vídeos
        </Link>

        {loading && <p className="mt-8 text-sm text-neutral-500">Carregando…</p>}
        {error && <p className="mt-8 text-sm text-red-300">Erro: {error}</p>}

        {data && (
          <>
            <div className="mt-3">
              <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
                🎬 Análise de vídeos
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                <Link href={`/coach/alunos/${data.log.student_id}`} className="text-red-400 hover:underline">
                  {data.log.student_name}
                </Link>{" "}
                · {data.log.target_focus} · {fmtDate(data.log.completed_at)}
              </p>
            </div>

            {data.log.general_student_feedback && (
              <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Relato do aluno
                </div>
                <p className="mt-1 text-sm text-neutral-300">
                  “{data.log.general_student_feedback}”
                </p>
              </div>
            )}

            <div className="mt-6 space-y-6">
              {withVideo.length === 0 && (
                <p className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 text-center text-sm text-neutral-500">
                  Este treino não tem vídeos para revisar.
                </p>
              )}
              {withVideo.map((f) => (
                <VideoAnalysis key={f.id} f={f} />
              ))}
            </div>
          </>
        )}
      </div>
    </CoachShell>
  );
}

function VideoAnalysis({ f }: { f: LogDetail["feedbacks"][number] }) {
  const [comment, setComment] = useState(f.coach_video_comment ?? "");
  const [reviewed, setReviewed] = useState(f.video_status === "reviewed");
  const [saved, setSaved] = useState(f.coach_video_comment ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await apiSend(`/api/feedbacks/${f.id}/review`, "PATCH", {
        coach_video_comment: comment.trim(),
      });
      setReviewed(true);
      setSaved(comment.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4 sm:grid-cols-[200px_1fr]">
      {/* Player */}
      <div>
        <div className="relative flex aspect-[9/16] w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-neutral-800 bg-gradient-to-b from-neutral-900 to-black">
          {/* Em produção (com storage real) isto vira um <video controls src=...> */}
          <video
            controls
            playsInline
            src={f.video_url ?? undefined}
            className="h-full w-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLVideoElement).style.display = "none";
            }}
          />
          <div className="pointer-events-none absolute inset-0 -z-0 flex flex-col items-center justify-center text-neutral-600">
            <span className="text-3xl">▶</span>
            <span className="mt-1 text-[8px] uppercase tracking-widest">vídeo de execução</span>
          </div>
        </div>
        <a
          href={f.video_url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block truncate text-[10px] text-neutral-600 hover:underline"
        >
          {f.video_url}
        </a>
      </div>

      {/* Contexto + revisão */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base">{muscleEmoji(f.muscle_group)}</span>
          <h3 className="font-bold">{f.exercise_name}</h3>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-neutral-400">
          <span>Grupo: <b className="text-neutral-200">{muscleLabel(f.muscle_group)}</b></span>
          <span>Prescrito: <b className="text-neutral-200">{f.sets}×{f.reps_range}{f.target_weight ? ` @ ${fmtWeight(f.target_weight)}kg` : ""}</b></span>
          <span>Feito: <b className="text-neutral-200 font-mono">{fmtWeight(f.weight_used)}kg × {f.reps_performed ?? "—"}</b></span>
        </div>

        {reviewed ? (
          <div className="mt-4 rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">✓ Revisado</div>
            <p className="mt-1 text-sm text-neutral-200">“{saved}”</p>
            <button onClick={() => setReviewed(false)} className="mt-2 text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white">editar</button>
          </div>
        ) : (
          <div className="mt-4">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Análise técnica da execução: o que está bom, o que corrigir…"
              className="w-full resize-none rounded-md border border-neutral-800 bg-black p-3 text-sm focus:border-neutral-500 focus:outline-none"
            />
            <button
              onClick={save}
              disabled={saving || !comment.trim()}
              className="mt-2 rounded-lg bg-red-600 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-red-500 disabled:opacity-40"
            >
              {saving ? "Salvando…" : "Salvar análise"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

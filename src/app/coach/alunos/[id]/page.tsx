"use client";

import Link from "next/link";
import { useState } from "react";
import {
  apiSend,
  useApi,
  type LogDetail,
  type LogSummary,
  type StudentDetail,
} from "@/lib/api";
import { Wordmark } from "@/components/Brand";
import {
  fmtDate,
  fmtNumber,
  fmtRelative,
  fmtWeight,
  initials,
  rpeTone,
  weekdayShort,
} from "@/lib/format";

export default function StudentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data, loading, error } = useApi<StudentDetail>(
    `/api/students/${params.id}`
  );

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-neutral-900 bg-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Wordmark small />
          <Link
            href="/coach"
            className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white"
          >
            ← Painel
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {loading && (
          <p className="text-center text-sm text-neutral-500">Carregando…</p>
        )}
        {error && (
          <p className="text-sm text-red-300">Erro ao carregar: {error}</p>
        )}

        {data && (
          <>
            {/* Cabeçalho do aluno */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-700 text-lg font-black">
                {initials(data.student.name)}
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">
                  {data.student.name}
                </h1>
                <p className="text-sm text-neutral-500">
                  {data.student.instagram_handle} · {data.student.email}
                </p>
              </div>
            </div>

            {/* Plano ativo */}
            {data.activePlan && (
              <section className="mt-8">
                <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                  Plano ativo
                </h2>
                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5">
                  <div className="text-lg font-bold">{data.activePlan.title}</div>
                  {data.activePlan.description && (
                    <p className="mt-1 text-sm text-neutral-400">
                      {data.activePlan.description}
                    </p>
                  )}
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {data.workouts.map((w) => (
                      <div
                        key={w.id}
                        className="rounded-lg border border-neutral-800 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-neutral-900 px-2 py-0.5 text-[10px] font-bold tracking-widest text-neutral-300">
                            {weekdayShort(w.day_sequence)}
                          </span>
                          <span className="text-[10px] text-neutral-600">
                            {w.exercises?.length ?? 0} exercícios
                          </span>
                        </div>
                        <div className="mt-2 text-sm font-bold leading-tight">
                          {w.target_focus}
                        </div>
                        <ul className="mt-2 space-y-1">
                          {w.exercises?.map((ex) => (
                            <li
                              key={ex.id}
                              className="flex justify-between text-[11px] text-neutral-400"
                            >
                              <span className="truncate pr-2">
                                {ex.exercise_name}
                              </span>
                              <span className="whitespace-nowrap font-mono text-neutral-500">
                                {ex.sets}×{ex.reps_range}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Histórico de treinos / revisão */}
            <section className="mt-8">
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                Treinos registrados ({data.logs.length})
              </h2>
              <div className="space-y-3">
                {data.logs.map((log) => (
                  <LogCard key={log.id} log={log} />
                ))}
                {data.logs.length === 0 && (
                  <p className="text-sm text-neutral-600">
                    Este aluno ainda não registrou treinos.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------
// Card de log expansível (lazy-load do detalhe + revisão de vídeo)
// ---------------------------------------------------------------------
function LogCard({ log }: { log: LogSummary }) {
  const [open, setOpen] = useState(false);
  const detail = useApi<LogDetail>(open ? `/api/logs/${log.id}` : null);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded bg-neutral-900 px-2 py-0.5 text-[10px] font-bold tracking-widest text-neutral-300">
              {weekdayShort(log.day_sequence)}
            </span>
            <span className="font-bold">{log.workout_focus}</span>
            {log.pending_videos > 0 && (
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-black">
                {log.pending_videos} p/ revisar
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            {fmtDate(log.completed_at)} · {fmtRelative(log.completed_at)} ·{" "}
            {fmtNumber(log.tonnage)} kg movidos
          </div>
        </div>
        <div className="flex items-center gap-3 pl-3">
          {log.rpe && (
            <span className={`font-mono text-sm font-bold ${rpeTone(log.rpe)}`}>
              RPE {log.rpe}
            </span>
          )}
          <span className="text-neutral-500">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-neutral-900 px-5 py-4">
          {detail.loading && (
            <p className="text-xs text-neutral-500">Carregando detalhes…</p>
          )}
          {detail.data && (
            <>
              {detail.data.log.general_student_feedback && (
                <div className="mb-4 rounded-lg border border-neutral-800 bg-black p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                    Relato do aluno
                  </div>
                  <p className="mt-1 text-sm text-neutral-300">
                    “{detail.data.log.general_student_feedback}”
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {detail.data.feedbacks.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-lg border border-neutral-900 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {f.exercise_name}
                      </span>
                      <span className="font-mono text-xs text-neutral-400">
                        {fmtWeight(f.weight_used)}kg × {f.reps_performed}
                      </span>
                    </div>
                    {f.video_url && (
                      <VideoReview
                        feedbackId={f.id}
                        videoUrl={f.video_url}
                        status={f.video_status}
                        existingComment={f.coach_video_comment}
                      />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Bloco de revisão de vídeo (player simulado + comentário do coach)
// ---------------------------------------------------------------------
function VideoReview({
  feedbackId,
  videoUrl,
  status,
  existingComment,
}: {
  feedbackId: string;
  videoUrl: string;
  status: "pending" | "reviewed";
  existingComment: string | null;
}) {
  const [comment, setComment] = useState(existingComment ?? "");
  const [reviewed, setReviewed] = useState(status === "reviewed");
  const [savedComment, setSavedComment] = useState(existingComment ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!comment.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      await apiSend(`/api/feedbacks/${feedbackId}/review`, "PATCH", {
        coach_video_comment: comment.trim(),
      });
      setReviewed(true);
      setSavedComment(comment.trim());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
      {/* Player simulado (demo) */}
      <div className="flex aspect-[9/16] w-24 flex-none flex-col items-center justify-center rounded-md border border-neutral-800 bg-gradient-to-b from-neutral-900 to-black text-neutral-600">
        <span className="text-2xl">▶</span>
        <span className="mt-1 text-[8px] uppercase tracking-widest">
          vídeo
        </span>
      </div>

      <div className="min-w-0 flex-1">
        {reviewed ? (
          <div className="rounded-md border border-emerald-900/60 bg-emerald-950/30 p-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              <span>✓ Revisado</span>
            </div>
            <p className="mt-1 text-sm text-neutral-200">“{savedComment}”</p>
          </div>
        ) : (
          <>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escreva o feedback de execução para o aluno…"
              rows={2}
              className="w-full resize-none rounded-md border border-neutral-800 bg-black p-2 text-sm text-white placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={save}
                disabled={saving || !comment.trim()}
                className="rounded bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-black transition hover:bg-neutral-200 disabled:opacity-40"
              >
                {saving ? "Salvando…" : "Salvar revisão"}
              </button>
              {err && <span className="text-[11px] text-red-400">{err}</span>}
            </div>
          </>
        )}
        <a
          href={videoUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-[10px] text-neutral-600 underline-offset-2 hover:underline"
        >
          {videoUrl}
        </a>
      </div>
    </div>
  );
}

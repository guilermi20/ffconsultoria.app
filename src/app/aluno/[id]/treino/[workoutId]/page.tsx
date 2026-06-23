"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiSend, useApi, type Exercise, type Workout } from "@/lib/api";
import { Wordmark } from "@/components/Brand";
import { BodyMap } from "@/components/BodyMap";
import { muscleEmoji } from "@/lib/muscles";
import { fmtWeight, weekdayFull } from "@/lib/format";

interface WorkoutResponse {
  workout: Workout & { plan_title: string; student_name: string; student_id: string };
  exercises: Exercise[];
}

interface FormRow {
  weight: string;
  reps: string;
  videoUrl: string | null;
  videoName: string | null;
  uploading: boolean;
  skipped: boolean;
  skipReason: string;
}

function firstRep(range: string): string {
  const m = range.match(/\d+/);
  return m ? m[0] : "";
}

export default function RegistrarTreino({
  params,
}: {
  params: { id: string; workoutId: string };
}) {
  const router = useRouter();
  const { data, loading, error } = useApi<WorkoutResponse>(
    `/api/workouts/${params.workoutId}`
  );

  const [rows, setRows] = useState<Record<string, FormRow>>({});
  const [rpe, setRpe] = useState(7);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (data && Object.keys(rows).length === 0) {
      const init: Record<string, FormRow> = {};
      for (const ex of data.exercises) {
        init[ex.id] = {
          weight: ex.target_weight ? String(parseFloat(ex.target_weight)) : "",
          reps: firstRep(ex.reps_range),
          videoUrl: null,
          videoName: null,
          uploading: false,
          skipped: false,
          skipReason: "",
        };
      }
      setRows(init);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function update(exId: string, patch: Partial<FormRow>) {
    setRows((prev) => ({
      ...prev,
      [exId]: {
        ...(prev[exId] ?? {
          weight: "",
          reps: "",
          videoUrl: null,
          videoName: null,
          uploading: false,
          skipped: false,
          skipReason: "",
        }),
        ...patch,
      },
    }));
  }

  async function onVideoSelected(ex: Exercise, file: File | undefined) {
    if (!file) return;
    update(ex.id, { uploading: true });
    try {
      const res = await apiSend<{ publicUrl: string }>(
        "/api/uploads/presign",
        "POST",
        { fileName: file.name, contentType: file.type || "video/mp4", studentId: params.id }
      );
      update(ex.id, {
        videoUrl: res.publicUrl,
        videoName: file.name,
        uploading: false,
      });
    } catch {
      update(ex.id, { uploading: false });
    }
  }

  async function submit() {
    if (!data) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const feedbacks = data.exercises.map((ex) => {
        const r = rows[ex.id];
        return {
          workout_exercise_id: ex.id,
          weight_used:
            r.skipped || !r.weight ? null : parseFloat(r.weight.replace(",", ".")),
          reps_performed: r.reps ? parseInt(r.reps, 10) : null,
          video_url: r.videoUrl,
          skipped: r.skipped,
          skip_reason: r.skipped ? r.skipReason || "Não informado" : null,
        };
      });

      const created = await apiSend<{ id: string }>("/api/logs", "POST", {
        student_id: params.id,
        workout_id: params.workoutId,
        rpe,
        general_student_feedback: feedback || null,
        feedbacks,
      });
      router.push(`/aluno/${params.id}/log/${created.id}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Falha ao registrar.");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <div className="flex items-center justify-between">
        <Wordmark small />
        <Link
          href={`/aluno/${params.id}`}
          className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white"
        >
          ← Voltar
        </Link>
      </div>

      {loading && <p className="mt-10 text-sm text-neutral-500">Carregando…</p>}
      {error && <p className="mt-10 text-sm text-red-300">Erro: {error}</p>}

      {data && (
        <>
          <div className="mt-8">
            <span className="rounded bg-neutral-900 px-2 py-0.5 text-[10px] font-bold tracking-widest text-neutral-300">
              {weekdayFull(data.workout.day_sequence)}
            </span>
            <h1 className="mt-3 text-2xl font-black tracking-tight">
              {data.workout.target_focus}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Registre suas cargas. Pode pular um exercício se precisar.
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-neutral-900 bg-neutral-950 p-3">
            <BodyMap exercises={data.exercises} />
          </div>

          <div className="mt-6 space-y-3">
            {data.exercises.map((ex) => {
              const r = rows[ex.id] ?? ({} as FormRow);
              return (
                <div
                  key={ex.id}
                  className={`rounded-xl border p-4 transition ${
                    r.skipped
                      ? "border-amber-800/60 bg-amber-950/10"
                      : "border-neutral-800 bg-neutral-950"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold leading-tight">
                        {muscleEmoji(ex.muscle_group)} {ex.exercise_name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-neutral-500">
                        Meta: {ex.sets} × {ex.reps_range}
                        {ex.target_weight ? ` @ ${fmtWeight(ex.target_weight)}kg` : ""}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        update(ex.id, { skipped: !r.skipped })
                      }
                      className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition ${
                        r.skipped
                          ? "bg-amber-600 text-black"
                          : "border border-neutral-800 text-neutral-400 hover:border-amber-700 hover:text-amber-400"
                      }`}
                    >
                      {r.skipped ? "pulado" : "pular"}
                    </button>
                  </div>

                  {ex.notes && !r.skipped && (
                    <p className="mt-2 text-[11px] italic text-neutral-500">“{ex.notes}”</p>
                  )}

                  {r.skipped ? (
                    <div className="mt-3 space-y-2">
                      <label className="block">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400">
                          Por que pulou?
                        </span>
                        <input
                          value={r.skipReason}
                          onChange={(e) => update(ex.id, { skipReason: e.target.value })}
                          placeholder="Ex.: máquina ocupada, dor no ombro…"
                          className="mt-1 w-full rounded-md border border-amber-900/60 bg-black p-2 text-sm focus:border-amber-600 focus:outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                          Quanto chegou a fazer? (reps — opcional)
                        </span>
                        <input
                          value={r.reps}
                          onChange={(e) => update(ex.id, { reps: e.target.value })}
                          inputMode="numeric"
                          placeholder="0"
                          className="mt-1 w-24 rounded-md border border-neutral-800 bg-black p-2 text-center font-mono text-sm focus:border-neutral-500 focus:outline-none"
                        />
                      </label>
                    </div>
                  ) : (
                    <>
                      <div className="mt-3 flex items-center gap-2">
                        <label className="flex-1">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                            Carga (kg)
                          </span>
                          <input
                            inputMode="decimal"
                            value={r.weight ?? ""}
                            onChange={(e) => update(ex.id, { weight: e.target.value })}
                            placeholder="0"
                            className="mt-1 w-full rounded-md border border-neutral-800 bg-black p-2 text-center font-mono text-sm focus:border-neutral-500 focus:outline-none"
                          />
                        </label>
                        <span className="mt-4 text-neutral-600">×</span>
                        <label className="flex-1">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                            Reps
                          </span>
                          <input
                            inputMode="numeric"
                            value={r.reps ?? ""}
                            onChange={(e) => update(ex.id, { reps: e.target.value })}
                            placeholder="0"
                            className="mt-1 w-full rounded-md border border-neutral-800 bg-black p-2 text-center font-mono text-sm focus:border-neutral-500 focus:outline-none"
                          />
                        </label>
                      </div>

                      <div className="mt-3">
                        {r.videoUrl ? (
                          <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-400">
                            ✓ Vídeo anexado{r.videoName ? `: ${r.videoName}` : ""}
                          </div>
                        ) : (
                          <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white">
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => onVideoSelected(ex, e.target.files?.[0])}
                            />
                            {r.uploading ? "📤 Enviando…" : "🎬 Anexar vídeo da execução"}
                          </label>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* RPE + feedback */}
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
              💢 Percepção de esforço (RPE)
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setRpe(n)}
                  className={`h-8 w-8 rounded-md text-xs font-bold transition ${
                    rpe === n ? "bg-red-600 text-white" : "bg-black text-neutral-400 hover:bg-neutral-900"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              placeholder="Como foi o treino? Dores, sensações, recordes…"
              className="mt-4 w-full resize-none rounded-md border border-neutral-800 bg-black p-2 text-sm placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
            />
          </div>

          {submitError && <p className="mt-3 text-sm text-red-400">{submitError}</p>}

          <button
            onClick={submit}
            disabled={submitting}
            className="mt-6 w-full rounded-lg bg-red-600 py-3.5 text-sm font-black uppercase tracking-widest text-white transition hover:bg-red-500 active:scale-[0.99] disabled:opacity-50"
          >
            {submitting ? "Registrando…" : "Concluir treino 🔥"}
          </button>
        </>
      )}
    </main>
  );
}

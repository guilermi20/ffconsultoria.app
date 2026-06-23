"use client";

import { useState } from "react";
import {
  apiSend,
  useApi,
  type LogDetail,
  type LogSummary,
  type StudentDetail,
  type Workout,
} from "@/lib/api";
import CoachShell from "@/components/CoachShell";
import { Avatar } from "@/components/Avatar";
import ProfileEditor from "@/components/ProfileEditor";
import { EvolutionChart } from "@/components/Charts";
import { BodyMap } from "@/components/BodyMap";
import {
  WorkoutBuilder,
  ExerciseEditorRow,
  AddExerciseInline,
} from "@/components/WorkoutForms";
import { dominantMuscle, muscleEmoji, muscleLabel } from "@/lib/muscles";
import {
  fmtDate,
  fmtNumber,
  fmtRelative,
  fmtWeight,
  rpeTone,
  weekdayFull,
  weekdayShort,
} from "@/lib/format";

export default function StudentDetailPage({ params }: { params: { id: string } }) {
  const { data, loading, error, refetch } = useApi<StudentDetail>(
    `/api/students/${params.id}`
  );

  const evoPoints = data
    ? [...data.logs]
        .reverse()
        .map((l) => ({ label: fmtDate(l.completed_at), value: l.tonnage }))
    : [];

  return (
    <CoachShell>
      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
        {loading && <p className="text-center text-sm text-neutral-500">Carregando…</p>}
        {error && <p className="text-sm text-red-300">Erro: {error}</p>}

        {data && (
          <>
            <div className="flex items-center gap-4">
              <Avatar name={data.student.name} src={data.student.avatar_url} size={60} />
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
                  {data.student.name}
                  {!data.student.is_active && (
                    <span className="rounded-full bg-red-950 px-2 py-0.5 text-[10px] font-black uppercase text-red-400 ring-1 ring-red-800">
                      Inativo
                    </span>
                  )}
                </h1>
                <p className="truncate text-sm text-neutral-500">
                  {data.student.instagram_handle} · {data.student.email}
                </p>
              </div>
            </div>

            <section className="mt-6">
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                ⚙️ Perfil, meta & plano
              </h2>
              <ProfileEditor student={data.student} onChanged={refetch} />
            </section>

            <section className="mt-8">
              <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                📈 Evolução de volume
              </h2>
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5">
                <EvolutionChart points={evoPoints} />
              </div>
            </section>

            <section className="mt-8">
              <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                🏋️ Treinos do plano
              </h2>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-900 bg-neutral-950 px-3 py-2">
                <span className="text-xs text-neutral-400">
                  📋 {data.activePlan ? data.activePlan.title : "Nenhum plano ativo"}
                </span>
                <AddPlanInline
                  studentId={params.id}
                  hasPlan={!!data.activePlan}
                  onChanged={refetch}
                />
              </div>
              <div className="space-y-4">
                {data.workouts.map((w) => (
                  <WorkoutEditorCard key={w.id} workout={w} onChanged={refetch} />
                ))}
                <WorkoutBuilder studentId={params.id} onCreated={refetch} />
              </div>
            </section>

            <section className="mt-8">
              <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                🎬 Treinos registrados & revisão ({data.logs.length})
              </h2>
              <div className="space-y-3">
                {data.logs.slice(0, 12).map((log) => (
                  <LogCard key={log.id} log={log} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </CoachShell>
  );
}

function AddPlanInline({
  studentId,
  hasPlan,
  onChanged,
}: {
  studentId: string;
  hasPlan: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await apiSend(`/api/students/${studentId}/plans`, "POST", { title });
      setTitle("");
      setOpen(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-red-500"
      >
        {hasPlan ? "Novo plano ativo" : "Criar plano ativo"}
      </button>
    );
  }
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título do plano (ex.: Bloco de Força — 6 semanas)"
        className="flex-1 rounded-md border border-neutral-800 bg-black px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
      />
      <button
        onClick={save}
        disabled={busy}
        className="rounded-md bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-black hover:bg-neutral-200 disabled:opacity-50"
      >
        {busy ? "…" : "Salvar"}
      </button>
      <button onClick={() => setOpen(false)} className="text-[11px] text-neutral-500 hover:text-white">
        cancelar
      </button>
      {hasPlan && (
        <span className="w-full text-[10px] text-amber-400">
          ⚠️ Criar um novo plano desativa o plano atual.
        </span>
      )}
    </div>
  );
}

function WorkoutEditorCard({
  workout,
  onChanged,
}: {
  workout: Workout;
  onChanged: () => void;
}) {
  const exercises = workout.exercises ?? [];
  const dom = dominantMuscle(exercises);
  const [focus, setFocus] = useState(workout.target_focus);
  const [day, setDay] = useState(workout.day_sequence);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function saveHeader() {
    setBusy(true);
    try {
      await apiSend(`/api/workouts/${workout.id}`, "PATCH", {
        target_focus: focus,
        day_sequence: day,
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }
  async function removeWorkout() {
    if (!confirm("Excluir este treino e seus exercícios?")) return;
    setBusy(true);
    try {
      await apiSend(`/api/workouts/${workout.id}`, "DELETE", {});
      onChanged();
    } finally {
      setBusy(false);
    }
  }
  async function move(i: number, dir: -1 | 1) {
    const ids = exercises.map((e) => e.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await apiSend("/api/exercises/reorder", "POST", { ordered_ids: ids });
    onChanged();
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-950/40 text-2xl ring-1 ring-red-900/50">
            {muscleEmoji(dom)}
          </div>
          <div>
            <span className="rounded bg-neutral-900 px-2 py-0.5 text-[10px] font-bold tracking-widest text-neutral-300">
              {weekdayShort(workout.day_sequence)}
            </span>
            <div className="mt-1 font-bold leading-tight">{workout.target_focus}</div>
            <div className="text-[11px] text-neutral-500">
              {exercises.length} exercícios · foco {muscleLabel(dom)}
            </div>
          </div>
        </div>
        <button
          onClick={() => setEditing((v) => !v)}
          className="rounded-md border border-neutral-800 px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-neutral-300 hover:border-neutral-600"
        >
          {editing ? "ok" : "✏️ editar"}
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-neutral-900 bg-black p-3">
        <BodyMap exercises={exercises} />
      </div>

      {!editing ? (
        <ul className="mt-3 space-y-1">
          {exercises.map((ex) => (
            <li key={ex.id} className="flex items-center justify-between text-[12px]">
              <span className="truncate pr-2 text-neutral-300">
                {muscleEmoji(ex.muscle_group)} {ex.exercise_name}
              </span>
              <span className="whitespace-nowrap font-mono text-neutral-500">
                {ex.sets}×{ex.reps_range}
                {ex.target_weight ? ` · ${fmtWeight(ex.target_weight)}kg` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              className="flex-1 rounded-md border border-neutral-800 bg-black px-2 py-1.5 text-sm"
            />
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="rounded-md border border-neutral-800 bg-black px-2 py-1.5 text-sm"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>
                  {weekdayFull(d)}
                </option>
              ))}
            </select>
            <button
              onClick={saveHeader}
              disabled={busy}
              className="rounded-md bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-black hover:bg-neutral-200"
            >
              salvar
            </button>
          </div>

          {exercises.map((ex, i) => (
            <ExerciseEditorRow
              key={ex.id}
              ex={ex}
              catalogId={`cat-${workout.id}`}
              byName={new Map()}
              onChanged={onChanged}
              onMove={(dir) => move(i, dir)}
              index={i}
              total={exercises.length}
            />
          ))}
          <AddExerciseInline workoutId={workout.id} onAdded={onChanged} />

          <button
            onClick={removeWorkout}
            disabled={busy}
            className="text-[11px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400"
          >
            🗑️ excluir treino
          </button>
        </div>
      )}
    </div>
  );
}

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
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
                {log.pending_videos} p/ revisar
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            {fmtDate(log.completed_at)} · {fmtRelative(log.completed_at)} · {fmtNumber(log.tonnage)} kg
          </div>
        </div>
        <div className="flex items-center gap-3 pl-3">
          {log.rpe && (
            <span className={`font-mono text-sm font-bold ${rpeTone(log.rpe)}`}>RPE {log.rpe}</span>
          )}
          <span className="text-neutral-500">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-neutral-900 px-5 py-4">
          {detail.loading && <p className="text-xs text-neutral-500">Carregando…</p>}
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
                  <div key={f.id} className="rounded-lg border border-neutral-900 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {muscleEmoji(f.muscle_group)} {f.exercise_name}
                      </span>
                      {f.skipped ? (
                        <span className="rounded-full bg-amber-950 px-2 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-800">
                          pulado
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-neutral-400">
                          {fmtWeight(f.weight_used)}kg × {f.reps_performed}
                        </span>
                      )}
                    </div>
                    {f.skipped && f.skip_reason && (
                      <p className="mt-1 text-[12px] italic text-amber-300/80">
                        Motivo: {f.skip_reason}
                        {f.reps_performed ? ` · fez ${f.reps_performed} reps` : ""}
                      </p>
                    )}
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

  async function save() {
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await apiSend(`/api/feedbacks/${feedbackId}/review`, "PATCH", {
        coach_video_comment: comment.trim(),
      });
      setReviewed(true);
      setSavedComment(comment.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
      <div className="flex aspect-[9/16] w-24 flex-none flex-col items-center justify-center rounded-md border border-neutral-800 bg-gradient-to-b from-neutral-900 to-black text-neutral-600">
        <span className="text-2xl">▶</span>
        <span className="mt-1 text-[8px] uppercase tracking-widest">vídeo</span>
      </div>
      <div className="min-w-0 flex-1">
        {reviewed ? (
          <div className="rounded-md border border-emerald-900/60 bg-emerald-950/30 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              ✓ Revisado
            </div>
            <p className="mt-1 text-sm text-neutral-200">“{savedComment}”</p>
          </div>
        ) : (
          <>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Feedback de execução para o aluno…"
              rows={2}
              className="w-full resize-none rounded-md border border-neutral-800 bg-black p-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
            <button
              onClick={save}
              disabled={saving || !comment.trim()}
              className="mt-2 rounded bg-red-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-red-500 disabled:opacity-40"
            >
              {saving ? "Salvando…" : "Salvar revisão"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

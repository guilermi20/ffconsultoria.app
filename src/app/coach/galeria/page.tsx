"use client";

import Link from "next/link";
import { useState } from "react";
import {
  apiSend,
  useApi,
  type StudentSummary,
  type Template,
} from "@/lib/api";
import CoachShell from "@/components/CoachShell";
import { BodyMap } from "@/components/BodyMap";
import {
  WorkoutBuilder,
  ExerciseEditorRow,
  AddExerciseInline,
} from "@/components/WorkoutForms";
import { dominantMuscle, muscleEmoji, muscleLabel } from "@/lib/muscles";
import { fmtWeight } from "@/lib/format";

export default function GaleriaPage() {
  const templates = useApi<Template[]>("/api/templates");
  const students = useApi<StudentSummary[]>("/api/students");

  return (
    <CoachShell>
      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
          🗂️ Galeria de treinos
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Modelos reaproveitáveis. Ao aplicar a um aluno, é criada uma{" "}
          <b className="text-neutral-300">cópia independente</b> — editar a cópia
          não altera o template.
        </p>

        <div className="mt-6">
          <WorkoutBuilder isTemplate onCreated={templates.refetch} />
        </div>

        {templates.loading && (
          <p className="mt-8 text-sm text-neutral-500">Carregando templates…</p>
        )}
        {templates.error && (
          <p className="mt-8 text-sm text-red-300">Erro: {templates.error}</p>
        )}

        <div className="mt-6 space-y-4">
          {templates.data?.map((t) => (
            <TemplateCard
              key={t.id}
              tpl={t}
              students={students.data ?? []}
              onChanged={templates.refetch}
            />
          ))}
          {templates.data && templates.data.length === 0 && (
            <p className="text-sm text-neutral-600">
              Nenhum template ainda. Crie o primeiro acima. 👆
            </p>
          )}
        </div>
      </div>
    </CoachShell>
  );
}

function TemplateCard({
  tpl,
  students,
  onChanged,
}: {
  tpl: Template;
  students: StudentSummary[];
  onChanged: () => void;
}) {
  const exercises = tpl.exercises ?? [];
  const dom = dominantMuscle(exercises);
  const [editing, setEditing] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function apply() {
    if (!studentId) return;
    setApplying(true);
    setDone(null);
    try {
      await apiSend(`/api/templates/${tpl.id}/apply`, "POST", {
        student_id: studentId,
      });
      setDone(studentId);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-950/40 text-2xl ring-1 ring-red-900/50">
            {muscleEmoji(dom)}
          </div>
          <div>
            <div className="font-bold leading-tight">{tpl.template_title}</div>
            <div className="text-[11px] text-neutral-500">
              {tpl.target_focus} · {exercises.length} exercícios · foco{" "}
              {muscleLabel(dom)}
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
            <li
              key={ex.id}
              className="flex items-center justify-between text-[12px]"
            >
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
          {exercises.map((ex, i) => (
            <ExerciseEditorRow
              key={ex.id}
              ex={ex}
              catalogId={`tpl-${tpl.id}`}
              byName={new Map()}
              onChanged={onChanged}
              onMove={() => {}}
              index={i}
              total={exercises.length}
            />
          ))}
          <AddExerciseInline workoutId={tpl.id} onAdded={onChanged} />
        </div>
      )}

      {/* Aplicar a aluno */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-900 pt-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
          Aplicar a:
        </span>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="rounded-md border border-neutral-800 bg-black px-2 py-1.5 text-sm"
        >
          <option value="">selecione o aluno…</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          onClick={apply}
          disabled={applying || !studentId}
          className="rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-red-500 disabled:opacity-40"
        >
          {applying ? "Aplicando…" : "Aplicar (cria cópia)"}
        </button>
        {done && (
          <Link
            href={`/coach/alunos/${done}`}
            className="text-[11px] font-bold text-emerald-400 hover:underline"
          >
            ✓ Cópia criada — abrir aluno →
          </Link>
        )}
      </div>
    </div>
  );
}

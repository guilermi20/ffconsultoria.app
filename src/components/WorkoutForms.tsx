"use client";

import { useState } from "react";
import { apiSend, useApi, type CatalogItem, type Exercise } from "@/lib/api";
import { MUSCLE_OPTIONS, muscleEmoji, muscleLabel } from "@/lib/muscles";
import { weekdayFull } from "@/lib/format";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

interface Draft {
  exercise_name: string;
  sets: string;
  reps_range: string;
  target_weight: string;
  muscle_group: string;
}

const EMPTY: Draft = {
  exercise_name: "",
  sets: "3",
  reps_range: "10-12",
  target_weight: "",
  muscle_group: "",
};

function useCatalog() {
  const { data } = useApi<CatalogItem[]>("/api/exercises/catalog");
  const list = data ?? [];
  const byName = new Map(list.map((c) => [c.name.toLowerCase(), c.muscle_group]));
  return { list, byName };
}

function MuscleSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-neutral-800 bg-black px-2 py-1.5 text-xs focus:border-neutral-500 focus:outline-none"
    >
      <option value="">grupo…</option>
      {MUSCLE_OPTIONS.map((m) => (
        <option key={m.key} value={m.key}>
          {m.emoji} {m.label}
        </option>
      ))}
    </select>
  );
}

function DraftRow({
  draft,
  catalogId,
  byName,
  onChange,
  onRemove,
}: {
  draft: Draft;
  catalogId: string;
  byName: Map<string, string>;
  onChange: (d: Draft) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-black p-3">
      <div className="flex items-center gap-2">
        <input
          list={catalogId}
          value={draft.exercise_name}
          onChange={(e) => {
            const name = e.target.value;
            const g = byName.get(name.toLowerCase());
            onChange({ ...draft, exercise_name: name, muscle_group: g ?? draft.muscle_group });
          }}
          placeholder="Exercício (digite ou escolha do catálogo)"
          className="flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <button
          onClick={onRemove}
          className="rounded-md border border-neutral-800 px-2 py-1.5 text-xs text-neutral-500 hover:border-red-700 hover:text-red-400"
          title="Remover"
        >
          🗑️
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-[10px] text-neutral-500">
          séries
          <input
            value={draft.sets}
            onChange={(e) => onChange({ ...draft, sets: e.target.value })}
            inputMode="numeric"
            className="w-12 rounded border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-center font-mono text-xs"
          />
        </label>
        <label className="flex items-center gap-1 text-[10px] text-neutral-500">
          reps
          <input
            value={draft.reps_range}
            onChange={(e) => onChange({ ...draft, reps_range: e.target.value })}
            className="w-16 rounded border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-center font-mono text-xs"
          />
        </label>
        <label className="flex items-center gap-1 text-[10px] text-neutral-500">
          peso kg
          <input
            value={draft.target_weight}
            onChange={(e) => onChange({ ...draft, target_weight: e.target.value })}
            inputMode="decimal"
            placeholder="—"
            className="w-16 rounded border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-center font-mono text-xs"
          />
        </label>
        <MuscleSelect
          value={draft.muscle_group}
          onChange={(v) => onChange({ ...draft, muscle_group: v })}
        />
      </div>
    </div>
  );
}

function toPayload(d: Draft) {
  return {
    exercise_name: d.exercise_name.trim(),
    sets: d.sets ? parseInt(d.sets, 10) : 3,
    reps_range: d.reps_range || "10-12",
    target_weight: d.target_weight ? parseFloat(d.target_weight.replace(",", ".")) : null,
    muscle_group: d.muscle_group || null,
  };
}

// =========================================================================
// Builder — cria um novo treino para o aluno (ou um template)
// =========================================================================
export function WorkoutBuilder({
  studentId,
  isTemplate = false,
  onCreated,
}: {
  studentId?: string;
  isTemplate?: boolean;
  onCreated: () => void;
}) {
  const { list, byName } = useCatalog();
  const catalogId = "cat-builder";
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState("");
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(1);
  const [drafts, setDrafts] = useState<Draft[]>([{ ...EMPTY }]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    const exercises = drafts.filter((d) => d.exercise_name.trim()).map(toPayload);
    if (!focus.trim() || exercises.length === 0) {
      setErr("Informe o foco e ao menos um exercício.");
      return;
    }
    setSaving(true);
    try {
      if (isTemplate) {
        await apiSend("/api/templates", "POST", {
          template_title: title || focus,
          target_focus: focus,
          exercises,
        });
      } else {
        await apiSend(`/api/students/${studentId}/workouts`, "POST", {
          target_focus: focus,
          day_sequence: day,
          exercises,
        });
      }
      setFocus("");
      setTitle("");
      setDrafts([{ ...EMPTY }]);
      setOpen(false);
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-red-800/60 bg-red-950/10 py-3 text-sm font-bold uppercase tracking-widest text-red-400 transition hover:bg-red-950/30"
      >
        ➕ {isTemplate ? "Novo template" : "Cadastrar novo treino"}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <datalist id={catalogId}>
        {list.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">
          {isTemplate ? "🗂️ Novo template" : "➕ Novo treino"}
        </h3>
        <button onClick={() => setOpen(false)} className="text-xs text-neutral-500 hover:text-white">
          fechar
        </button>
      </div>

      {isTemplate && (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do template (ex.: Push A)"
          className="mt-3 w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="Foco do treino (ex.: Peito / Tríceps)"
          className="flex-1 rounded-md border border-neutral-800 bg-black px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        {!isTemplate && (
          <select
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="rounded-md border border-neutral-800 bg-black px-2 py-2 text-sm"
          >
            {WEEKDAYS.map((d) => (
              <option key={d} value={d}>
                {weekdayFull(d)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {drafts.map((d, i) => (
          <DraftRow
            key={i}
            draft={d}
            catalogId={catalogId}
            byName={byName}
            onChange={(nd) => setDrafts(drafts.map((x, j) => (j === i ? nd : x)))}
            onRemove={() => setDrafts(drafts.filter((_, j) => j !== i))}
          />
        ))}
      </div>

      <button
        onClick={() => setDrafts([...drafts, { ...EMPTY }])}
        className="mt-2 text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-white"
      >
        + adicionar exercício
      </button>

      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="mt-4 w-full rounded-lg bg-red-600 py-2.5 text-sm font-black uppercase tracking-widest text-white transition hover:bg-red-500 disabled:opacity-50"
      >
        {saving ? "Salvando…" : isTemplate ? "Salvar template" : "Salvar treino"}
      </button>
    </div>
  );
}

// =========================================================================
// Editor — edita exercícios de um treino existente (CRUD + reordenar)
// =========================================================================
export function ExerciseEditorRow({
  ex,
  catalogId,
  byName,
  onChanged,
  onMove,
  index,
  total,
}: {
  ex: Exercise;
  catalogId: string;
  byName: Map<string, string>;
  onChanged: () => void;
  onMove: (dir: -1 | 1) => void;
  index: number;
  total: number;
}) {
  const [d, setD] = useState<Draft>({
    exercise_name: ex.exercise_name,
    sets: String(ex.sets),
    reps_range: ex.reps_range,
    target_weight: ex.target_weight ? String(parseFloat(ex.target_weight)) : "",
    muscle_group: ex.muscle_group ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  function change(nd: Draft) {
    setD(nd);
    setDirty(true);
  }

  async function save() {
    setBusy(true);
    try {
      await apiSend(`/api/exercises/${ex.id}`, "PATCH", toPayload(d));
      setDirty(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await apiSend(`/api/exercises/${ex.id}`, "DELETE", {});
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-black p-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="text-[10px] text-neutral-500 hover:text-white disabled:opacity-20"
          >
            ▲
          </button>
          <button
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="text-[10px] text-neutral-500 hover:text-white disabled:opacity-20"
          >
            ▼
          </button>
        </div>
        <input
          list={catalogId}
          value={d.exercise_name}
          onChange={(e) => {
            const g = byName.get(e.target.value.toLowerCase());
            change({ ...d, exercise_name: e.target.value, muscle_group: g ?? d.muscle_group });
          }}
          className="flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <button
          onClick={remove}
          disabled={busy}
          className="rounded-md border border-neutral-800 px-2 py-1.5 text-xs text-neutral-500 hover:border-red-700 hover:text-red-400"
        >
          🗑️
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-[10px] text-neutral-500">
          séries
          <input value={d.sets} onChange={(e) => change({ ...d, sets: e.target.value })} inputMode="numeric" className="w-12 rounded border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-center font-mono text-xs" />
        </label>
        <label className="flex items-center gap-1 text-[10px] text-neutral-500">
          reps
          <input value={d.reps_range} onChange={(e) => change({ ...d, reps_range: e.target.value })} className="w-16 rounded border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-center font-mono text-xs" />
        </label>
        <label className="flex items-center gap-1 text-[10px] text-neutral-500">
          peso kg
          <input value={d.target_weight} onChange={(e) => change({ ...d, target_weight: e.target.value })} inputMode="decimal" placeholder="—" className="w-16 rounded border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-center font-mono text-xs" />
        </label>
        <MuscleSelect value={d.muscle_group} onChange={(v) => change({ ...d, muscle_group: v })} />
        {dirty && (
          <button
            onClick={save}
            disabled={busy}
            className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-red-500 disabled:opacity-50"
          >
            {busy ? "…" : "💾 salvar"}
          </button>
        )}
      </div>
    </div>
  );
}

export function AddExerciseInline({
  workoutId,
  onAdded,
}: {
  workoutId: string;
  onAdded: () => void;
}) {
  const { list, byName } = useCatalog();
  const catalogId = `cat-add-${workoutId}`;
  const [d, setD] = useState<Draft>({ ...EMPTY });
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!d.exercise_name.trim()) return;
    setBusy(true);
    try {
      await apiSend(`/api/workouts/${workoutId}/exercises`, "POST", toPayload(d));
      setD({ ...EMPTY });
      onAdded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-neutral-800 p-3">
      <datalist id={catalogId}>
        {list.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
      <DraftRow
        draft={d}
        catalogId={catalogId}
        byName={byName}
        onChange={setD}
        onRemove={() => setD({ ...EMPTY })}
      />
      <button
        onClick={add}
        disabled={busy || !d.exercise_name.trim()}
        className="mt-2 w-full rounded-md border border-neutral-700 py-2 text-xs font-bold uppercase tracking-widest text-neutral-300 hover:border-red-700 hover:text-red-400 disabled:opacity-40"
      >
        {busy ? "Adicionando…" : "+ adicionar exercício ao treino"}
      </button>
    </div>
  );
}

export { muscleEmoji, muscleLabel };

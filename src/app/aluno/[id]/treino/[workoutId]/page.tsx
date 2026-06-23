"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiSend, useApi, type Exercise, type Workout } from "@/lib/api";
import { Wordmark } from "@/components/Brand";
import { BodyMap } from "@/components/BodyMap";
import { RestTimer } from "@/components/RestTimer";
import { PumpCard } from "@/components/PumpCard";
import { muscleEmoji, muscleLabel } from "@/lib/muscles";
import { pickEquivalence } from "@/lib/equivalences";
import { fmtNumber, fmtWeight, weekdayFull } from "@/lib/format";

interface WorkoutResponse {
  workout: Workout & { plan_title: string; student_name: string; student_id: string };
  exercises: Exercise[];
}

interface ExState {
  weight: string;
  reps: string;
  note: string;
  videoUrl: string | null;
  videoName: string | null;
  uploading: boolean;
  skipped: boolean;
  skipReason: string;
}

type Phase = "resumo" | "treino" | "descansoSerie" | "descansoEx" | "preview" | "fim" | "salvo";

function firstRep(range: string): string {
  const m = range.match(/\d+/);
  return m ? m[0] : "";
}

async function photoToDataUrl(file: File, max = 760): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")?.drawImage(bmp, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function GuidedWorkout({
  params,
}: {
  params: { id: string; workoutId: string };
}) {
  const router = useRouter();
  const { data, loading, error } = useApi<WorkoutResponse>(`/api/workouts/${params.workoutId}`);

  const [phase, setPhase] = useState<Phase>("resumo");
  const [exIndex, setExIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [rows, setRows] = useState<Record<string, ExState>>({});
  const [skipPrompt, setSkipPrompt] = useState(false);

  const [rpe, setRpe] = useState(7);
  const [general, setGeneral] = useState("");
  const [pump, setPump] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (data && Object.keys(rows).length === 0) {
      const init: Record<string, ExState> = {};
      for (const ex of data.exercises) {
        init[ex.id] = {
          weight: ex.target_weight ? String(parseFloat(ex.target_weight)) : "",
          reps: firstRep(ex.reps_range),
          note: "",
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

  if (loading) return <Frame><p className="mt-10 text-sm text-neutral-500">Carregando…</p></Frame>;
  if (error) return <Frame><p className="mt-10 text-sm text-red-300">Erro: {error}</p></Frame>;
  if (!data) return <Frame><p /></Frame>;

  const exercises = data.exercises;
  const current = exercises[exIndex];
  const next = exercises[exIndex + 1];
  const totalSets = exercises.reduce((a, e) => a + (e.sets || 0), 0);
  const completedSets =
    exercises.slice(0, exIndex).reduce((a, e) => a + (e.sets || 0), 0) + setIndex;
  const progress = totalSets ? Math.round((completedSets / totalSets) * 100) : 0;

  function upd(exId: string, patch: Partial<ExState>) {
    setRows((p) => ({ ...p, [exId]: { ...p[exId], ...patch } }));
  }

  function computeVolume() {
    return exercises.reduce((acc, e) => {
      const r = rows[e.id];
      if (!r || r.skipped) return acc;
      const w = parseFloat((r.weight || "0").replace(",", ".")) || 0;
      const reps = parseInt(r.reps || "0", 10) || 0;
      return acc + (e.sets || 0) * reps * w;
    }, 0);
  }

  async function attachVideo(file?: File) {
    if (!file || !current) return;
    upd(current.id, { uploading: true });
    try {
      const res = await apiSend<{ publicUrl: string }>("/api/uploads/presign", "POST", {
        fileName: file.name,
        contentType: file.type || "video/mp4",
        studentId: params.id,
      });
      upd(current.id, { videoUrl: res.publicUrl, videoName: file.name, uploading: false });
    } catch {
      upd(current.id, { uploading: false });
    }
  }

  const lastSet = current ? setIndex === current.sets - 1 : false;
  const lastEx = exIndex === exercises.length - 1;

  function concluirSerie() {
    if ((current.rest_seconds || 0) > 0) setPhase("descansoSerie");
    else setSetIndex(setIndex + 1);
  }
  function concluirExercicio() {
    if ((current.rest_after_seconds || 0) > 0) setPhase("descansoEx");
    else setPhase("preview");
  }
  function pular() {
    upd(current.id, { skipped: true });
    setSkipPrompt(false);
    if (lastEx) setPhase("fim");
    else setPhase("preview");
  }
  function iniciarProximo() {
    setExIndex(exIndex + 1);
    setSetIndex(0);
    setPhase("treino");
  }

  async function salvar() {
    setSaving(true);
    setErr(null);
    try {
      const feedbacks = exercises.map((e) => {
        const r = rows[e.id];
        return {
          workout_exercise_id: e.id,
          weight_used: r.skipped || !r.weight ? null : parseFloat(r.weight.replace(",", ".")),
          reps_performed: r.reps ? parseInt(r.reps, 10) : null,
          video_url: r.videoUrl,
          skipped: r.skipped,
          skip_reason: r.skipped ? r.skipReason || "Não informado" : null,
          student_note: r.note || null,
        };
      });
      const created = await apiSend<{ id: string }>("/api/logs", "POST", {
        student_id: params.id,
        workout_id: params.workoutId,
        rpe,
        general_student_feedback: general || null,
        pump_photo_url: pump,
        feedbacks,
      });
      setSavedId(created.id);
      setPhase("salvo");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const volume = computeVolume();
  const eq = pickEquivalence(volume);

  // ---------------- RENDER ----------------
  return (
    <Frame
      header={
        phase === "treino" ? (
          <div className="mt-4">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              <span>Exercício {exIndex + 1}/{exercises.length}</span>
              <span>{completedSets}/{totalSets} séries</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-900">
              <div className="h-full rounded-full bg-red-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null
      }
    >
      {/* RESUMO */}
      {phase === "resumo" && (
        <div className="mt-6">
          <span className="rounded bg-neutral-900 px-2 py-0.5 text-[10px] font-bold tracking-widest text-neutral-300">
            {weekdayFull(data.workout.day_sequence)}
          </span>
          <h1 className="mt-3 text-2xl font-black tracking-tight">{data.workout.target_focus}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {exercises.length} exercícios · {totalSets} séries no total
          </p>
          <div className="mt-5 rounded-xl border border-neutral-900 bg-neutral-950 p-3">
            <BodyMap exercises={exercises} />
          </div>
          <div className="mt-4 space-y-1.5">
            {exercises.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-neutral-900 px-3 py-2 text-sm">
                <span className="truncate pr-2">{muscleEmoji(e.muscle_group)} {e.exercise_name}</span>
                <span className="whitespace-nowrap font-mono text-xs text-neutral-500">
                  {e.sets}×{e.reps_range}{e.target_weight ? ` · ${fmtWeight(e.target_weight)}kg` : ""}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => { setPhase("treino"); setExIndex(0); setSetIndex(0); }}
            className="mt-6 w-full rounded-lg bg-red-600 py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-red-500 active:scale-[0.99]"
          >
            ▶ Começar treino
          </button>
        </div>
      )}

      {/* TREINO (série atual) */}
      {phase === "treino" && current && (
        <div className="mt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-red-950/40 text-2xl ring-1 ring-red-900/50">
              {muscleEmoji(current.muscle_group)}
            </div>
            <div>
              <h1 className="text-xl font-black leading-tight tracking-tight">{current.exercise_name}</h1>
              <p className="text-[11px] text-neutral-500">{muscleLabel(current.muscle_group)}</p>
            </div>
          </div>

          <div className="mt-3 text-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-red-500">
              Série {setIndex + 1} de {current.sets}
            </span>
          </div>

          {current.notes && (
            <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">📋 Instrução do coach</div>
              <p className="mt-1 text-sm text-neutral-200">{current.notes}</p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-center gap-3">
            <Field label="Carga (kg)" value={rows[current.id]?.weight ?? ""} onChange={(v) => upd(current.id, { weight: v })} mode="decimal" />
            <span className="mt-5 text-neutral-600">×</span>
            <Field label="Reps feitas" value={rows[current.id]?.reps ?? ""} onChange={(v) => upd(current.id, { reps: v })} mode="numeric" />
          </div>
          <p className="mt-2 text-center text-[11px] text-neutral-500">
            Meta: {current.reps_range} reps{current.target_weight ? ` @ ${fmtWeight(current.target_weight)}kg` : ""} — ajuste se mudou.
          </p>

          {/* vídeo + anotação */}
          <div className="mt-4 flex flex-col gap-2">
            {rows[current.id]?.videoUrl ? (
              <span className="text-[11px] font-bold text-emerald-400">✓ Vídeo anexado{rows[current.id]?.videoName ? `: ${rows[current.id]?.videoName}` : ""}</span>
            ) : (
              <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white">
                <input type="file" accept="video/*" className="hidden" onChange={(e) => attachVideo(e.target.files?.[0])} />
                {rows[current.id]?.uploading ? "📤 Enviando…" : "🎬 Anexar vídeo"}
              </label>
            )}
            <input
              value={rows[current.id]?.note ?? ""}
              onChange={(e) => upd(current.id, { note: e.target.value })}
              placeholder="Anotação do exercício (opcional)"
              className="rounded-md border border-neutral-800 bg-black px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>

          {/* botão principal */}
          <button
            onClick={() => {
              if (lastSet && lastEx) setPhase("fim");
              else if (lastSet) concluirExercicio();
              else concluirSerie();
            }}
            className="mt-6 w-full rounded-lg bg-red-600 py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-red-500 active:scale-[0.99]"
          >
            {lastSet ? (lastEx ? "Terminar treino 🔥" : "Concluir exercício ✓") : "Concluir série ✓"}
          </button>

          {/* pular */}
          {!skipPrompt ? (
            <button onClick={() => setSkipPrompt(true)} className="mt-3 w-full text-center text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-amber-400">
              Pular exercício
            </button>
          ) : (
            <div className="mt-3 rounded-lg border border-amber-900/60 bg-amber-950/10 p-3">
              <input
                value={rows[current.id]?.skipReason ?? ""}
                onChange={(e) => upd(current.id, { skipReason: e.target.value })}
                placeholder="Por que está pulando?"
                className="w-full rounded-md border border-amber-900/60 bg-black p-2 text-sm focus:border-amber-600 focus:outline-none"
              />
              <div className="mt-2 flex gap-2">
                <button onClick={pular} className="rounded-md bg-amber-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-black">Confirmar pulo</button>
                <button onClick={() => setSkipPrompt(false)} className="text-[11px] text-neutral-500">cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DESCANSO ENTRE SÉRIES */}
      {phase === "descansoSerie" && current && (
        <RestTimer
          seconds={current.rest_seconds || 60}
          label="entre séries"
          onDone={() => { setSetIndex(setIndex + 1); setPhase("treino"); }}
        />
      )}

      {/* DESCANSO ENTRE EXERCÍCIOS */}
      {phase === "descansoEx" && current && (
        <RestTimer
          seconds={current.rest_after_seconds || 90}
          label="entre exercícios"
          onDone={() => setPhase("preview")}
        />
      )}

      {/* PREVIEW PRÓXIMO */}
      {phase === "preview" && next && (
        <div className="mt-10 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-neutral-500">Próximo exercício é…</p>
          <div className="mt-6 text-6xl animate-floaty">{muscleEmoji(next.muscle_group)}</div>
          <h1 className="mt-4 text-2xl font-black tracking-tight">{next.exercise_name}</h1>
          <p className="mt-1 text-sm text-neutral-400">
            {next.sets} × {next.reps_range}{next.target_weight ? ` @ ${fmtWeight(next.target_weight)}kg` : ""} · {muscleLabel(next.muscle_group)}
          </p>
          <button onClick={iniciarProximo} className="mt-8 w-full rounded-lg bg-red-600 py-4 text-sm font-black uppercase tracking-widest text-white hover:bg-red-500">
            ▶ Iniciar exercício
          </button>
        </div>
      )}
      {phase === "preview" && !next && (
        <div className="mt-10 text-center">
          <button onClick={() => setPhase("fim")} className="w-full rounded-lg bg-red-600 py-4 text-sm font-black uppercase tracking-widest text-white">Terminar treino 🔥</button>
        </div>
      )}

      {/* FIM */}
      {phase === "fim" && (
        <div className="mt-6">
          <div className="rounded-2xl border border-red-800/60 bg-gradient-to-br from-red-950/40 via-black to-black p-6 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-neutral-500">Treino concluído ✓</p>
            <div className="mt-3 text-7xl animate-pop">{eq?.emoji ?? "🏆"}</div>
            <p className="mt-3 text-lg font-black leading-snug">{eq?.phrase ?? "Treino registrado!"}</p>
            <p className="mt-2 font-mono text-sm text-red-400">{fmtNumber(volume)} kg movidos</p>
          </div>

          <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">💢 Como foi o esforço (RPE)?</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setRpe(n)} className={`h-8 w-8 rounded-md text-xs font-bold ${rpe === n ? "bg-red-600 text-white" : "bg-black text-neutral-400 hover:bg-neutral-900"}`}>{n}</button>
              ))}
            </div>
            <textarea
              value={general}
              onChange={(e) => setGeneral(e.target.value)}
              rows={3}
              placeholder="Considerações gerais do treino (opcional)"
              className="mt-4 w-full resize-none rounded-md border border-neutral-800 bg-black p-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>

          {/* foto do pump */}
          <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-center">
            <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">📸 Foto do pump (opcional)</span>
            {pump ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pump} alt="pump" className="mx-auto mt-2 h-40 rounded-lg object-cover" />
            ) : (
              <p className="mt-1 text-[11px] text-neutral-600">Registre o resultado do treino de hoje.</p>
            )}
            <label className="mt-3 inline-flex cursor-pointer items-center gap-1 rounded-md border border-neutral-700 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-neutral-300 hover:border-red-700">
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPump(await photoToDataUrl(f)); }} />
              {pump ? "Trocar foto" : "Tirar/escolher foto"}
            </label>
          </div>

          {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
          <button onClick={salvar} disabled={saving} className="mt-6 w-full rounded-lg bg-white py-4 text-sm font-black uppercase tracking-widest text-black hover:bg-neutral-200 disabled:opacity-50">
            {saving ? "Salvando…" : "Concluir e salvar treino"}
          </button>
        </div>
      )}

      {/* SALVO */}
      {phase === "salvo" && (
        <div className="mt-6 text-center">
          <div className="text-6xl animate-pop">🎉</div>
          <h1 className="mt-3 text-2xl font-black tracking-tight">Treino salvo!</h1>
          <p className="mt-1 text-sm text-neutral-400">{fmtNumber(volume)} kg · {eq?.countLabel} {eq?.noun}</p>

          {pump && eq && (
            <div className="mt-6">
              <PumpCard photo={pump} emoji={eq.emoji} phrase={eq.phrase} tonnage={volume} />
            </div>
          )}

          <div className="mt-8 flex flex-col gap-2">
            {savedId && (
              <Link href={`/aluno/${params.id}/log/${savedId}`} className="w-full rounded-lg bg-red-600 py-3 text-center text-xs font-black uppercase tracking-widest text-white hover:bg-red-500">
                Ver resumo & card de Stories
              </Link>
            )}
            <Link href={`/aluno/${params.id}`} className="w-full rounded-lg border border-neutral-800 py-3 text-center text-xs font-bold uppercase tracking-widest text-neutral-300 hover:border-neutral-600">
              Voltar ao início
            </Link>
          </div>
        </div>
      )}
    </Frame>
  );
}

function Frame({ children, header }: { children: React.ReactNode; header?: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <div className="flex items-center justify-between">
        <Wordmark small />
      </div>
      {header}
      {children}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  mode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mode: "decimal" | "numeric";
}) {
  return (
    <label className="w-28 text-center">
      <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">{label}</span>
      <input
        inputMode={mode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="mt-1 w-full rounded-md border border-neutral-800 bg-black p-3 text-center font-mono text-xl font-bold focus:border-red-600 focus:outline-none"
      />
    </label>
  );
}

"use client";

import Link from "next/link";
import { useApi, type StudentDetail } from "@/lib/api";
import { Wordmark } from "@/components/Brand";
import { Avatar } from "@/components/Avatar";
import StudentNav from "@/components/StudentNav";
import { EvolutionChart } from "@/components/Charts";
import { BodyMap } from "@/components/BodyMap";
import { dominantMuscle, muscleEmoji, muscleLabel } from "@/lib/muscles";
import {
  STATUS_META,
  daySeq,
  statusFor,
  mondayOf,
  addDays,
  sameDay,
  startOfToday,
  WD_SHORT,
} from "@/lib/calendar";
import {
  fmtDate,
  fmtNumber,
  fmtRelative,
  greetingSaoPaulo,
  rpeTone,
  weekdayFull,
  weekdayShort,
} from "@/lib/format";

export default function AlunoHome({ params }: { params: { id: string } }) {
  const { data, loading, error } = useApi<StudentDetail>(
    `/api/students/${params.id}`
  );

  const firstName = data?.student.name.split(" ")[0] ?? "";
  const evoPoints = data
    ? [...data.logs]
        .reverse()
        .map((l) => ({ label: fmtDate(l.completed_at), value: l.tonnage }))
    : [];

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-24 pt-8">
      <div className="flex items-center justify-between">
        <Wordmark small />
        {data && <Avatar name={data.student.name} src={data.student.avatar_url} size={36} />}
      </div>

      {loading && <p className="mt-10 text-sm text-neutral-500">Carregando…</p>}
      {error && <p className="mt-10 text-sm text-red-300">Erro: {error}</p>}

      {data && (
        <>
          <div className="mt-6">
            <p className="text-sm text-neutral-500">{greetingSaoPaulo()},</p>
            <h1 className="text-3xl font-black tracking-tight">{firstName} 👊</h1>
            <p className="mt-1 text-sm text-neutral-400">
              📋 {data.activePlan?.title ?? "Sem plano ativo"}
            </p>
          </div>

          {/* Meta do treino (só aparece se preenchida) */}
          {data.student.goal && (
            <div className="mt-5 rounded-xl border border-red-800/60 bg-gradient-to-br from-red-950/50 to-black p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-400">
                🎯 Meta do treino de hoje
              </div>
              <p className="mt-1 text-base font-bold leading-snug text-white">
                {data.student.goal}
              </p>
            </div>
          )}

          {/* Sua semana (calendário) */}
          {(() => {
            const mon = mondayOf(new Date());
            const week = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
            const today = startOfToday();
            const schedule = data.workouts.map((w) => ({
              student_id: params.id,
              workout_id: w.id,
              day_sequence: w.day_sequence,
              target_focus: w.target_focus,
            }));
            const logsLike = data.logs.map((l) => ({
              student_id: params.id,
              workout_id: l.workout_id,
              completed_at: l.completed_at,
              skipped: l.skipped_count,
            }));
            return (
              <section className="mt-6">
                <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                  📅 Sua semana
                </h2>
                <div className="grid grid-cols-7 gap-1">
                  {week.map((date, i) => {
                    const ds = daySeq(date);
                    const items = schedule
                      .filter((s) => s.day_sequence === ds)
                      .map((s) => ({
                        s,
                        status: statusFor(date, s.student_id, s.workout_id, logsLike),
                      }));
                    const isToday = sameDay(date, today);
                    return (
                      <div
                        key={i}
                        className={`rounded-lg border p-1.5 text-center ${
                          isToday ? "border-red-700 bg-red-950/20" : "border-neutral-800 bg-neutral-950"
                        }`}
                      >
                        <div className="text-[8px] font-bold tracking-widest text-neutral-500">
                          {WD_SHORT[i]}
                        </div>
                        <div className={`text-xs font-bold ${isToday ? "text-red-400" : "text-neutral-300"}`}>
                          {date.getDate()}
                        </div>
                        <div className="mt-1 flex flex-col items-center gap-0.5">
                          {items.length === 0 && <span className="text-[9px] text-neutral-700">·</span>}
                          {items.map((e, j) => (
                            <span
                              key={j}
                              title={`${e.s.target_focus} · ${STATUS_META[e.status].label}`}
                              className={`h-2 w-2 rounded-full ${STATUS_META[e.status].dot}`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-2">
            <Stat icon="🏋️" label="Treinos" value={data.logs.length} />
            <Stat
              icon="⏱️"
              label="Último"
              value={data.logs[0] ? fmtRelative(data.logs[0].completed_at) : "—"}
              small
            />
            <Stat
              icon="⚖️"
              label="Volume total"
              value={`${fmtNumber(data.logs.reduce((a, l) => a + (l.tonnage || 0), 0))}kg`}
              small
            />
          </div>

          {/* Plano */}
          <section className="mt-8">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
              🗓️ Seu plano · {data.workouts.length} treinos
            </h2>
            <div className="space-y-2.5">
              {data.workouts.map((w, idx) => {
                const dom = dominantMuscle(w.exercises ?? []);
                return (
                  <Link
                    key={w.id}
                    href={`/aluno/${params.id}/treino/${w.id}`}
                    className="block rounded-xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-red-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-red-950/40 text-2xl ring-1 ring-red-900/50">
                        {muscleEmoji(dom)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-neutral-900 px-2 py-0.5 text-[10px] font-bold tracking-widest text-neutral-300">
                            {weekdayFull(w.day_sequence)}
                          </span>
                          {idx === 0 && (
                            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                              Próximo
                            </span>
                          )}
                        </div>
                        <div className="mt-1 font-bold leading-tight">{w.target_focus}</div>
                        <div className="text-[11px] text-neutral-500">
                          {w.exercises?.length ?? 0} exercícios · foco {muscleLabel(dom)}
                        </div>
                      </div>
                      <span className="text-neutral-600">›</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Evolução */}
          <section id="evolucao" className="mt-8 scroll-mt-4">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
              📈 Sua evolução
            </h2>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <EvolutionChart points={evoPoints} />
            </div>
          </section>

          {/* Histórico */}
          <section id="historico" className="mt-8 scroll-mt-4">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
              📅 Últimos registros
            </h2>
            <div className="space-y-2">
              {data.logs.slice(0, 8).map((l) => (
                <Link
                  key={l.id}
                  href={`/aluno/${params.id}/log/${l.id}`}
                  className="flex items-center justify-between rounded-lg border border-neutral-900 px-4 py-3 transition hover:border-neutral-700"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-widest text-neutral-500">
                        {weekdayShort(l.day_sequence)}
                      </span>
                      <span className="truncate text-sm font-medium">{l.workout_focus}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-neutral-500">
                      {fmtDate(l.completed_at)} · {fmtNumber(l.tonnage)}kg
                      {l.general_coach_feedback ? " · 💬 feedback" : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-2">
                    {l.rpe && (
                      <span className={`font-mono text-xs font-bold ${rpeTone(l.rpe)}`}>{l.rpe}</span>
                    )}
                    <span className="text-neutral-600">›</span>
                  </div>
                </Link>
              ))}
              {data.logs.length === 0 && (
                <p className="text-sm text-neutral-600">
                  Você ainda não registrou treinos. Bora começar! 💪
                </p>
              )}
            </div>
          </section>
        </>
      )}

      <StudentNav studentId={params.id} />
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
  small,
}: {
  icon: string;
  label: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-center">
      <div className="text-base">{icon}</div>
      <div className={`mt-0.5 font-black tracking-tight ${small ? "text-sm" : "text-xl"}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
        {label}
      </div>
    </div>
  );
}

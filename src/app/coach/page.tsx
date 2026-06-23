"use client";

import Link from "next/link";
import { useApi, type CoachOverview, type StudentSummary } from "@/lib/api";
import { Wordmark } from "@/components/Brand";
import { fmtRelative, fmtWeight, initials, rpeTone } from "@/lib/format";

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        accent
          ? "border-white/30 bg-white text-black"
          : "border-neutral-800 bg-neutral-950"
      }`}
    >
      <div className="text-3xl font-black tracking-tight">{value}</div>
      <div
        className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${
          accent ? "text-neutral-600" : "text-neutral-500"
        }`}
      >
        {label}
      </div>
    </div>
  );
}

export default function CoachDashboard() {
  const overview = useApi<CoachOverview>("/api/coach/overview");
  const students = useApi<StudentSummary[]>("/api/students");

  const loading = overview.loading || students.loading;
  const error = overview.error || students.error;

  return (
    <main className="min-h-screen">
      {/* Topbar */}
      <header className="sticky top-0 z-20 border-b border-neutral-900 bg-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Wordmark small />
            <span className="hidden h-4 w-px bg-neutral-800 sm:block" />
            <span className="hidden text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500 sm:block">
              Painel do Consultor
            </span>
          </div>
          <Link
            href="/"
            className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white"
          >
            ← Início
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Bom treino, Fábio.
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Visão geral da operação — dados de demonstração.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
            Não foi possível carregar os dados. Confira o <code>DATABASE_URL</code> e
            se o banco foi semeado (<code>npm run db:setup</code>). ({error})
          </div>
        )}

        {loading && !error && (
          <div className="mt-10 text-center text-sm text-neutral-500">
            Carregando painel…
          </div>
        )}

        {overview.data && (
          <>
            {/* KPIs */}
            <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi label="Alunos ativos" value={overview.data.kpis.students} />
              <Kpi
                label="Planos ativos"
                value={overview.data.kpis.active_plans}
              />
              <Kpi
                label="Vídeos p/ revisar"
                value={overview.data.kpis.pending_videos}
                accent={overview.data.kpis.pending_videos > 0}
              />
              <Kpi
                label="Treinos (7 dias)"
                value={overview.data.kpis.logs_week}
              />
            </section>

            <div className="mt-8 grid gap-8 lg:grid-cols-3">
              {/* Alunos */}
              <section className="lg:col-span-2">
                <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                  Alunos
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {students.data?.map((s) => (
                    <Link
                      key={s.id}
                      href={`/coach/alunos/${s.id}`}
                      className="group rounded-xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-600"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-700 text-xs font-black">
                            {initials(s.name)}
                          </div>
                          <div>
                            <div className="font-bold leading-tight">
                              {s.name}
                            </div>
                            <div className="text-[11px] text-neutral-500">
                              {s.instagram_handle}
                            </div>
                          </div>
                        </div>
                        {s.pending_videos > 0 && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-black">
                            {s.pending_videos} vídeo
                            {s.pending_videos > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 truncate text-xs text-neutral-400">
                        {s.active_plan_title ?? "Sem plano ativo"}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500">
                        <span>{s.total_logs} treinos registrados</span>
                        <span>
                          {s.last_log_at
                            ? `último ${fmtRelative(s.last_log_at)}`
                            : "sem registros"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Coluna lateral: fila de vídeos + atividade */}
              <section className="space-y-8">
                <div>
                  <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                    Fila de vídeos
                  </h2>
                  <div className="space-y-2">
                    {overview.data.pendingVideos.length === 0 && (
                      <p className="text-xs text-neutral-600">
                        Nenhum vídeo pendente. 🎉
                      </p>
                    )}
                    {overview.data.pendingVideos.slice(0, 6).map((v) => (
                      <Link
                        key={v.feedback_id}
                        href={`/coach/alunos/${v.student_id}`}
                        className="block rounded-lg border border-neutral-800 bg-neutral-950 p-3 transition hover:border-neutral-600"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">
                            {v.student_name}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            {fmtRelative(v.completed_at)}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-neutral-400">
                          {v.exercise_name} ·{" "}
                          <span className="font-mono text-neutral-300">
                            {fmtWeight(v.weight_used)}kg × {v.reps_performed}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                    Atividade recente
                  </h2>
                  <div className="space-y-2">
                    {overview.data.recentActivity.slice(0, 7).map((a) => (
                      <div
                        key={a.log_id}
                        className="flex items-center justify-between rounded-lg border border-neutral-900 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium">
                            {a.student_name}
                          </div>
                          <div className="truncate text-[10px] text-neutral-500">
                            {a.target_focus}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pl-2">
                          {a.rpe && (
                            <span
                              className={`font-mono text-xs font-bold ${rpeTone(
                                a.rpe
                              )}`}
                            >
                              RPE {a.rpe}
                            </span>
                          )}
                          <span className="text-[10px] text-neutral-600">
                            {fmtRelative(a.completed_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

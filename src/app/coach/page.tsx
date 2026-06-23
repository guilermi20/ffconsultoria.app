"use client";

import Link from "next/link";
import { useApi, type CoachOverview } from "@/lib/api";
import CoachShell from "@/components/CoachShell";
import { BarChart } from "@/components/Charts";
import { Avatar } from "@/components/Avatar";
import { fmtNumber, fmtRelative, greetingSaoPaulo, rpeTone } from "@/lib/format";

function KpiCard({
  href,
  label,
  value,
  icon,
  accent,
}: {
  href: string;
  label: string;
  value: number | string;
  icon: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-xl border p-5 transition hover:-translate-y-0.5 ${
        accent
          ? "border-red-700 bg-red-600 text-white hover:bg-red-500"
          : "border-neutral-800 bg-neutral-950 hover:border-neutral-600"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-[16px] opacity-50 transition group-hover:translate-x-0.5">
          →
        </span>
      </div>
      <div className="mt-3 text-3xl font-black tracking-tight">{value}</div>
      <div
        className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${
          accent ? "text-white/70" : "text-neutral-500"
        }`}
      >
        {label}
      </div>
    </Link>
  );
}

export default function CoachDashboard() {
  const { data, loading, error } = useApi<CoachOverview>("/api/coach/overview");

  return (
    <CoachShell>
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-red-500">
            Painel do Consultor
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">
            {greetingSaoPaulo()}, Fábio 👊
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Visão geral da operação — toque nos cartões para ver os detalhes.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
            Não foi possível carregar. Confira <code>DATABASE_URL</code> e o seed. ({error})
          </div>
        )}
        {loading && !error && (
          <p className="mt-10 text-center text-sm text-neutral-500">Carregando…</p>
        )}

        {data && (
          <>
            <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <KpiCard href="/coach/ativos" label="Alunos ativos" value={data.kpis.students} icon="👥" />
              <KpiCard href="/coach/planos" label="Planos ativos" value={data.kpis.active_plans} icon="📋" />
              <KpiCard href="/coach/videos" label="Vídeos p/ revisar" value={data.kpis.pending_videos} icon="🎬" accent={data.kpis.pending_videos > 0} />
              <KpiCard href="/coach/treinos-7d" label="Treinos · 7 dias" value={data.kpis.logs_week} icon="📆" />
            </section>

            <div className="mt-8 grid gap-8 lg:grid-cols-3">
              <section className="lg:col-span-2">
                <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                  📈 Volume movido por semana
                </h2>
                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5">
                  <BarChart
                    points={data.weeklyVolume.map((w) => ({ label: w.week_label, value: w.volume }))}
                    height={150}
                  />
                  <p className="mt-3 text-center text-[11px] text-neutral-500">
                    Soma do tonelagem de todos os alunos nas últimas 8 semanas.
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                    ⚡ Atividade recente
                  </h2>
                  <Link href="/coach/alunos" className="text-[11px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400">
                    Ver alunos →
                  </Link>
                </div>
                <div className="mt-3 space-y-2">
                  {data.recentActivity.slice(0, 8).map((a) => (
                    <Link
                      key={a.log_id}
                      href={`/coach/alunos/${a.student_id}`}
                      className="flex items-center justify-between rounded-lg border border-neutral-900 px-3 py-2 transition hover:border-neutral-700"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={a.student_name} src={a.avatar_url} size={32} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{a.student_name}</div>
                          <div className="truncate text-[10px] text-neutral-500">{a.target_focus}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pl-2">
                        {a.pending_videos > 0 && (
                          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
                            🎬 {a.pending_videos}
                          </span>
                        )}
                        {a.rpe && (
                          <span className={`font-mono text-xs font-bold ${rpeTone(a.rpe)}`}>
                            RPE {a.rpe}
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-600">{fmtRelative(a.completed_at)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                  🎬 Fila de vídeos
                </h2>
                <div className="space-y-2">
                  {data.pendingVideos.length === 0 && (
                    <p className="text-xs text-neutral-600">Nenhum vídeo pendente. 🎉</p>
                  )}
                  {data.pendingVideos.slice(0, 6).map((v) => (
                    <Link
                      key={v.feedback_id}
                      href={`/coach/review/${v.log_id}`}
                      className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950 p-3 transition hover:border-red-700"
                    >
                      <Avatar name={v.student_name} src={v.avatar_url} size={30} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold">{v.student_name}</div>
                        <div className="truncate text-[10px] text-neutral-500">{v.exercise_name}</div>
                      </div>
                      <span className="text-[10px] text-neutral-600">{fmtRelative(v.completed_at)}</span>
                    </Link>
                  ))}
                  {data.pendingVideos.length > 6 && (
                    <Link href="/coach/videos" className="block rounded-lg border border-red-900/60 bg-red-950/20 p-2 text-center text-[11px] font-bold text-red-400">
                      Ver todos os {data.pendingVideos.length} vídeos →
                    </Link>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </CoachShell>
  );
}

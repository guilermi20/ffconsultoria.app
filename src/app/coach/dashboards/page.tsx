"use client";

import Link from "next/link";
import { useApi, type CoachAnalytics, type CoachOverview } from "@/lib/api";
import CoachShell from "@/components/CoachShell";
import { Avatar } from "@/components/Avatar";
import { BarChart } from "@/components/Charts";
import { muscleEmoji, muscleLabel } from "@/lib/muscles";
import { fmtNumber, fmtRelative } from "@/lib/format";

function daysSince(iso: string | null): number {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function DashboardsPage() {
  const a = useApi<CoachAnalytics>("/api/coach/analytics");
  const ov = useApi<CoachOverview>("/api/coach/overview");

  return (
    <CoachShell>
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">📊 Dashboards</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Indicadores da operação (últimos 30–90 dias).
        </p>

        {(a.loading || ov.loading) && <p className="mt-8 text-sm text-neutral-500">Carregando…</p>}
        {a.error && <p className="mt-8 text-sm text-red-300">Erro: {a.error}</p>}

        {a.data && (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Volume por semana (do overview) */}
            {ov.data && (
              <Card title="📈 Volume movido por semana">
                <BarChart
                  points={ov.data.weeklyVolume.map((w) => ({ label: w.week_label, value: w.volume }))}
                  height={150}
                />
              </Card>
            )}

            {/* Volume por grupo muscular */}
            <Card title="🦾 Volume por grupo muscular (90d)">
              <BarChart
                points={a.data.volumeByMuscle.slice(0, 10).map((v) => ({
                  label: muscleEmoji(v.muscle),
                  value: v.volume,
                }))}
                height={150}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {a.data.volumeByMuscle.slice(0, 6).map((v) => (
                  <span key={v.muscle} className="rounded-full border border-neutral-800 px-2 py-0.5 text-[10px] text-neutral-400">
                    {muscleEmoji(v.muscle)} {muscleLabel(v.muscle)} · {fmtNumber(v.volume)}kg
                  </span>
                ))}
              </div>
            </Card>

            {/* Ranking de volume */}
            <Card title="🏆 Ranking de volume (30d)">
              <Ranking rows={a.data.ranking} />
            </Card>

            {/* Alunos em risco */}
            <Card title="⚠️ Alunos em risco (sem treinar 7+ dias)">
              <div className="space-y-2">
                {a.data.ranking.filter((r) => daysSince(r.last_log_at) > 7).length === 0 && (
                  <p className="text-xs text-neutral-600">Todo mundo em dia. 🎉</p>
                )}
                {a.data.ranking
                  .filter((r) => daysSince(r.last_log_at) > 7)
                  .map((r) => (
                    <Link key={r.id} href={`/coach/alunos/${r.id}`} className="flex items-center gap-3 rounded-lg border border-neutral-900 p-2 transition hover:border-red-700">
                      <Avatar name={r.name} src={r.avatar_url} size={30} />
                      <span className="flex-1 truncate text-sm font-medium">{r.name}</span>
                      <span className="text-[11px] text-red-400">
                        {r.last_log_at ? `há ${daysSince(r.last_log_at)}d` : "nunca treinou"}
                      </span>
                    </Link>
                  ))}
              </div>
            </Card>

            {/* Motivos de exercícios pulados */}
            <Card title="⏭️ Por que os alunos pulam exercícios">
              <div className="space-y-1.5">
                {a.data.skippedReasons.length === 0 && (
                  <p className="text-xs text-neutral-600">Nenhum exercício pulado registrado.</p>
                )}
                {a.data.skippedReasons.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-neutral-900 px-3 py-1.5 text-sm">
                    <span className="truncate pr-2 text-neutral-300">“{s.reason}”</span>
                    <span className="font-mono text-xs text-neutral-500">{s.n}×</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </CoachShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500">{title}</h2>
      {children}
    </div>
  );
}

function Ranking({ rows }: { rows: CoachAnalytics["ranking"] }) {
  const max = Math.max(1, ...rows.map((r) => r.volume30));
  const top = rows.filter((r) => r.volume30 > 0).slice(0, 8);
  if (top.length === 0) return <p className="text-xs text-neutral-600">Sem dados nos últimos 30 dias.</p>;
  return (
    <div className="space-y-2">
      {top.map((r, i) => (
        <Link key={r.id} href={`/coach/alunos/${r.id}`} className="block">
          <div className="flex items-center justify-between text-xs">
            <span className="truncate font-medium">{i + 1}. {r.name}</span>
            <span className="font-mono text-neutral-400">{fmtNumber(r.volume30)}kg · {r.sessions}x</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-900">
            <div className="h-full rounded-full bg-red-500" style={{ width: `${(r.volume30 / max) * 100}%` }} />
          </div>
        </Link>
      ))}
    </div>
  );
}

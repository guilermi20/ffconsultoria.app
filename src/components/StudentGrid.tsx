"use client";

import Link from "next/link";
import { useApi, type StudentSummary } from "@/lib/api";
import { Avatar } from "./Avatar";
import { fmtRelative } from "@/lib/format";

export function StudentGrid({
  filter,
  emptyMsg,
}: {
  filter?: (s: StudentSummary) => boolean;
  emptyMsg?: string;
}) {
  const { data, loading, error } = useApi<StudentSummary[]>("/api/students");
  const list = (data ?? []).filter(filter ?? (() => true));

  if (loading) return <p className="text-sm text-neutral-500">Carregando…</p>;
  if (error) return <p className="text-sm text-red-300">Erro: {error}</p>;
  if (list.length === 0)
    return <p className="text-sm text-neutral-600">{emptyMsg ?? "Nenhum aluno."}</p>;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {list.map((s) => (
        <Link
          key={s.id}
          href={`/coach/alunos/${s.id}`}
          className="group rounded-xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-600"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={s.name} src={s.avatar_url} size={44} />
              <div>
                <div className="font-bold leading-tight">{s.name}</div>
                <div className="text-[11px] text-neutral-500">{s.instagram_handle}</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {!s.is_active && (
                <span className="rounded-full bg-red-950 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-red-400 ring-1 ring-red-800">
                  Inativo
                </span>
              )}
              {s.pending_videos > 0 && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
                  🎬 {s.pending_videos}
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 truncate text-xs text-neutral-400">
            📋 {s.active_plan_title ?? "Sem plano ativo"}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500">
            <span>🏋️ {s.total_logs} treinos</span>
            <span>{s.last_log_at ? `último ${fmtRelative(s.last_log_at)}` : "sem registros"}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

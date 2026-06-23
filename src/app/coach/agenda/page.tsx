"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi, type CoachCalendar } from "@/lib/api";
import CoachShell from "@/components/CoachShell";
import { Avatar } from "@/components/Avatar";
import {
  STATUS_META,
  daySeq,
  statusFor,
  mondayOf,
  addDays,
  sameDay,
  startOfToday,
  WD_SHORT,
  type WkStatus,
} from "@/lib/calendar";

type View = "mes" | "semana" | "dia";

interface Entry {
  s: CoachCalendar["schedule"][number];
  status: WkStatus;
}

export default function AgendaPage() {
  const { data, loading, error } = useApi<CoachCalendar>("/api/coach/calendar");
  const [view, setView] = useState<View>("mes");
  const [cursor, setCursor] = useState<Date>(startOfToday());

  function entriesFor(date: Date): Entry[] {
    if (!data) return [];
    const ds = daySeq(date);
    return data.schedule
      .filter((s) => s.day_sequence === ds)
      .map((s) => ({
        s,
        status: statusFor(date, s.student_id, s.workout_id, data.logs),
      }));
  }

  function shift(dir: -1 | 1) {
    if (view === "mes") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    else if (view === "semana") setCursor(addDays(cursor, dir * 7));
    else setCursor(addDays(cursor, dir));
  }

  const title =
    view === "mes"
      ? cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      : view === "semana"
        ? `Semana de ${mondayOf(cursor).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`
        : cursor.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <CoachShell>
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
            📅 Agenda
          </h1>
          <div className="flex rounded-lg border border-neutral-800 p-0.5">
            {(["mes", "semana", "dia"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition ${
                  view === v ? "bg-red-600 text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                {v === "mes" ? "Mês" : v === "semana" ? "Semana" : "Dia"}
              </button>
            ))}
          </div>
        </div>

        {/* Navegação + legenda */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => shift(-1)} className="rounded-md border border-neutral-800 px-2.5 py-1 text-sm hover:border-neutral-600">←</button>
            <span className="min-w-44 text-center text-sm font-bold capitalize">{title}</span>
            <button onClick={() => shift(1)} className="rounded-md border border-neutral-800 px-2.5 py-1 text-sm hover:border-neutral-600">→</button>
            <button onClick={() => setCursor(startOfToday())} className="ml-1 rounded-md border border-neutral-800 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:border-neutral-600">Hoje</button>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px]">
            {(Object.keys(STATUS_META) as WkStatus[]).map((k) => (
              <span key={k} className="flex items-center gap-1 text-neutral-400">
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[k].dot}`} />
                {STATUS_META[k].label}
              </span>
            ))}
          </div>
        </div>

        {loading && <p className="mt-8 text-sm text-neutral-500">Carregando agenda…</p>}
        {error && <p className="mt-8 text-sm text-red-300">Erro: {error}</p>}

        {data && view === "mes" && (
          <MonthView cursor={cursor} entriesFor={entriesFor} onPickDay={(d) => { setCursor(d); setView("dia"); }} />
        )}
        {data && view === "semana" && <WeekView cursor={cursor} entriesFor={entriesFor} />}
        {data && view === "dia" && <DayView cursor={cursor} entries={entriesFor(cursor)} />}
      </div>
    </CoachShell>
  );
}

function StatusChip({ e }: { e: Entry }) {
  return (
    <Link
      href={`/coach/alunos/${e.s.student_id}`}
      title={`${e.s.student_name} · ${e.s.target_focus} · ${STATUS_META[e.status].label}`}
      className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] ${STATUS_META[e.status].chip}`}
    >
      <span className={`h-2 w-2 flex-none rounded-full ${STATUS_META[e.status].dot}`} />
      <span className="truncate">{e.s.student_name.split(" ")[0]}</span>
    </Link>
  );
}

function MonthView({
  cursor,
  entriesFor,
  onPickDay,
}: {
  cursor: Date;
  entriesFor: (d: Date) => Entry[];
  onPickDay: (d: Date) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = mondayOf(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const today = startOfToday();

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-neutral-800">
      <div className="grid grid-cols-7 border-b border-neutral-800 bg-neutral-950">
        {WD_SHORT.map((w) => (
          <div key={w} className="px-2 py-2 text-center text-[10px] font-bold tracking-widest text-neutral-500">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          const inMonth = date.getMonth() === cursor.getMonth();
          const entries = entriesFor(date);
          const counts: Record<string, number> = {};
          entries.forEach((e) => (counts[e.status] = (counts[e.status] || 0) + 1));
          const isToday = sameDay(date, today);
          return (
            <button
              key={i}
              onClick={() => onPickDay(date)}
              className={`min-h-[78px] border-b border-r border-neutral-900 p-1.5 text-left align-top transition hover:bg-neutral-900/50 ${
                inMonth ? "" : "opacity-35"
              }`}
            >
              <div className={`text-[11px] font-bold ${isToday ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white" : "text-neutral-400"}`}>
                {date.getDate()}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {(Object.keys(counts) as WkStatus[]).map((st) => (
                  <span key={st} className={`flex items-center gap-0.5 rounded px-1 text-[9px] font-bold ${STATUS_META[st].chip}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[st].dot}`} />
                    {counts[st]}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  cursor,
  entriesFor,
}: {
  cursor: Date;
  entriesFor: (d: Date) => Entry[];
}) {
  const mon = mondayOf(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  const today = startOfToday();
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {days.map((date, i) => {
        const entries = entriesFor(date);
        const isToday = sameDay(date, today);
        return (
          <div key={i} className={`rounded-xl border p-2 ${isToday ? "border-red-700" : "border-neutral-800"} bg-neutral-950`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest text-neutral-500">{WD_SHORT[i]}</span>
              <span className={`text-xs font-bold ${isToday ? "text-red-400" : "text-neutral-300"}`}>{date.getDate()}</span>
            </div>
            <div className="space-y-1">
              {entries.length === 0 && <span className="text-[10px] text-neutral-700">—</span>}
              {entries.map((e, j) => (
                <StatusChip key={j} e={e} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({ cursor, entries }: { cursor: Date; entries: Entry[] }) {
  return (
    <div className="mt-4 space-y-2">
      {entries.length === 0 && (
        <p className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 text-center text-sm text-neutral-500">
          Nenhum treino programado para este dia.
        </p>
      )}
      {entries.map((e, i) => (
        <Link
          key={i}
          href={`/coach/alunos/${e.s.student_id}`}
          className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-3 transition hover:border-neutral-600"
        >
          <Avatar name={e.s.student_name} src={e.s.avatar_url} size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{e.s.student_name}</div>
            <div className="truncate text-[11px] text-neutral-500">{e.s.target_focus}</div>
          </div>
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_META[e.status].chip}`}>
            <span className={`h-2 w-2 rounded-full ${STATUS_META[e.status].dot}`} />
            {STATUS_META[e.status].label}
          </span>
        </Link>
      ))}
    </div>
  );
}

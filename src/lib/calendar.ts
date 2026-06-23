// Lógica de status de treino para os calendários (coach e aluno).

export type WkStatus = "concluido" | "parcial" | "pendente" | "perdido";

export const STATUS_META: Record<
  WkStatus,
  { label: string; dot: string; chip: string; emoji: string }
> = {
  concluido: {
    label: "Concluído",
    emoji: "🟢",
    dot: "bg-emerald-500",
    chip: "bg-emerald-950/40 text-emerald-300 ring-1 ring-emerald-800",
  },
  parcial: {
    label: "Parcial",
    emoji: "🟡",
    dot: "bg-amber-500",
    chip: "bg-amber-950/40 text-amber-300 ring-1 ring-amber-800",
  },
  pendente: {
    label: "Pendente",
    emoji: "⚪",
    dot: "bg-sky-500",
    chip: "bg-sky-950/40 text-sky-300 ring-1 ring-sky-800",
  },
  perdido: {
    label: "Perdido",
    emoji: "🔴",
    dot: "bg-red-600",
    chip: "bg-red-950/40 text-red-300 ring-1 ring-red-800",
  },
};

export function daySeq(d: Date): number {
  const x = d.getDay();
  return x === 0 ? 7 : x; // 1=Seg ... 7=Dom
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export interface LogLike {
  student_id: string;
  workout_id: string;
  completed_at: string;
  skipped: number;
}

export function findLog(
  date: Date,
  studentId: string,
  workoutId: string,
  logs: LogLike[]
): LogLike | undefined {
  return logs.find(
    (l) =>
      l.student_id === studentId &&
      l.workout_id === workoutId &&
      sameDay(new Date(l.completed_at), date)
  );
}

export function statusFor(
  date: Date,
  studentId: string,
  workoutId: string,
  logs: LogLike[]
): WkStatus {
  const log = findLog(date, studentId, workoutId, logs);
  if (log) return log.skipped > 0 ? "parcial" : "concluido";
  return date.getTime() < startOfToday().getTime() ? "perdido" : "pendente";
}

/** Segunda-feira da semana que contém `d`. */
export function mondayOf(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = daySeq(date) - 1;
  date.setDate(date.getDate() - diff);
  return date;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export const WD_SHORT = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

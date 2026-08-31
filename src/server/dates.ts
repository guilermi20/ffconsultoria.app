/** Utilidades de semana. A semana do check-in começa na segunda-feira. */

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Converte Date -> "YYYY-MM-DD" sem escorregar de fuso. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Segunda-feira da semana de `d`. */
export function weekStart(d: Date = new Date()): string {
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (base.getDay() + 6) % 7; // domingo(0) -> 6
  base.setDate(base.getDate() - offset);
  return toISODate(base);
}

export function addWeeks(isoWeek: string, n: number): string {
  const d = parseISODate(isoWeek);
  d.setDate(d.getDate() + n * 7);
  return toISODate(d);
}

/** Lista de semanas terminando na semana atual, da mais antiga para a mais nova. */
export function recentWeeks(count: number, from: string = weekStart()): string[] {
  return Array.from({ length: count }, (_, i) => addWeeks(from, i - (count - 1)));
}

/** "05/01 a 11/01" */
export function weekLabel(isoWeek: string): string {
  const a = parseISODate(isoWeek);
  const b = parseISODate(isoWeek);
  b.setDate(b.getDate() + 6);
  const f = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${f(a)} a ${f(b)}`;
}

/** "05/01" — rótulo curto para eixo de gráfico. */
export function weekShort(isoWeek: string): string {
  const d = parseISODate(isoWeek);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("pt-BR")} · ${DIAS[d.getDay()]} ${d
    .toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

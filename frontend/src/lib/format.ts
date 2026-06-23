const WEEKDAYS: Record<number, { full: string; short: string }> = {
  1: { full: "Segunda-feira", short: "SEG" },
  2: { full: "Terça-feira", short: "TER" },
  3: { full: "Quarta-feira", short: "QUA" },
  4: { full: "Quinta-feira", short: "QUI" },
  5: { full: "Sexta-feira", short: "SEX" },
  6: { full: "Sábado", short: "SÁB" },
  7: { full: "Domingo", short: "DOM" },
};

export function weekdayFull(day: number): string {
  return WEEKDAYS[day]?.full ?? `Dia ${day}`;
}

export function weekdayShort(day: number): string {
  return WEEKDAYS[day]?.short ?? `D${day}`;
}

/** Número no formato pt-BR (ex.: 12.430). */
export function fmtNumber(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

/** Peso com até 1 casa, sem zeros à toa (ex.: 112,5 kg / 60 kg). */
export function fmtWeight(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(v)) return "—";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/** Data absoluta curta (ex.: 18 jun, 14:30). */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

/** Tempo relativo amigável (ex.: "há 2 dias", "hoje"). */
export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diffMs / day);
  if (days <= 0) {
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    if (hours <= 0) return "agora há pouco";
    if (hours === 1) return "há 1 hora";
    return `há ${hours} horas`;
  }
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "há 1 semana";
  if (weeks < 5) return `há ${weeks} semanas`;
  const months = Math.floor(days / 30);
  return months <= 1 ? "há 1 mês" : `há ${months} meses`;
}

/** Cor/severidade do RPE para a UI. */
export function rpeTone(rpe: number | null | undefined): string {
  if (!rpe) return "text-neutral-400";
  if (rpe >= 9) return "text-red-400";
  if (rpe >= 7) return "text-amber-300";
  return "text-emerald-300";
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

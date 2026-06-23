// Metadados de grupos musculares — usados nos ícones de treino e no mapa muscular.

export interface MuscleInfo {
  label: string;
  emoji: string;
}

export const MUSCLE_META: Record<string, MuscleInfo> = {
  peito: { label: "Peito", emoji: "💥" },
  costas: { label: "Costas", emoji: "🦅" },
  ombros: { label: "Ombros", emoji: "🔺" },
  biceps: { label: "Bíceps", emoji: "💪" },
  triceps: { label: "Tríceps", emoji: "🦾" },
  antebraco: { label: "Antebraço", emoji: "✊" },
  trapezio: { label: "Trapézio", emoji: "🔻" },
  lombar: { label: "Lombar", emoji: "🧱" },
  abdomen: { label: "Abdômen", emoji: "🎯" },
  quadriceps: { label: "Quadríceps", emoji: "🦵" },
  posterior: { label: "Posterior", emoji: "🦵" },
  gluteos: { label: "Glúteos", emoji: "🍑" },
  panturrilha: { label: "Panturrilha", emoji: "🦶" },
  adutores: { label: "Adutores", emoji: "🦵" },
  abdutores: { label: "Abdutores", emoji: "🦵" },
  cardio: { label: "Cardio", emoji: "🔥" },
};

export const MUSCLE_OPTIONS = Object.entries(MUSCLE_META).map(([key, m]) => ({
  key,
  ...m,
}));

export function muscleLabel(g?: string | null): string {
  if (!g) return "Geral";
  return MUSCLE_META[g]?.label ?? g;
}

export function muscleEmoji(g?: string | null): string {
  if (!g) return "🏋️";
  return MUSCLE_META[g]?.emoji ?? "🏋️";
}

interface HasGroup {
  muscle_group?: string | null;
}

/** Conta exercícios por grupo muscular. */
export function muscleCounts(exs: HasGroup[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const e of exs) {
    if (e.muscle_group) c[e.muscle_group] = (c[e.muscle_group] || 0) + 1;
  }
  return c;
}

/** Grupo muscular mais trabalhado no treino (dinâmico). */
export function dominantMuscle(exs: HasGroup[]): string | null {
  const c = muscleCounts(exs);
  let best: string | null = null;
  let n = 0;
  for (const k in c) {
    if (c[k] > n) {
      n = c[k];
      best = k;
    }
  }
  return best;
}

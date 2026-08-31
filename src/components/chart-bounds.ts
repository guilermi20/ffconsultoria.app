import type { Question } from "@/server/types";

/**
 * Eixo Y a partir do tipo da pergunta:
 * - escala  → 0 a 10 fixos, para comparar semanas sem o eixo "dançar";
 * - sim/não → 0 a 1 com uma única divisão, senão o eixo vira 0,3 / 0,5 / 0,8;
 * - número  → domínio calculado a partir dos próprios dados.
 */
export function chartBounds(question: Question): {
  min: number | null;
  max: number | null;
  tickCount: number;
} {
  if (question.type === "escala") return { min: 0, max: 10, tickCount: 4 };
  if (question.type === "sim_nao") return { min: 0, max: 1, tickCount: 1 };
  return { min: null, max: null, tickCount: 4 };
}

// Gamificação — equivalências de peso movido no treino.
// Cada item tem um peso unitário (kg), emoji e nome (sing/plural).

interface Equiv {
  unit: number; // kg de uma unidade
  emoji: string;
  singular: string;
  plural: string;
}

// ~50 equivalências, do mais leve ao mais pesado.
const EQUIVALENCES: Equiv[] = [
  { unit: 4.5, emoji: "🐈", singular: "gato", plural: "gatos" },
  { unit: 8, emoji: "🎳", singular: "bola de boliche", plural: "bolas de boliche" },
  { unit: 12, emoji: "🛞", singular: "pneu de carro", plural: "pneus de carro" },
  { unit: 18, emoji: "💧", singular: "galão de água", plural: "galões de água" },
  { unit: 25, emoji: "🐕", singular: "bulldog", plural: "bulldogs" },
  { unit: 30, emoji: "🧒", singular: "criança", plural: "crianças" },
  { unit: 40, emoji: "🎸", singular: "amplificador de palco", plural: "amplificadores de palco" },
  { unit: 50, emoji: "🧱", singular: "saco de cimento", plural: "sacos de cimento" },
  { unit: 60, emoji: "🛗", singular: "cofre pequeno", plural: "cofres pequenos" },
  { unit: 75, emoji: "🧍", singular: "pessoa adulta", plural: "pessoas adultas" },
  { unit: 90, emoji: "🧊", singular: "geladeira", plural: "geladeiras" },
  { unit: 100, emoji: "🛋️", singular: "sofá", plural: "sofás" },
  { unit: 110, emoji: "🐼", singular: "panda", plural: "pandas" },
  { unit: 130, emoji: "🦤", singular: "avestruz", plural: "avestruzes" },
  { unit: 150, emoji: "🐬", singular: "golfinho", plural: "golfinhos" },
  { unit: 180, emoji: "🦍", singular: "gorila", plural: "gorilas" },
  { unit: 200, emoji: "🏍️", singular: "motocicleta", plural: "motocicletas" },
  { unit: 220, emoji: "🐅", singular: "tigre", plural: "tigres" },
  { unit: 250, emoji: "🦓", singular: "zebra", plural: "zebras" },
  { unit: 300, emoji: "🎹", singular: "piano de cauda", plural: "pianos de cauda" },
  { unit: 350, emoji: "🐻", singular: "urso-pardo", plural: "ursos-pardos" },
  { unit: 450, emoji: "🐻‍❄️", singular: "urso-polar", plural: "ursos-polares" },
  { unit: 500, emoji: "🐎", singular: "cavalo", plural: "cavalos" },
  { unit: 600, emoji: "🐫", singular: "camelo", plural: "camelos" },
  { unit: 700, emoji: "🐄", singular: "vaca", plural: "vacas" },
  { unit: 800, emoji: "🐂", singular: "touro", plural: "touros" },
  { unit: 900, emoji: "🚗", singular: "carro popular", plural: "carros populares" },
  { unit: 1000, emoji: "🦬", singular: "bisão", plural: "bisões" },
  { unit: 1200, emoji: "🦒", singular: "girafa", plural: "girafas" },
  { unit: 1500, emoji: "🦛", singular: "hipopótamo", plural: "hipopótamos" },
  { unit: 1800, emoji: "🚙", singular: "SUV", plural: "SUVs" },
  { unit: 2300, emoji: "🦏", singular: "rinoceronte", plural: "rinocerontes" },
  { unit: 2700, emoji: "🛻", singular: "caminhonete", plural: "caminhonetes" },
  { unit: 3500, emoji: "🚐", singular: "van", plural: "vans" },
  { unit: 4000, emoji: "🦣", singular: "mamute", plural: "mamutes" },
  { unit: 5400, emoji: "🐘", singular: "elefante africano", plural: "elefantes africanos" },
  { unit: 7000, emoji: "🦕", singular: "dinossauro", plural: "dinossauros" },
  { unit: 8000, emoji: "🦖", singular: "T-Rex", plural: "T-Rex" },
  { unit: 11000, emoji: "🚌", singular: "ônibus", plural: "ônibus" },
  { unit: 15000, emoji: "🚛", singular: "caminhão", plural: "caminhões" },
  { unit: 20000, emoji: "🏠", singular: "casa pré-fabricada", plural: "casas pré-fabricadas" },
  { unit: 30000, emoji: "🦕", singular: "braquiossauro", plural: "braquiossauros" },
  { unit: 40000, emoji: "🚜", singular: "trator agrícola", plural: "tratores agrícolas" },
  { unit: 60000, emoji: "🛡️", singular: "tanque de guerra", plural: "tanques de guerra" },
  { unit: 80000, emoji: "🚀", singular: "ônibus espacial", plural: "ônibus espaciais" },
  { unit: 100000, emoji: "🚂", singular: "locomotiva", plural: "locomotivas" },
  { unit: 130000, emoji: "✈️", singular: "avião comercial", plural: "aviões comerciais" },
  { unit: 150000, emoji: "🐳", singular: "baleia-azul", plural: "baleias-azuis" },
  { unit: 200000, emoji: "🗿", singular: "estátua de pedra", plural: "estátuas de pedra" },
  { unit: 400000, emoji: "🏟️", singular: "arquibancada lotada", plural: "arquibancadas lotadas" },
];

export interface EquivalenceResult {
  emoji: string;
  count: number;
  countLabel: string;
  noun: string;
  phrase: string;
}

function fmtCount(n: number): string {
  if (n >= 10) return String(Math.round(n));
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/** Escolhe a equivalência mais impressionante para a tonelagem dada. */
export function pickEquivalence(tonnage: number): EquivalenceResult | null {
  if (!tonnage || tonnage <= 0) return null;

  // Maior unidade cujo "count" ainda seja >= 1 (comparação mais impressionante).
  const sorted = [...EQUIVALENCES].sort((a, b) => b.unit - a.unit);
  let chosen = sorted[sorted.length - 1]; // menor, fallback
  for (const e of sorted) {
    if (tonnage / e.unit >= 1) {
      chosen = e;
      break;
    }
  }

  const count = tonnage / chosen.unit;
  const noun = count >= 2 ? chosen.plural : chosen.singular;
  const countLabel = fmtCount(count);

  return {
    emoji: chosen.emoji,
    count,
    countLabel,
    noun,
    phrase: `Você moveu o equivalente a ${countLabel} ${noun} hoje!`,
  };
}

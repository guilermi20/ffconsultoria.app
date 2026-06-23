"use client";

import { muscleCounts, muscleEmoji, muscleLabel } from "@/lib/muscles";

interface Shape {
  group: string;
  el: "rect" | "ellipse";
  // rect: x,y,w,h,(r); ellipse: cx,cy,rx,ry
  a: number;
  b: number;
  c: number;
  d: number;
  r?: number;
}

// Silhueta aproximada — frente
const FRONT: Shape[] = [
  { group: "ombros", el: "ellipse", a: 38, b: 44, c: 11, d: 8 },
  { group: "ombros", el: "ellipse", a: 72, b: 44, c: 11, d: 8 },
  { group: "peito", el: "rect", a: 41, b: 44, c: 12, d: 13, r: 4 },
  { group: "peito", el: "rect", a: 57, b: 44, c: 12, d: 13, r: 4 },
  { group: "biceps", el: "ellipse", a: 31, b: 60, c: 6, d: 12 },
  { group: "biceps", el: "ellipse", a: 79, b: 60, c: 6, d: 12 },
  { group: "abdomen", el: "rect", a: 47, b: 59, c: 16, d: 24, r: 4 },
  { group: "antebraco", el: "ellipse", a: 27, b: 84, c: 5, d: 12 },
  { group: "antebraco", el: "ellipse", a: 83, b: 84, c: 5, d: 12 },
  { group: "adutores", el: "rect", a: 52, b: 96, c: 6, d: 26, r: 3 },
  { group: "quadriceps", el: "rect", a: 43, b: 92, c: 10, d: 34, r: 5 },
  { group: "quadriceps", el: "rect", a: 57, b: 92, c: 10, d: 34, r: 5 },
  { group: "panturrilha", el: "rect", a: 44, b: 132, c: 9, d: 28, r: 4 },
  { group: "panturrilha", el: "rect", a: 57, b: 132, c: 9, d: 28, r: 4 },
];

// Silhueta aproximada — costas
const BACK: Shape[] = [
  { group: "trapezio", el: "rect", a: 44, b: 36, c: 22, d: 10, r: 4 },
  { group: "ombros", el: "ellipse", a: 38, b: 46, c: 10, d: 7 },
  { group: "ombros", el: "ellipse", a: 72, b: 46, c: 10, d: 7 },
  { group: "costas", el: "rect", a: 42, b: 46, c: 26, d: 20, r: 5 },
  { group: "triceps", el: "ellipse", a: 31, b: 60, c: 6, d: 12 },
  { group: "triceps", el: "ellipse", a: 79, b: 60, c: 6, d: 12 },
  { group: "lombar", el: "rect", a: 47, b: 66, c: 16, d: 12, r: 3 },
  { group: "gluteos", el: "rect", a: 44, b: 80, c: 22, d: 13, r: 6 },
  { group: "posterior", el: "rect", a: 44, b: 95, c: 10, d: 31, r: 5 },
  { group: "posterior", el: "rect", a: 56, b: 95, c: 10, d: 31, r: 5 },
  { group: "panturrilha", el: "rect", a: 44, b: 132, c: 9, d: 28, r: 4 },
  { group: "panturrilha", el: "rect", a: 57, b: 132, c: 9, d: 28, r: 4 },
];

function colorFor(group: string, counts: Record<string, number>, max: number) {
  const c = counts[group] || 0;
  if (!c) return "#171717";
  const op = max <= 1 ? 0.85 : 0.45 + (c / max) * 0.55;
  return `rgba(239,68,68,${op.toFixed(2)})`;
}

function Body({
  shapes,
  counts,
  max,
  label,
}: {
  shapes: Shape[];
  counts: Record<string, number>;
  max: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 110 172" className="h-44 w-auto">
        {/* cabeça + tronco base (silhueta) */}
        <circle cx="55" cy="18" r="11" fill="#0f0f0f" stroke="#262626" />
        <rect x="40" y="40" width="30" height="48" rx="10" fill="#0d0d0d" />
        {shapes.map((s, i) =>
          s.el === "rect" ? (
            <rect
              key={i}
              x={s.a}
              y={s.b}
              width={s.c}
              height={s.d}
              rx={s.r ?? 3}
              fill={colorFor(s.group, counts, max)}
              stroke="#000"
              strokeWidth="0.5"
            />
          ) : (
            <ellipse
              key={i}
              cx={s.a}
              cy={s.b}
              rx={s.c}
              ry={s.d}
              fill={colorFor(s.group, counts, max)}
              stroke="#000"
              strokeWidth="0.5"
            />
          )
        )}
      </svg>
      <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
        {label}
      </span>
    </div>
  );
}

export function BodyMap({
  exercises,
  compact = false,
}: {
  exercises: { muscle_group?: string | null }[];
  compact?: boolean;
}) {
  const counts = muscleCounts(exercises);
  const max = Math.max(1, ...Object.values(counts));
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div>
      <div className="flex items-start justify-center gap-4">
        <Body shapes={FRONT} counts={counts} max={max} label="Frente" />
        <Body shapes={BACK} counts={counts} max={max} label="Costas" />
      </div>
      {!compact && top.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {top.map(([g, n]) => (
            <span
              key={g}
              className="rounded-full border border-red-900/60 bg-red-950/30 px-2 py-0.5 text-[10px] font-medium text-red-300"
            >
              {muscleEmoji(g)} {muscleLabel(g)} · {n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

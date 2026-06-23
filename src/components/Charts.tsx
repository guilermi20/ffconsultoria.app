"use client";

import { fmtNumber } from "@/lib/format";

export interface Point {
  label: string;
  value: number;
}

const RED = "#ef4444";

/** Gráfico de evolução (linha + área) em SVG, sem dependências. */
export function EvolutionChart({
  points,
  height = 130,
  unit = "kg",
}: {
  points: Point[];
  height?: number;
  unit?: string;
}) {
  if (!points || points.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-neutral-600">
        Sem dados suficientes para o gráfico ainda.
      </p>
    );
  }

  const W = 620;
  const H = height;
  const pad = 10;
  const values = points.map((p) => p.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const n = points.length;
  const x = (i: number) =>
    n === 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (n - 1);
  const y = (v: number) => H - pad - ((v - min) / range) * (H - 2 * pad);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${x(n - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`;
  const last = points[n - 1].value;
  const first = points[0].value;
  const delta = last - first;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height }}
      >
        <defs>
          <linearGradient id="evoFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={RED} stopOpacity="0.35" />
            <stop offset="100%" stopColor={RED} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#evoFill)" />
        <path
          d={linePath}
          fill="none"
          stroke={RED}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.value)}
            r={i === n - 1 ? 4.5 : 2.5}
            fill={i === n - 1 ? "#fff" : RED}
            stroke={i === n - 1 ? RED : "none"}
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-neutral-500">
        <span>{points[0].label}</span>
        <span
          className={
            delta >= 0 ? "font-bold text-emerald-400" : "font-bold text-red-400"
          }
        >
          {delta >= 0 ? "▲" : "▼"} {fmtNumber(Math.abs(delta))} {unit}
        </span>
        <span>{points[n - 1].label}</span>
      </div>
    </div>
  );
}

/** Barras (ex.: volume por semana). */
export function BarChart({
  points,
  height = 130,
  unit = "kg",
}: {
  points: Point[];
  height?: number;
  unit?: string;
}) {
  if (!points || points.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-neutral-600">Sem dados.</p>
    );
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {points.map((p, i) => {
          const h = Math.max(2, (p.value / max) * (height - 18));
          const isLast = i === points.length - 1;
          return (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div
                className={`w-full rounded-t ${isLast ? "bg-red-500" : "bg-red-500/40"}`}
                style={{ height: h }}
                title={`${fmtNumber(p.value)} ${unit}`}
              />
              <span className="text-[8px] text-neutral-600">{p.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

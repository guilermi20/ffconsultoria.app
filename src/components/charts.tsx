"use client";

import { useMemo, useRef, useState } from "react";

export type Point = { week: string; value: number };

const W = 640;
const H = 200;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

function shortWeek(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** Domínio arredondado para valores "redondos", com folga de 8% nos extremos. */
function domain(values: number[], min?: number | null, max?: number | null) {
  if (min != null && max != null) return [min, max] as const;
  if (values.length === 0) return [0, 1] as const;

  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.1 || 1;
    lo -= pad;
    hi += pad;
  } else {
    const pad = (hi - lo) * 0.08;
    lo -= pad;
    hi += pad;
  }
  if (min != null) lo = min;
  if (max != null) hi = max;
  return [lo, hi] as const;
}

function ticks(lo: number, hi: number, count = 4): number[] {
  const step = (hi - lo) / count;
  return Array.from({ length: count + 1 }, (_, i) => lo + step * i);
}

function fmt(value: number, unit?: string | null): string {
  const rounded =
    Math.abs(value) >= 100 || Number.isInteger(value)
      ? value.toFixed(0)
      : value.toFixed(1);
  return unit ? `${rounded} ${unit}` : rounded;
}

/**
 * Linha de evolução. Uma série por gráfico — o título nomeia a série, então
 * não há legenda; o hover mostra semana e valor.
 */
export function LineChart({
  points,
  unit,
  min,
  max,
  color = "var(--series-1)",
  label,
  tickCount = 4,
}: {
  points: Point[];
  unit?: string | null;
  min?: number | null;
  max?: number | null;
  color?: string;
  label: string;
  /** Divisões do eixo Y. Use 1 em métricas 0/1 para não gerar decimais. */
  tickCount?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const geometry = useMemo(() => {
    const values = points.map((p) => p.value);
    const [lo, hi] = domain(values, min, max);
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    const x = (i: number) =>
      points.length <= 1
        ? PAD.left + innerW / 2
        : PAD.left + (i / (points.length - 1)) * innerW;
    const y = (v: number) =>
      PAD.top + innerH - ((v - lo) / (hi - lo || 1)) * innerH;

    const coords = points.map((p, i) => ({ x: x(i), y: y(p.value), ...p }));
    const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
    const area =
      coords.length > 0
        ? `M ${coords[0].x},${PAD.top + innerH} ` +
          coords.map((c) => `L ${c.x},${c.y}`).join(" ") +
          ` L ${coords[coords.length - 1].x},${PAD.top + innerH} Z`
        : "";

    return { lo, hi, coords, line, area, y, baseline: PAD.top + innerH };
  }, [points, min, max]);

  if (points.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-xs text-neutral-600">
        Sem dados ainda
      </div>
    );
  }

  const gradientId = `g-${label.replace(/\W+/g, "")}`;
  const active = hover != null ? geometry.coords[hover] : null;
  const last = geometry.coords[geometry.coords.length - 1];

  function onMove(event: React.PointerEvent<SVGRectElement>) {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    const svgX = ((event.clientX - box.left) / box.width) * W;
    let nearest = 0;
    let best = Infinity;
    geometry.coords.forEach((c, i) => {
      const d = Math.abs(c.x - svgX);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHover(nearest);
  }

  return (
    <div ref={wrapRef} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Evolução de ${label}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grade recessiva */}
        {ticks(geometry.lo, geometry.hi, tickCount).map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={geometry.y(t)}
              y2={geometry.y(t)}
              stroke="var(--grid)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={geometry.y(t) + 4}
              textAnchor="end"
              fontSize="10"
              fill="var(--text-muted)"
            >
              {Math.abs(t) >= 100 ? t.toFixed(0) : t.toFixed(1).replace(/\.0$/, "")}
            </text>
          </g>
        ))}

        {geometry.coords.length > 1 ? (
          <path d={geometry.area} fill={`url(#${gradientId})`} />
        ) : null}

        <polyline
          points={geometry.line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Marcadores com anel na superfície, para não colarem na linha */}
        {geometry.coords.map((c, i) => (
          <circle
            key={c.week}
            cx={c.x}
            cy={c.y}
            r={hover === i ? 5 : 4}
            fill={color}
            stroke="var(--surface-1)"
            strokeWidth="2"
          />
        ))}

        {/* Rótulo direto apenas no último ponto — nunca um número em cada ponto */}
        {!active && last ? (
          <text
            x={Math.min(last.x + 8, W - PAD.right)}
            y={Math.max(last.y - 10, PAD.top + 8)}
            textAnchor={last.x > W - 80 ? "end" : "start"}
            fontSize="11"
            fontWeight="700"
            fill="var(--text-primary)"
          >
            {fmt(last.value, unit)}
          </text>
        ) : null}

        {/* Eixo X: primeira, meio e última semana */}
        {geometry.coords.map((c, i) => {
          const step = Math.max(1, Math.ceil(geometry.coords.length / 6));
          if (i % step !== 0 && i !== geometry.coords.length - 1) return null;
          return (
            <text
              key={`x-${c.week}`}
              x={c.x}
              y={H - 8}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-muted)"
            >
              {shortWeek(c.week)}
            </text>
          );
        })}

        {active ? (
          <line
            x1={active.x}
            x2={active.x}
            y1={PAD.top}
            y2={geometry.baseline}
            stroke="var(--text-muted)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        ) : null}

        <rect
          x={0}
          y={0}
          width={W}
          height={H}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>

      {active ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-neutral-800 bg-black/95 px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: `${(active.x / W) * 100}%`, top: 0 }}
        >
          <p className="font-mono text-[10px] text-neutral-500">
            semana de {shortWeek(active.week)}
          </p>
          <p className="font-bold text-white">{fmt(active.value, unit)}</p>
        </div>
      ) : null}

      <details className="mt-2 text-xs text-neutral-600">
        <summary className="cursor-pointer select-none hover:text-neutral-400">
          Ver dados
        </summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-neutral-600">
              <th className="py-1 font-medium">Semana</th>
              <th className="py-1 font-medium">{label}</th>
            </tr>
          </thead>
          <tbody className="text-neutral-400">
            {points.map((p) => (
              <tr key={p.week}>
                <td className="py-0.5 font-mono">{shortWeek(p.week)}</td>
                <td className="py-0.5 tabular-nums">{fmt(p.value, unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/**
 * Barras de aderência semanal (0–100%). Extremidades arredondadas em 4px
 * ancoradas na linha de base, com 2px de respiro entre as barras.
 */
export function BarChart({
  points,
  unit = "%",
  max = 100,
}: {
  points: Point[];
  unit?: string;
  max?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-xs text-neutral-600">
        Sem dados ainda
      </div>
    );
  }

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / points.length;
  const barW = Math.max(6, slot - 8);
  const baseline = PAD.top + innerH;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Taxa de resposta por semana"
      >
        {[0, 25, 50, 75, 100].map((t) => {
          const y = baseline - (t / max) * innerH;
          return (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                stroke="var(--grid)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="var(--text-muted)"
              >
                {t}
              </text>
            </g>
          );
        })}

        {points.map((p, i) => {
          const h = Math.max(2, (p.value / max) * innerH);
          const x = PAD.left + slot * i + (slot - barW) / 2;
          return (
            <g
              key={p.week}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            >
              <rect
                x={x}
                y={baseline - h}
                width={barW}
                height={h}
                rx={4}
                fill="var(--series-1)"
                opacity={hover === null || hover === i ? 1 : 0.55}
              />
              <rect
                x={PAD.left + slot * i}
                y={PAD.top}
                width={slot}
                height={innerH}
                fill="transparent"
              />
              {i % Math.max(1, Math.ceil(points.length / 6)) === 0 ||
              i === points.length - 1 ? (
                <text
                  x={x + barW / 2}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--text-muted)"
                >
                  {shortWeek(p.week)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {hover != null ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-neutral-800 bg-black/95 px-2.5 py-1.5 text-xs shadow-lg"
          style={{
            left: `${((PAD.left + slot * hover + slot / 2) / W) * 100}%`,
            top: 0,
          }}
        >
          <p className="font-mono text-[10px] text-neutral-500">
            semana de {shortWeek(points[hover].week)}
          </p>
          <p className="font-bold text-white">
            {points[hover].value}
            {unit}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Sparkline de tabela: forma da tendência ao lado do valor, que fica em texto. */
export function Sparkline({
  points,
  width = 96,
  height = 26,
}: {
  points: Point[];
  width?: number;
  height?: number;
}) {
  if (points.length < 2) {
    return <span className="text-xs text-neutral-700">—</span>;
  }
  const values = points.map((p) => p.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * (width - 4) + 2;
    const y = height - 3 - ((p.value - lo) / span) * (height - 6);
    return `${x},${y}`;
  });
  const [lastX, lastY] = coords[coords.length - 1].split(",").map(Number);

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="var(--series-1)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={lastX}
        cy={lastY}
        r="3"
        fill="var(--series-1)"
        stroke="var(--surface-1)"
        strokeWidth="2"
      />
    </svg>
  );
}

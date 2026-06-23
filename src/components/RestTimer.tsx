"use client";

import { useEffect, useState } from "react";

export function RestTimer({
  seconds,
  onDone,
  label = "entre séries",
}: {
  seconds: number;
  onDone: () => void;
  label?: string;
}) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (left <= 0) {
      onDone();
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const pct = seconds > 0 ? ((seconds - left) / seconds) * 100 : 100;
  const mm = Math.floor(left / 60);
  const ss = left % 60;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="text-[11px] font-bold uppercase tracking-[0.4em] text-neutral-500">
        Descanso {label}
      </div>
      <div className="relative mt-6 flex h-44 w-44 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#1a1a1a" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="#ef4444"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 276.46} 276.46`}
          />
        </svg>
        <span className="font-mono text-4xl font-black">
          {mm > 0 ? `${mm}:${String(ss).padStart(2, "0")}` : ss}
        </span>
      </div>
      <div className="mt-8 flex gap-2">
        <button
          onClick={() => setLeft((l) => l + 15)}
          className="rounded-lg border border-neutral-800 px-4 py-2 text-xs font-bold uppercase tracking-widest text-neutral-300 hover:border-neutral-600"
        >
          +15s
        </button>
        <button
          onClick={onDone}
          className="rounded-lg bg-white px-6 py-2 text-xs font-black uppercase tracking-widest text-black hover:bg-neutral-200"
        >
          Pular descanso →
        </button>
      </div>
    </div>
  );
}

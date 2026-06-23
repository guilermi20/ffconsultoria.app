"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { fmtNumber } from "@/lib/format";

export function PumpCard({
  photo,
  emoji,
  phrase,
  tonnage,
}: {
  photo: string;
  emoji: string;
  phrase: string;
  tonnage: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  async function download() {
    if (!ref.current) return;
    setLoading(true);
    try {
      const dataUrl = await toPng(ref.current, {
        pixelRatio: 3,
        backgroundColor: undefined,
      });
      const link = document.createElement("a");
      link.download = "teamff-pump.png";
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div
        ref={ref}
        className="relative w-[300px] overflow-hidden rounded-2xl"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="pump" className="h-[420px] w-full object-cover" />
        {/* overlay com a equivalência */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 pt-16 text-center">
          <div className="text-5xl leading-none">{emoji}</div>
          <p className="mt-2 text-sm font-black uppercase leading-tight tracking-tight text-white">
            {phrase}
          </p>
          <p className="mt-1 font-mono text-xs text-red-400">
            {fmtNumber(tonnage)} KG MOVIDOS
          </p>
          <p className="mt-2 text-[8px] font-bold uppercase tracking-[0.3em] text-neutral-300">
            TEAM FF • @teamff.consultoria
          </p>
        </div>
      </div>
      <button
        onClick={download}
        disabled={loading}
        className="mt-4 rounded-lg bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-black hover:bg-neutral-200 disabled:opacity-50"
      >
        {loading ? "Gerando…" : "📸 Baixar card do pump"}
      </button>
    </div>
  );
}

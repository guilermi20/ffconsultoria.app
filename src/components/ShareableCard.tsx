"use client";

import React, { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { fmtNumber, fmtWeight } from "@/lib/format";

export interface ShareExercise {
  name: string;
  sets: number;
  reps: string;
  weight: number;
}

export interface ShareableCardData {
  title: string;
  dayOfWeek: string;
  instagram: string;
  exercises: ShareExercise[];
  totalTonnage: number;
}

/**
 * Cartão de Stories (estilo Strava) — Módulo 4 da arquitetura.
 * Persistência ZERO: a customização do título é volátil (só no estado local)
 * e o PNG é gerado em tempo real com fundo transparente (canal alpha).
 */
export default function ShareableCard({ data }: { data: ShareableCardData }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const displayTitle = isCustom
    ? customTitle || "TREINO DE FORÇA"
    : data.title;

  const handleDownloadPng = async () => {
    if (cardRef.current === null) return;
    setLoading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        canvasWidth: 432,
        canvasHeight: 768,
        pixelRatio: 3,
        backgroundColor: undefined, // canal alpha → fundo transparente
      });
      const link = document.createElement("a");
      const slug = displayTitle.toLowerCase().replace(/\s+/g, "-");
      link.download = `teamff-${slug}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Erro ao gerar o PNG transparente:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Controles de customização volátil (não persistidos no DB) */}
      <div className="mb-4 w-full max-w-[360px] flex flex-col space-y-2 text-xs">
        <label className="text-neutral-400 font-bold uppercase tracking-wider">
          Título do card
        </label>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsCustom(false)}
            className={`px-3 py-1 rounded font-bold transition ${
              !isCustom ? "bg-white text-black" : "bg-neutral-900 text-white"
            }`}
          >
            Padrão
          </button>
          <button
            onClick={() => setIsCustom(true)}
            className={`px-3 py-1 rounded font-bold transition ${
              isCustom ? "bg-white text-black" : "bg-neutral-900 text-white"
            }`}
          >
            Personalizado
          </button>
        </div>
        {isCustom && (
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Digite o título do treino..."
            className="w-full bg-neutral-900 border border-neutral-800 text-white rounded p-2 text-xs focus:outline-none focus:border-neutral-500"
          />
        )}
      </div>

      {/* CARD (fundo transparente no download) */}
      <div
        ref={cardRef}
        className="relative w-[360px] h-[640px] text-white p-6 flex flex-col justify-between overflow-hidden select-none border border-dashed border-neutral-800"
        style={{ backgroundColor: "transparent" }}
      >
        <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none opacity-[0.03] tracking-[12px] font-black text-center text-4xl leading-none">
          <p>HYBRID</p>
          <p>TRAINING</p>
        </div>

        <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <span className="text-[10px] tracking-[3px] font-bold text-neutral-400 uppercase">
                TEAM FF | CONSULTORIA
              </span>
              <span className="text-[9px] tracking-[1px] font-medium text-neutral-300 bg-neutral-900 px-2 py-0.5 rounded">
                {data.dayOfWeek}
              </span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-white mt-4 uppercase leading-tight">
              {displayTitle}
            </h1>
          </div>

          <div className="flex-1 my-6 flex flex-col justify-center space-y-3.5">
            {data.exercises.map((exercise, index) => (
              <div
                key={index}
                className="flex justify-between items-end border-b border-neutral-900/80 pb-1.5"
              >
                <span className="text-[11px] font-medium text-neutral-300 uppercase tracking-wide pr-2">
                  {exercise.name}
                </span>
                <div className="text-right whitespace-nowrap">
                  <span className="text-[10px] font-mono text-white font-bold bg-neutral-900 px-1.5 py-0.5 rounded">
                    {exercise.sets}x{exercise.reps}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-neutral-200 ml-2">
                    {fmtWeight(exercise.weight)} KG
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-800 pt-4 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[9px] tracking-wider text-neutral-500 uppercase font-bold">
                  Volume total movido
                </span>
                <span className="text-2xl font-black tracking-tight text-white font-mono">
                  {fmtNumber(data.totalTonnage)}{" "}
                  <span className="text-xs font-normal text-neutral-400">
                    KG
                  </span>
                </span>
              </div>
              <div className="text-right text-[9px] tracking-widest text-neutral-400 font-black">
                <p>HYBRID</p>
                <p>TRAINING</p>
              </div>
            </div>
            <div className="flex justify-between items-center text-[8px] text-neutral-500 tracking-[1.5px] font-bold uppercase pt-1">
              <span>PERFORMANCE • ESTÉTICA • DISCIPLINA</span>
              <span className="text-neutral-300 lowercase text-[9px] font-medium">
                {data.instagram}
              </span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleDownloadPng}
        disabled={loading}
        className="mt-6 px-6 py-2.5 bg-white text-black font-bold text-xs tracking-widest uppercase rounded shadow-lg hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-50"
      >
        {loading ? "GERANDO IMAGEM..." : "Baixar PNG sem fundo"}
      </button>
      <p className="mt-2 text-[10px] text-neutral-600 max-w-[280px] text-center">
        PNG gerado em tempo real, fundo transparente. Nada é armazenado — gere
        quantas vezes quiser.
      </p>
    </div>
  );
}

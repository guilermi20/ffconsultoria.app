"use client";

import { useState } from "react";
import Link from "next/link";
import type { Question } from "@/server/types";

export default function CheckinForm({
  token,
  questions,
  firstName,
  alreadyAnswered,
}: {
  token: string;
  questions: Question[];
  firstName: string;
  alreadyAnswered: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string | number>>(() => {
    // Escalas começam no meio para não induzir nota alta nem baixa.
    const initial: Record<string, string | number> = {};
    for (const q of questions) if (q.type === "escala") initial[q.id] = 5;
    return initial;
  });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(id: string, value: string | number) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);

    const res = await fetch(`/api/checkin/${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers }),
    });

    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível enviar. Tente novamente.");
      return;
    }
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (done) {
    return (
      <div className="animate-pop rounded-2xl border border-[#199e70]/40 bg-[#199e70]/5 p-8 text-center">
        <p className="text-4xl">✅</p>
        <h2 className="mt-4 text-xl font-black text-white">Check-in enviado!</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Valeu, {firstName}. O Fábio já recebeu suas respostas.
        </p>
        <Link
          href={`/aluno/${token}`}
          className="mt-6 inline-block rounded-lg bg-red-600 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-red-500"
        >
          Ver minha evolução
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {alreadyAnswered ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-xs text-neutral-400">
          Você já respondeu o check-in desta semana. Se enviar de novo, as
          respostas anteriores serão substituídas.
        </p>
      ) : null}

      {questions.map((question) => (
        <div
          key={question.id}
          className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5"
        >
          <label className="block">
            <span className="block text-sm font-semibold text-white">
              {question.label}
              {question.required ? <span className="ml-1 text-red-500">*</span> : null}
            </span>
            {question.help ? (
              <span className="mt-1 block text-xs text-neutral-500">
                {question.help}
              </span>
            ) : null}

            <div className="mt-4">
              {question.type === "escala" ? (
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black tabular-nums text-white">
                      {answers[question.id] ?? 5}
                    </span>
                    <span className="text-xs text-neutral-600">0 a 10</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={Number(answers[question.id] ?? 5)}
                    onChange={(e) => set(question.id, Number(e.target.value))}
                    className="mt-3 w-full"
                  />
                </div>
              ) : question.type === "numero" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    required={question.required}
                    value={String(answers[question.id] ?? "")}
                    onChange={(e) => set(question.id, e.target.value)}
                    placeholder="0"
                    className="w-32 rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-lg font-bold tabular-nums text-white outline-none focus:border-red-600"
                  />
                  {question.unit ? (
                    <span className="text-sm text-neutral-500">{question.unit}</span>
                  ) : null}
                </div>
              ) : question.type === "sim_nao" ? (
                <div className="flex gap-2">
                  {[
                    { value: "1", label: "Sim" },
                    { value: "0", label: "Não" },
                  ].map((option) => {
                    const selected = String(answers[question.id] ?? "") === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => set(question.id, option.value)}
                        className={`rounded-lg border px-5 py-2 text-sm font-semibold transition ${
                          selected
                            ? "border-red-600 bg-red-600 text-white"
                            : "border-neutral-800 bg-black text-neutral-400 hover:text-white"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : question.type === "escolha" ? (
                <div className="flex flex-wrap gap-2">
                  {question.options.map((option) => {
                    const selected = answers[question.id] === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => set(question.id, option)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                          selected
                            ? "border-red-600 bg-red-600 text-white"
                            : "border-neutral-800 bg-black text-neutral-400 hover:text-white"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : question.type === "texto_longo" ? (
                <textarea
                  rows={4}
                  required={question.required}
                  value={String(answers[question.id] ?? "")}
                  onChange={(e) => set(question.id, e.target.value)}
                  className="w-full resize-y rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-700 focus:border-red-600"
                  placeholder="Escreva aqui..."
                />
              ) : (
                <input
                  type="text"
                  required={question.required}
                  value={String(answers[question.id] ?? "")}
                  onChange={(e) => set(question.id, e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-700 focus:border-red-600"
                  placeholder="Sua resposta"
                />
              )}
            </div>
          </label>
        </div>
      ))}

      {error ? (
        <p className="rounded-lg border border-[#c98500]/40 bg-[#c98500]/10 px-4 py-3 text-sm text-[#e0a63a]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-lg bg-red-600 py-3.5 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-red-500 disabled:opacity-50"
      >
        {sending ? "Enviando..." : "Enviar check-in"}
      </button>
    </form>
  );
}

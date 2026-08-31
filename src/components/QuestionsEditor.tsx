"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NUMERIC_TYPES, QUESTION_TYPE_LABEL, type Question, type QuestionType } from "@/server/types";

const inputClass =
  "w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-700 focus:border-red-600";
const labelClass =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500";

export default function QuestionsEditor({ questions }: { questions: Question[] }) {
  const router = useRouter();
  const [type, setType] = useState<QuestionType>("escala");
  const [track, setTrack] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canTrack = NUMERIC_TYPES.includes(type);

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const options = String(form.get("options") ?? "")
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);

    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        label: form.get("label"),
        help: form.get("help"),
        unit: form.get("unit"),
        type,
        options,
        required: form.get("required") === "on",
        track: canTrack && track,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível criar a pergunta.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/questions/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  async function remove(id: string, label: string) {
    if (!confirm(`Remover "${label}"? Se já houver respostas, ela é apenas arquivada.`))
      return;
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Lista */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-neutral-900 bg-neutral-950">
          <div className="border-b border-neutral-900 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white">
              Perguntas do check-in
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Esta é exatamente a ordem que o aluno vê no formulário.
            </p>
          </div>

          {questions.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-neutral-600">
              Nenhuma pergunta cadastrada ainda.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-900">
              {questions.map((q, index) => (
                <li
                  key={q.id}
                  className={`px-5 py-4 ${q.active ? "" : "opacity-50"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">
                        {index + 1}. {q.label}
                        {q.required ? (
                          <span className="ml-1 text-red-500">*</span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {QUESTION_TYPE_LABEL[q.type]}
                        {q.unit ? ` · ${q.unit}` : ""}
                        {q.track ? " · aparece nos gráficos" : ""}
                        {q.active ? "" : " · arquivada"}
                      </p>
                      {q.help ? (
                        <p className="mt-1 text-xs text-neutral-600">{q.help}</p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => patch(q.id, { move: "up" })}
                        disabled={index === 0}
                        title="Subir"
                        className="rounded border border-neutral-800 px-2 py-1 text-xs text-neutral-400 hover:text-white disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => patch(q.id, { move: "down" })}
                        disabled={index === questions.length - 1}
                        title="Descer"
                        className="rounded border border-neutral-800 px-2 py-1 text-xs text-neutral-400 hover:text-white disabled:opacity-30"
                      >
                        ↓
                      </button>
                      {NUMERIC_TYPES.includes(q.type) ? (
                        <button
                          onClick={() => patch(q.id, { track: !q.track })}
                          title="Mostrar em gráfico de evolução"
                          className={`rounded border px-2 py-1 text-xs ${
                            q.track
                              ? "border-red-600 bg-red-600/10 text-red-400"
                              : "border-neutral-800 text-neutral-500 hover:text-white"
                          }`}
                        >
                          gráfico
                        </button>
                      ) : null}
                      <button
                        onClick={() => patch(q.id, { active: !q.active })}
                        className="rounded border border-neutral-800 px-2 py-1 text-xs text-neutral-400 hover:text-white"
                      >
                        {q.active ? "arquivar" : "reativar"}
                      </button>
                      <button
                        onClick={() => remove(q.id, q.label)}
                        title="Remover"
                        className="rounded border border-neutral-800 px-2 py-1 text-xs text-neutral-600 hover:text-[#e0a63a]"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Nova pergunta */}
      <form
        onSubmit={add}
        className="h-fit rounded-2xl border border-neutral-900 bg-neutral-950"
      >
        <div className="border-b border-neutral-900 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white">
            Nova pergunta
          </h2>
        </div>

        <div className="space-y-3 p-5">
          <label className="block">
            <span className={labelClass}>Pergunta *</span>
            <input
              name="label"
              required
              className={inputClass}
              placeholder="Como foi seu sono esta semana?"
            />
          </label>

          <label className="block">
            <span className={labelClass}>Tipo</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType)}
              className={inputClass}
            >
              {(Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map((t) => (
                <option key={t} value={t}>
                  {QUESTION_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>

          {type === "numero" ? (
            <label className="block">
              <span className={labelClass}>Unidade</span>
              <input name="unit" className={inputClass} placeholder="kg, cm, km..." />
            </label>
          ) : null}

          {type === "escolha" ? (
            <label className="block">
              <span className={labelClass}>Opções (uma por linha)</span>
              <textarea
                name="options"
                rows={4}
                className={`${inputClass} resize-y`}
                placeholder={"Ótima\nBoa\nRegular\nRuim"}
              />
            </label>
          ) : null}

          <label className="block">
            <span className={labelClass}>Texto de ajuda</span>
            <input
              name="help"
              className={inputClass}
              placeholder="Explicação que aparece abaixo da pergunta"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input type="checkbox" name="required" className="accent-red-600" />
            Resposta obrigatória
          </label>

          <label
            className={`flex items-center gap-2 text-sm ${
              canTrack ? "text-neutral-300" : "text-neutral-700"
            }`}
          >
            <input
              type="checkbox"
              checked={canTrack && track}
              disabled={!canTrack}
              onChange={(e) => setTrack(e.target.checked)}
              className="accent-red-600"
            />
            Acompanhar em gráfico de evolução
          </label>
          {!canTrack ? (
            <p className="text-xs text-neutral-600">
              Só perguntas numéricas (escala, número, sim/não) viram gráfico.
            </p>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-[#c98500]/40 bg-[#c98500]/10 px-3 py-2 text-xs text-[#e0a63a]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-red-600 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Adicionar pergunta"}
          </button>
        </div>
      </form>
    </div>
  );
}

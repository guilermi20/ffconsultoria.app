"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-700 focus:border-red-600";
const labelClass =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500";

export default function NewStudentForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const data = Object.fromEntries(new FormData(event.currentTarget));
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });

    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Não foi possível cadastrar.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-red-500"
      >
        + Cadastrar aluno
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="animate-fade-up mt-10 w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-6"
      >
        <h2 className="text-lg font-black tracking-tight text-white">
          Cadastrar aluno
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          O link pessoal de check-in é gerado automaticamente.
        </p>

        <div className="mt-5 space-y-3">
          <label className="block">
            <span className={labelClass}>Nome completo *</span>
            <input name="name" required className={inputClass} placeholder="Nome do aluno" />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>WhatsApp</span>
              <input
                name="phone"
                className={inputClass}
                placeholder="(11) 90000-0000"
                inputMode="tel"
              />
            </label>
            <label className="block">
              <span className={labelClass}>E-mail</span>
              <input
                name="email"
                type="email"
                className={inputClass}
                placeholder="aluno@email.com"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Entrou na consultoria em</span>
              <input name="started_at" type="date" className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Situação</span>
              <select name="status" defaultValue="ativo" className={inputClass}>
                <option value="ativo">Ativo</option>
                <option value="pausado">Pausado</option>
                <option value="inativo">Inativo</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className={labelClass}>Objetivo</span>
            <input
              name="goal"
              className={inputClass}
              placeholder="Hipertrofia, prova de 21k, recomposição..."
            />
          </label>

          <label className="block">
            <span className={labelClass}>Observações</span>
            <textarea
              name="notes"
              rows={3}
              className={`${inputClass} resize-y`}
              placeholder="Lesões, restrições, particularidades do treino..."
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-[#c98500]/40 bg-[#c98500]/10 px-3 py-2 text-xs text-[#e0a63a]">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-neutral-800 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-neutral-400 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Cadastrar"}
          </button>
        </div>
      </form>
    </div>
  );
}

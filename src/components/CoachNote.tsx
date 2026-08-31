"use client";

import { useState } from "react";

export default function CoachNote({
  checkinId,
  initial,
}: {
  checkinId: string;
  initial: string | null;
}) {
  const [note, setNote] = useState(initial ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setState("saving");
    const res = await fetch(`/api/checkins/${checkinId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ coach_note: note }),
    });
    setState(res.ok ? "saved" : "error");
  }

  return (
    <div className="p-5">
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setState("idle");
        }}
        rows={4}
        placeholder="Ajustes para a próxima semana, orientações, observações..."
        className="w-full resize-y rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-700 focus:border-red-600"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={save}
          disabled={state === "saving"}
          className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-red-500 disabled:opacity-50"
        >
          {state === "saving" ? "Salvando..." : "Salvar anotação"}
        </button>
        {state === "saved" ? (
          <span className="text-xs text-[#4ec99b]">Salvo</span>
        ) : null}
        {state === "error" ? (
          <span className="text-xs text-[#e0a63a]">Não foi possível salvar</span>
        ) : null}
      </div>
    </div>
  );
}

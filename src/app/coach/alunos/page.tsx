"use client";

import { useState } from "react";
import { apiSend } from "@/lib/api";
import CoachShell from "@/components/CoachShell";
import { StudentGrid } from "@/components/StudentGrid";

function AddStudentForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [ig, setIg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function save() {
    setErr(null);
    if (!name.trim() || !email.trim()) {
      setErr("Informe nome e e-mail.");
      return;
    }
    setBusy(true);
    try {
      await apiSend("/api/students", "POST", {
        name,
        email,
        instagram_handle: ig || null,
      });
      setOk(true);
      setName("");
      setEmail("");
      setIg("");
      onAdded();
      setTimeout(() => setOk(false), 2500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao adicionar.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-red-500"
      >
        ➕ Adicionar aluno
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">➕ Novo aluno</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-neutral-500 hover:text-white">
          fechar
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" className="rounded-md border border-neutral-800 bg-black px-2 py-2 text-sm focus:border-neutral-500 focus:outline-none" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@aluno.com" className="rounded-md border border-neutral-800 bg-black px-2 py-2 text-sm focus:border-neutral-500 focus:outline-none" />
        <input value={ig} onChange={(e) => setIg(e.target.value)} placeholder="@instagram (opcional)" className="rounded-md border border-neutral-800 bg-black px-2 py-2 text-sm focus:border-neutral-500 focus:outline-none" />
      </div>
      <p className="mt-2 text-[11px] text-neutral-500">
        Senha inicial: <code className="text-neutral-300">teamff123</code> (o aluno troca no 1º acesso).
      </p>
      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
      {ok && <p className="mt-2 text-xs text-emerald-400">Aluno adicionado ✓</p>}
      <button
        onClick={save}
        disabled={busy}
        className="mt-3 rounded-lg bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-black hover:bg-neutral-200 disabled:opacity-50"
      >
        {busy ? "Salvando…" : "Salvar aluno"}
      </button>
    </div>
  );
}

export default function AlunosPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <CoachShell>
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
          👥 Alunos
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Toque para ver perfil, treinos e evolução.
        </p>
        <div className="mt-5">
          <AddStudentForm onAdded={() => setRefreshKey((k) => k + 1)} />
        </div>
        <div className="mt-6">
          <StudentGrid key={refreshKey} />
        </div>
      </div>
    </CoachShell>
  );
}

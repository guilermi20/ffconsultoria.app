"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Motto, WordmarkStatic } from "@/components/Brand";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/coach";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push(next);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({ error: "Falha no login." }));
      setError(data.error ?? "E-mail ou senha inválidos.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm animate-fade-up">
      <div className="text-center">
        <WordmarkStatic />
        <div className="mt-3">
          <Motto />
        </div>
      </div>

      <div className="mt-10 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            E-mail
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-700 focus:border-red-600"
            placeholder="fabio@ffconsultoria.com"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            Senha
          </span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-700 focus:border-red-600"
            placeholder="••••••••"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-[#c98500]/40 bg-[#c98500]/10 px-3 py-2 text-xs text-[#e0a63a]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-lg bg-red-600 py-2.5 text-sm font-bold uppercase tracking-[0.15em] text-white transition hover:bg-red-500 disabled:opacity-50"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>

      <p className="mt-8 text-center text-[10px] uppercase tracking-[0.25em] text-neutral-700">
        Módulo 1 · Check-in semanal
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

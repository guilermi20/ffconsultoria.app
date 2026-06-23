"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiSend } from "@/lib/api";
import { Motto } from "@/components/Brand";

const DEMO_ACCOUNTS = [
  { label: "Coach (Fábio)", email: "coach@teamff.consultoria" },
  { label: "Aluno — Lucas", email: "lucas.andrade@gmail.com" },
  { label: "Aluno — Marina", email: "marina.costa@gmail.com" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await apiSend<{ id: string; role: string }>(
        "/api/auth/login",
        "POST",
        { email, password }
      );

      const next =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;

      // Redirecionamento por papel: aluno sempre vai à própria área
      // (mesmo que tenha entrado pelo card "Painel do Consultor").
      if (user.role === "coach") {
        router.replace(next && next.startsWith("/") ? next : "/coach");
      } else {
        router.replace(`/aluno/${user.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login.");
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5">
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="hybrid-watermark text-[16vw] font-black leading-none">
          HYBRID
        </p>
        <p className="hybrid-watermark text-[16vw] font-black leading-none">
          TRAINING
        </p>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-2xl font-black tracking-tight">TEAM FF</span>
            <span className="text-[10px] font-light uppercase tracking-[0.35em] text-neutral-500">
              Consultoria
            </span>
          </div>
          <div className="mt-3">
            <Motto />
          </div>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-6 backdrop-blur"
        >
          <h1 className="text-lg font-black tracking-tight">Entrar</h1>
          <p className="mt-1 text-xs text-neutral-500">
            Acesse o Painel do Consultor ou a Área do Aluno.
          </p>

          <label className="mt-5 block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              E-mail
            </span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="mt-1 w-full rounded-md border border-neutral-800 bg-black p-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
              required
            />
          </label>

          <label className="mt-3 block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Senha
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-md border border-neutral-800 bg-black p-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
              required
            />
          </label>

          {error && (
            <p className="mt-3 rounded-md border border-red-900 bg-red-950/40 p-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-lg bg-white py-3 text-sm font-black uppercase tracking-widest text-black transition hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        {/* Atalhos de demonstração */}
        <div className="mt-5 rounded-xl border border-neutral-900 bg-neutral-950/60 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            Contas de demonstração · senha{" "}
            <code className="text-neutral-300">teamff123</code>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => {
                  setEmail(a.email);
                  setPassword("teamff123");
                  setError(null);
                }}
                className="rounded-full border border-neutral-800 px-3 py-1 text-[11px] font-medium text-neutral-300 transition hover:border-neutral-600 hover:text-white"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

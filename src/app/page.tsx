import Link from "next/link";
import { Motto } from "@/components/Brand";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Marca d'água de fundo */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="hybrid-watermark text-[14vw] font-black leading-none text-white">
          HYBRID
        </p>
        <p className="hybrid-watermark text-[14vw] font-black leading-none text-white">
          TRAINING
        </p>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight">TEAM FF</span>
            <span className="text-[10px] font-light uppercase tracking-[0.35em] text-neutral-500">
              Consultoria
            </span>
          </div>
          <span className="rounded border border-neutral-800 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            Demo MVP v1
          </span>
        </header>

        <div className="flex flex-1 flex-col justify-center py-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-neutral-500">
            Head Coach — Fábio Filho
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Sua consultoria de treino,
            <br />
            <span className="text-neutral-500">centralizada e sem planilhas.</span>
          </h1>
          <Motto className="mt-5" />

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <Link
              href="/login?next=/coach"
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-7 transition hover:border-neutral-600"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                  Desktop
                </span>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  Painel do Consultor
                </h2>
                <p className="mt-2 max-w-xs text-sm text-neutral-400">
                  Acompanhe alunos, revise vídeos de execução e prescreva
                  treinos.
                </p>
              </div>
              <span className="mt-8 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white">
                Entrar
                <span className="transition group-hover:translate-x-1">→</span>
              </span>
            </Link>

            <Link
              href="/login"
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-800 bg-white p-7 text-black transition hover:border-white"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                  Mobile
                </span>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  Área do Aluno
                </h2>
                <p className="mt-2 max-w-xs text-sm text-neutral-600">
                  Veja o treino do dia, registre cargas e gere seu card de
                  Stories.
                </p>
              </div>
              <span className="mt-8 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-black">
                Entrar
                <span className="transition group-hover:translate-x-1">→</span>
              </span>
            </Link>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-neutral-900 pt-5 text-[10px] uppercase tracking-widest text-neutral-600">
          <span>@teamff.consultoria</span>
          <span>Dados de demonstração</span>
        </footer>
      </div>
    </main>
  );
}

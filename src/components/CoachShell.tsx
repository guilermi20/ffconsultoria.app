"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./Brand";
import AuthControls from "./AuthControls";

const NAV = [
  { href: "/coach", label: "Painel", icon: "🏠", exact: true },
  { href: "/coach/agenda", label: "Agenda", icon: "📅" },
  { href: "/coach/alunos", label: "Alunos", icon: "👥" },
  { href: "/coach/cadastrar", label: "Cadastrar treino", icon: "➕" },
  { href: "/coach/galeria", label: "Galeria de treinos", icon: "🗂️" },
  { href: "/coach/videos", label: "Vídeos p/ revisar", icon: "🎬" },
  { href: "/coach/planos", label: "Planos ativos", icon: "📋" },
  { href: "/coach/ativos", label: "Alunos ativos", icon: "✅" },
  { href: "/coach/treinos-7d", label: "Treinos · 7 dias", icon: "📆" },
];

export default function CoachShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact ? path === href : path === href || path.startsWith(href + "/");

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 hidden w-60 flex-col border-r border-neutral-900 bg-neutral-950 p-4 md:flex">
        <div className="px-2">
          <Wordmark small />
        </div>
        <nav className="mt-6 flex-1 space-y-1">
          {NAV.map((n) => {
            const a = isActive(n.href, n.exact);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  a
                    ? "bg-red-600 text-white"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                }`}
              >
                <span className="text-base">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-neutral-900 pt-3">
          <AuthControls />
        </div>
      </aside>

      {/* Topbar (mobile) */}
      <header className="sticky top-0 z-30 border-b border-neutral-900 bg-black/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Wordmark small />
          <AuthControls />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {NAV.map((n) => {
            const a = isActive(n.href, n.exact);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                  a ? "bg-red-600 text-white" : "bg-neutral-900 text-neutral-400"
                }`}
              >
                <span>{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 md:ml-60">{children}</main>
    </div>
  );
}

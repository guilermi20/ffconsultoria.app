"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wordmark } from "./Brand";

const NAV = [
  { href: "/coach", label: "Painel da semana", icon: "◉", exact: true },
  { href: "/coach/checkins", label: "Check-ins", icon: "▤" },
  { href: "/coach/alunos", label: "Alunos", icon: "◍" },
  { href: "/coach/disparos", label: "Disparos WhatsApp", icon: "➤" },
  { href: "/coach/perguntas", label: "Perguntas do check-in", icon: "✎" },
  { href: "/coach/importar", label: "Importar histórico", icon: "⇪" },
];

export default function CoachShell({
  children,
  coachName,
}: {
  children: React.ReactNode;
  coachName: string;
}) {
  const path = usePathname();
  const router = useRouter();

  const isActive = (href: string, exact?: boolean) =>
    exact ? path === href : path === href || path.startsWith(href + "/");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 hidden w-64 flex-col border-r border-neutral-900 bg-neutral-950 p-4 md:flex">
        <div className="px-2 pt-1">
          <Wordmark small href="/coach" />
        </div>

        <nav className="mt-7 flex-1 space-y-1">
          {NAV.map((n) => {
            const active = isActive(n.href, n.exact);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-red-600 text-white"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                }`}
              >
                <span className="w-4 text-center text-xs opacity-80">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-neutral-900 pt-3">
          <p className="px-3 text-xs font-semibold text-neutral-300">{coachName}</p>
          <button
            onClick={logout}
            className="mt-1 px-3 text-xs text-neutral-500 hover:text-white"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Topbar (mobile) */}
      <header className="sticky top-0 z-30 border-b border-neutral-900 bg-black/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Wordmark small href="/coach" />
          <button onClick={logout} className="text-xs text-neutral-500">
            Sair
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {NAV.map((n) => {
            const active = isActive(n.href, n.exact);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                  active ? "bg-red-600 text-white" : "bg-neutral-900 text-neutral-400"
                }`}
              >
                <span className="text-[10px] opacity-80">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 px-4 py-6 md:ml-64 md:px-8 md:py-8">{children}</main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiSend } from "@/lib/api";

export default function StudentNav({ studentId }: { studentId: string }) {
  const router = useRouter();
  const path = usePathname();

  async function logout() {
    try {
      await apiSend("/api/auth/logout", "POST", {});
    } catch {
      /* ignore */
    }
    router.replace("/login");
  }

  const base = `/aluno/${studentId}`;
  const items = [
    { href: base, label: "Início", icon: "🏠", exact: true },
    { href: `${base}/evolucao`, label: "Evolução", icon: "📈" },
    { href: `${base}/historico`, label: "Histórico", icon: "📅" },
  ];
  const active = (href: string, exact?: boolean) =>
    exact ? path === href : path.startsWith(href);

  const item = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold uppercase tracking-wide";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md items-stretch border-t border-neutral-900 bg-black/95 backdrop-blur">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={`${item} ${active(it.href, it.exact) ? "text-red-500" : "text-neutral-400"}`}
        >
          <span className="text-lg">{it.icon}</span>
          {it.label}
        </Link>
      ))}
      <button onClick={logout} className={`${item} text-neutral-400`}>
        <span className="text-lg">🚪</span>
        Sair
      </button>
    </nav>
  );
}

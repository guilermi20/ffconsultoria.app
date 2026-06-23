"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/api";

export default function StudentNav({ studentId }: { studentId: string }) {
  const router = useRouter();
  async function logout() {
    try {
      await apiSend("/api/auth/logout", "POST", {});
    } catch {
      /* ignore */
    }
    router.replace("/login");
  }

  const item = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold uppercase tracking-wide";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md items-stretch border-t border-neutral-900 bg-black/95 backdrop-blur">
      <Link href={`/aluno/${studentId}`} className={`${item} text-white`}>
        <span className="text-lg">🏠</span>
        Início
      </Link>
      <Link href={`/aluno/${studentId}#evolucao`} className={`${item} text-neutral-400`}>
        <span className="text-lg">📈</span>
        Evolução
      </Link>
      <Link href={`/aluno/${studentId}#historico`} className={`${item} text-neutral-400`}>
        <span className="text-lg">📅</span>
        Histórico
      </Link>
      <button onClick={logout} className={`${item} text-neutral-400`}>
        <span className="text-lg">🚪</span>
        Sair
      </button>
    </nav>
  );
}

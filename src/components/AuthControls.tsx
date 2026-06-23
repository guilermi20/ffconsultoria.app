"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/api";

interface Me {
  id: string;
  name: string;
  role: "coach" | "student";
}

export default function AuthControls() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    apiGet<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      await apiSend("/api/auth/logout", "POST", {});
    } catch {
      /* ignore */
    }
    router.replace("/login");
  }

  return (
    <div className="flex items-center gap-3">
      {me && (
        <span className="hidden text-[11px] text-neutral-500 sm:inline">
          {me.name.split(" ")[0]}
        </span>
      )}
      <button
        onClick={logout}
        disabled={loggingOut}
        className="rounded border border-neutral-800 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-neutral-400 transition hover:border-neutral-600 hover:text-white disabled:opacity-50"
      >
        {loggingOut ? "Saindo…" : "Sair"}
      </button>
    </div>
  );
}

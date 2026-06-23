"use client";

import { useRef, useState } from "react";
import { apiSend } from "@/lib/api";
import { Avatar } from "./Avatar";

async function fileToDataUrl(file: File, max = 256): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(bmp, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function ProfileEditor({
  student,
  onChanged,
}: {
  student: {
    id: string;
    name: string;
    instagram_handle: string;
    avatar_url: string | null;
    is_active: boolean;
    goal: string | null;
  };
  onChanged: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [ig, setIg] = useState(student.instagram_handle ?? "");
  const [goal, setGoal] = useState(student.goal ?? "");
  const [avatar, setAvatar] = useState(student.avatar_url);
  const [active, setActive] = useState(student.is_active);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      await apiSend(`/api/students/${student.id}/profile`, "PATCH", body);
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setAvatar(dataUrl);
      await patch({ avatar_url: dataUrl });
      setMsg("Foto atualizada ✓");
    } catch {
      setMsg("Não foi possível processar a imagem.");
    }
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-2">
          <Avatar name={student.name} src={avatar} size={64} />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 underline-offset-2 hover:text-white hover:underline"
          >
            Trocar foto
          </button>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Instagram do aluno
            </span>
            <div className="mt-1 flex gap-2">
              <input
                value={ig}
                onChange={(e) => setIg(e.target.value)}
                placeholder="@aluno"
                className="flex-1 rounded-md border border-neutral-800 bg-black px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
              />
              <button
                onClick={() => patch({ instagram_handle: ig })}
                disabled={busy}
                className="rounded-md bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-black hover:bg-neutral-200 disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              🎯 Meta do treino (aparece no topo p/ o aluno)
            </span>
            <div className="mt-1 flex gap-2">
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Ex.: Bater 120kg no supino até o fim do mês"
                className="flex-1 rounded-md border border-neutral-800 bg-black px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
              />
              <button
                onClick={() => patch({ goal })}
                disabled={busy}
                className="rounded-md bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-black hover:bg-neutral-200 disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-neutral-800 px-3 py-2">
            <div>
              <div className="text-xs font-bold">
                Plano {active ? "ativo" : "inativo"}
              </div>
              <div className="text-[10px] text-neutral-500">
                {active
                  ? "Aluno consegue fazer login."
                  : "Login bloqueado (pede regularização)."}
              </div>
            </div>
            <button
              onClick={() => {
                const next = !active;
                setActive(next);
                patch({ is_active: next });
              }}
              disabled={busy}
              className={`relative h-6 w-11 flex-none rounded-full transition ${
                active ? "bg-emerald-600" : "bg-neutral-700"
              }`}
              aria-label="Alternar plano"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                  active ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
          {msg && <p className="text-[11px] text-neutral-400">{msg}</p>}
        </div>
      </div>
    </div>
  );
}

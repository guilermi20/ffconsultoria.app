"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { Motto } from "@/components/Brand";

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  instagram_handle: string | null;
  avatar_url: string | null;
  goal: string | null;
  role: string;
}

const SLIDES = [
  {
    emoji: "👊",
    title: "Bem-vindo à TEAM FF",
    text: "Sua consultoria de treino na palma da mão. Performance, estética e disciplina — todo dia.",
  },
  {
    emoji: "📋",
    title: "Seu treino do dia",
    text: "Na home você vê o treino de hoje e a semana inteira. Toque no treino para ver exercícios, séries e as cargas que o coach prescreveu.",
  },
  {
    emoji: "▶️",
    title: "Treine guiado, série a série",
    text: "Confirme a carga e as reps a cada série, anexe vídeos da execução e descanse com o timer. Pode pular um exercício se precisar (é só dizer o porquê).",
  },
  {
    emoji: "📈",
    title: "Veja sua evolução",
    text: "Gráficos de carga, equivalências de peso (quantos elefantes você levantou! 🐘) e o card de Stories pra postar o resultado.",
  },
];

async function fileToDataUrl(file: File, max = 256): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")?.drawImage(bmp, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function OnboardingPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ig, setIg] = useState("");
  const [goal, setGoal] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Profile>("/api/me/profile")
      .then((p) => {
        setProfile(p);
        setName(p.name ?? "");
        setEmail(p.email ?? "");
        setPhone(p.phone ?? "");
        setIg(p.instagram_handle ?? "");
        setGoal(p.goal ?? "");
        setAvatar(p.avatar_url);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  const isForm = step >= SLIDES.length;

  async function finish() {
    setSaving(true);
    setErr(null);
    try {
      await apiSend("/api/me/profile", "PATCH", {
        name,
        email,
        phone,
        instagram_handle: ig,
        avatar_url: avatar,
        goal,
        onboarded: true,
      });
      router.replace(`/aluno/${profile?.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao salvar.");
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
      {/* progress dots */}
      <div className="flex justify-center gap-1.5">
        {[...SLIDES, "form"].map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? "w-6 bg-red-500" : "w-1.5 bg-neutral-800"
            }`}
          />
        ))}
      </div>

      {!isForm ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="text-7xl animate-pop">{SLIDES[step].emoji}</div>
          <h1 className="mt-6 text-3xl font-black tracking-tight">{SLIDES[step].title}</h1>
          <p className="mt-3 max-w-xs text-sm text-neutral-400">{SLIDES[step].text}</p>
          {step === 0 && <div className="mt-4"><Motto /></div>}
        </div>
      ) : (
        <div className="flex-1 py-6">
          <h1 className="text-2xl font-black tracking-tight">Complete seu perfil 📸</h1>
          <p className="mt-1 text-sm text-neutral-500">Pra deixar tudo certinho com o coach.</p>

          <div className="mt-6 flex flex-col items-center gap-2">
            <Avatar name={name || "Aluno"} src={avatar} size={84} />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setAvatar(await fileToDataUrl(f)); }} />
            <button onClick={() => fileRef.current?.click()} className="text-[11px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300">
              {avatar ? "Trocar foto" : "Adicionar foto de perfil"}
            </button>
          </div>

          <div className="mt-6 space-y-3">
            <Input label="Nome" value={name} onChange={setName} />
            <Input label="E-mail" value={email} onChange={setEmail} type="email" />
            <Input label="Telefone / WhatsApp" value={phone} onChange={setPhone} placeholder="(11) 90000-0000" />
            <Input label="Instagram" value={ig} onChange={setIg} placeholder="@voce" />
            <Input label="Sua meta" value={goal} onChange={setGoal} placeholder="Ex.: Ganhar 5kg de massa" />
          </div>
          {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
        </div>
      )}

      {/* botões */}
      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="rounded-lg border border-neutral-800 px-4 py-3 text-xs font-bold uppercase tracking-widest text-neutral-400 hover:border-neutral-600">
            Voltar
          </button>
        )}
        {!isForm ? (
          <button onClick={() => setStep(step + 1)} className="flex-1 rounded-lg bg-red-600 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-red-500">
            {step === SLIDES.length - 1 ? "Completar perfil →" : "Próximo →"}
          </button>
        ) : (
          <button onClick={finish} disabled={saving} className="flex-1 rounded-lg bg-white py-3 text-sm font-black uppercase tracking-widest text-black hover:bg-neutral-200 disabled:opacity-50">
            {saving ? "Salvando…" : "Começar a treinar 🔥"}
          </button>
        )}
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-neutral-800 bg-black p-2.5 text-sm focus:border-neutral-500 focus:outline-none"
      />
    </label>
  );
}

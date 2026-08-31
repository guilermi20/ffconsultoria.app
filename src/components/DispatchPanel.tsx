"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "./ui";
import CopyButton from "./CopyButton";

export type QueueItem = {
  id: string;
  student_id: string;
  student_name: string;
  phone: string | null;
  message: string;
  status: "pendente" | "enviado" | "falhou" | "cancelado";
  error: string | null;
  sent_at: string | null;
  answered: boolean;
  waLink: string | null;
};

export default function DispatchPanel({
  week,
  items,
  defaultTemplate,
  providerName,
  manual,
}: {
  week: string;
  items: QueueItem[];
  defaultTemplate: string;
  providerName: string;
  manual: boolean;
}) {
  const router = useRouter();
  const [template, setTemplate] = useState(defaultTemplate);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function generate() {
    setBusy("gerar");
    setMessage(null);
    const res = await fetch("/api/whatsapp/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ week, template }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    setMessage(
      res.ok
        ? `Fila pronta para ${data.total} aluno(s) ativos.`
        : (data.error ?? "Falha ao montar a fila.")
    );
    router.refresh();
  }

  async function send(id: string, action?: "cancelar") {
    setBusy(id);
    const res = await fetch(`/api/whatsapp/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Falha no envio.");
    }
    setBusy(null);
    router.refresh();
  }

  const pending = items.filter((i) => i.status === "pendente");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-900 bg-neutral-950">
        <div className="border-b border-neutral-900 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white">
            Mensagem da semana
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Use <code className="text-neutral-400">{"{nome}"}</code> para o primeiro
            nome e <code className="text-neutral-400">{"{link}"}</code> para o link
            pessoal do aluno.
          </p>
        </div>

        <div className="p-5">
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={6}
            className="w-full resize-y rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-red-600"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={generate}
              disabled={busy === "gerar"}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {busy === "gerar" ? "Montando..." : "Montar fila da semana"}
            </button>
            <span className="text-xs text-neutral-500">
              Provedor: <span className="text-neutral-300">{providerName}</span>
              {manual ? " · envio pelo link wa.me" : " · envio automático"}
            </span>
          </div>

          {message ? (
            <p className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300">
              {message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-900 bg-neutral-950">
        <div className="flex items-center justify-between border-b border-neutral-900 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white">
              Fila de envio
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              {items.length} na fila · {pending.length} aguardando envio
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-600">
            Nenhum disparo montado para esta semana. Clique em “Montar fila da
            semana”.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-900">
            {items.map((item) => (
              <li key={item.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white">
                        {item.student_name}
                      </p>
                      <StatusBadge status={item.status} />
                      {item.answered ? (
                        <span className="text-[11px] font-semibold text-[#4ec99b]">
                          já respondeu
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-neutral-600">
                      {item.phone ?? "sem telefone cadastrado"}
                    </p>
                    {item.error ? (
                      <p className="mt-1 text-xs text-[#e0a63a]">{item.error}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <CopyButton value={item.message} label="Copiar texto" />
                    {item.waLink && item.status !== "cancelado" ? (
                      <a
                        href={item.waLink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => send(item.id)}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-500"
                      >
                        Abrir WhatsApp
                      </a>
                    ) : null}
                    {!manual && item.status === "pendente" ? (
                      <button
                        onClick={() => send(item.id)}
                        disabled={busy === item.id}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
                      >
                        {busy === item.id ? "Enviando..." : "Enviar"}
                      </button>
                    ) : null}
                    {item.status === "pendente" ? (
                      <button
                        onClick={() => send(item.id, "cancelar")}
                        disabled={busy === item.id}
                        className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-500 transition hover:text-white"
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                </div>

                <details className="mt-2">
                  <summary className="cursor-pointer select-none text-xs text-neutral-600 hover:text-neutral-400">
                    Ver mensagem
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-neutral-900 bg-black px-3 py-2 font-sans text-xs leading-relaxed text-neutral-400">
                    {item.message}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

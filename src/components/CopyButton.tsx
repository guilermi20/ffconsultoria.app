"use client";

import { useState } from "react";

export default function CopyButton({
  value,
  label = "Copiar link",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Navegadores sem permissão de área de transferência: seleção manual.
      window.prompt("Copie o link:", value);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      onClick={copy}
      title={value}
      className={
        className ||
        "rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-300 transition hover:border-neutral-700 hover:text-white"
      }
    >
      {copied ? "Copiado!" : label}
    </button>
  );
}

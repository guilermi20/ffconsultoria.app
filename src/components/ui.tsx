import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-neutral-900 bg-neutral-950 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-neutral-900 px-5 py-4">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white">
          {title}
        </h2>
        {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/**
 * Número-herói. Um valor sozinho não pede gráfico — pede um bloco de leitura
 * imediata, com o rótulo em tinta secundária e o número em tinta primária.
 */
export function Stat({
  label,
  value,
  suffix,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  tone?: "default" | "ok" | "late";
}) {
  const toneClass =
    tone === "ok"
      ? "text-[#199e70]"
      : tone === "late"
        ? "text-[#c98500]"
        : "text-white";

  return (
    <Card className="px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-black tabular-nums ${toneClass}`}>
        {value}
        {suffix ? (
          <span className="ml-1 text-lg font-bold text-neutral-500">{suffix}</span>
        ) : null}
      </p>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </Card>
  );
}

/**
 * Estado sempre com rótulo — a cor nunca carrega a informação sozinha.
 * Vermelho fica reservado à marca, então "pendente" usa neutro e "atrasado" âmbar.
 */
export function StatusBadge({
  status,
}: {
  status:
    | "respondido"
    | "pendente"
    | "enviado"
    | "falhou"
    | "cancelado"
    | "atrasado"
    | "ativo"
    | "pausado"
    | "inativo";
}) {
  const map: Record<string, { label: string; className: string; dot: string }> = {
    respondido: {
      label: "Respondido",
      className: "border-[#199e70]/40 bg-[#199e70]/10 text-[#4ec99b]",
      dot: "bg-[#199e70]",
    },
    enviado: {
      label: "Enviado",
      className: "border-[#199e70]/40 bg-[#199e70]/10 text-[#4ec99b]",
      dot: "bg-[#199e70]",
    },
    pendente: {
      label: "Pendente",
      className: "border-neutral-800 bg-neutral-900 text-neutral-400",
      dot: "bg-neutral-600",
    },
    cancelado: {
      label: "Cancelado",
      className: "border-neutral-800 bg-neutral-900 text-neutral-500",
      dot: "bg-neutral-700",
    },
    atrasado: {
      label: "Atrasado",
      className: "border-[#c98500]/40 bg-[#c98500]/10 text-[#e0a63a]",
      dot: "bg-[#c98500]",
    },
    falhou: {
      label: "Falhou",
      className: "border-[#c98500]/40 bg-[#c98500]/10 text-[#e0a63a]",
      dot: "bg-[#c98500]",
    },
    ativo: {
      label: "Ativo",
      className: "border-[#199e70]/40 bg-[#199e70]/10 text-[#4ec99b]",
      dot: "bg-[#199e70]",
    },
    pausado: {
      label: "Pausado",
      className: "border-[#c98500]/40 bg-[#c98500]/10 text-[#e0a63a]",
      dot: "bg-[#c98500]",
    },
    inativo: {
      label: "Inativo",
      className: "border-neutral-800 bg-neutral-900 text-neutral-500",
      dot: "bg-neutral-700",
    },
  };
  const s = map[status] ?? map.pendente;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${s.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-900 px-6 py-14 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-neutral-400">
        {title}
      </p>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-neutral-600">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

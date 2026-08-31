import Link from "next/link";

export function Wordmark({
  small = false,
  href = "/",
}: {
  small?: boolean;
  href?: string;
}) {
  return (
    <Link href={href} className="inline-flex select-none items-baseline gap-2">
      <span
        className={`font-black tracking-tight text-white ${
          small ? "text-base" : "text-xl"
        }`}
      >
        TEAM&nbsp;FF
      </span>
      <span
        className={`font-light uppercase tracking-[0.35em] text-neutral-500 ${
          small ? "text-[9px]" : "text-[10px]"
        }`}
      >
        Consultoria
      </span>
    </Link>
  );
}

/** Versão sem link — para telas públicas do aluno. */
export function WordmarkStatic({ small = false }: { small?: boolean }) {
  return (
    <span className="inline-flex select-none items-baseline gap-2">
      <span
        className={`font-black tracking-tight text-white ${
          small ? "text-base" : "text-xl"
        }`}
      >
        TEAM&nbsp;FF
      </span>
      <span
        className={`font-light uppercase tracking-[0.35em] text-neutral-500 ${
          small ? "text-[9px]" : "text-[10px]"
        }`}
      >
        Consultoria
      </span>
    </span>
  );
}

export function Motto({ className = "" }: { className?: string }) {
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500 ${className}`}
    >
      Performance • Estética • Disciplina
    </span>
  );
}

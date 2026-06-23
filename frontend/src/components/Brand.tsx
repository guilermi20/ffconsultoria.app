import Link from "next/link";

export function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-baseline gap-2 select-none">
      <span
        className={`font-black tracking-tight text-white ${
          small ? "text-base" : "text-xl"
        }`}
      >
        TEAM&nbsp;FF
      </span>
      <span
        className={`font-light tracking-[0.35em] text-neutral-500 uppercase ${
          small ? "text-[9px]" : "text-[10px]"
        }`}
      >
        Consultoria
      </span>
    </Link>
  );
}

export function Motto({ className = "" }: { className?: string }) {
  return (
    <span
      className={`text-[10px] tracking-[0.3em] text-neutral-500 uppercase font-bold ${className}`}
    >
      Performance • Estética • Disciplina
    </span>
  );
}

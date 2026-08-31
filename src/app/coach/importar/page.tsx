"use client";

import { useState } from "react";
import { PageTitle } from "@/components/ui";
import { QUESTION_TYPE_LABEL, type QuestionType } from "@/server/types";

type Analysis = {
  headers: string[];
  sample: string[][];
  totalRows: number;
  questions: { id: string; label: string; type: QuestionType }[];
  suggestions: Record<string, string>;
  guessDate: string | null;
  guessStudent: string | null;
};

type Report = {
  checkins: number;
  answers: number;
  studentsCreated: number;
  newQuestions: number;
  skipped: string[];
};

const inputClass =
  "w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-red-600";
const labelClass =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500";

export default function ImportPage() {
  const [csv, setCsv] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [studentColumn, setStudentColumn] = useState("");
  const [dateColumn, setDateColumn] = useState("");
  const [columns, setColumns] = useState<Record<string, string>>({});
  const [newTypes, setNewTypes] = useState<Record<string, QuestionType>>({});
  const [createStudents, setCreateStudents] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  async function readFile(file: File) {
    const text = await file.text();
    setCsv(text);
  }

  async function analyze() {
    setBusy(true);
    setError(null);
    setReport(null);

    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ csv, analyze: true }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Não foi possível ler o CSV.");
      return;
    }

    const result = data as Analysis;
    setAnalysis(result);
    setStudentColumn(result.guessStudent ?? result.headers[0] ?? "");
    setDateColumn(result.guessDate ?? "");

    // Colunas já reconhecidas vêm mapeadas; as demais entram como "novo".
    const initial: Record<string, string> = {};
    for (const header of result.headers) {
      initial[header] = result.suggestions[header] ?? "";
    }
    setColumns(initial);
  }

  async function runImport() {
    setBusy(true);
    setError(null);

    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        csv,
        mapping: {
          studentColumn,
          dateColumn: dateColumn || null,
          columns,
          newTypes,
          createStudents,
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Falha na importação.");
      return;
    }
    setReport(data as Report);
  }

  return (
    <div className="animate-fade-up">
      <PageTitle
        title="Importar histórico"
        subtitle="Traga as respostas já coletadas no Google Forms para dentro do painel"
      />

      {/* Passo 1 */}
      <div className="rounded-2xl border border-neutral-900 bg-neutral-950">
        <div className="border-b border-neutral-900 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white">
            1 · Envie o CSV
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            No Google Forms: Respostas → Vincular ao Sheets → Arquivo → Fazer
            download → CSV.
          </p>
        </div>

        <div className="space-y-3 p-5">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readFile(file);
            }}
            className="block w-full text-sm text-neutral-400 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:px-4 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-[0.15em] file:text-neutral-300 hover:file:text-white"
          />
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={6}
            placeholder="...ou cole o conteúdo do CSV aqui"
            className={`${inputClass} resize-y font-mono text-xs`}
          />
          <button
            onClick={analyze}
            disabled={busy || !csv.trim()}
            className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {busy && !analysis ? "Lendo..." : "Ler colunas"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-[#c98500]/40 bg-[#c98500]/10 px-3 py-2 text-sm text-[#e0a63a]">
          {error}
        </p>
      ) : null}

      {/* Passo 2 */}
      {analysis ? (
        <div className="mt-6 rounded-2xl border border-neutral-900 bg-neutral-950">
          <div className="border-b border-neutral-900 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white">
              2 · Mapeie as colunas
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              {analysis.totalRows} linhas encontradas · {analysis.headers.length}{" "}
              colunas
            </p>
          </div>

          <div className="space-y-5 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Coluna que identifica o aluno *</span>
                <select
                  value={studentColumn}
                  onChange={(e) => setStudentColumn(e.target.value)}
                  className={inputClass}
                >
                  {analysis.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={labelClass}>Coluna de data / carimbo</span>
                <select
                  value={dateColumn}
                  onChange={(e) => setDateColumn(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Sem data (usa a semana atual)</option>
                  {analysis.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={createStudents}
                onChange={(e) => setCreateStudents(e.target.checked)}
                className="accent-red-600"
              />
              Cadastrar automaticamente alunos que ainda não existem
            </label>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-900 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                  <tr>
                    <th className="py-2 pr-4 font-bold">Coluna do CSV</th>
                    <th className="py-2 pr-4 font-bold">Exemplo</th>
                    <th className="py-2 font-bold">Vai para</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {analysis.headers.map((header, index) => {
                    const isIdentity =
                      header === studentColumn || header === dateColumn;
                    return (
                      <tr key={header} className={isIdentity ? "opacity-40" : ""}>
                        <td className="py-2 pr-4 align-top">
                          <span className="text-neutral-200">{header}</span>
                        </td>
                        <td className="max-w-[200px] truncate py-2 pr-4 align-top text-xs text-neutral-600">
                          {analysis.sample[0]?.[index] ?? "—"}
                        </td>
                        <td className="py-2 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              disabled={isIdentity}
                              value={isIdentity ? "" : (columns[header] ?? "")}
                              onChange={(e) =>
                                setColumns({ ...columns, [header]: e.target.value })
                              }
                              className="rounded-lg border border-neutral-800 bg-black px-2 py-1.5 text-xs text-white outline-none focus:border-red-600 disabled:opacity-40"
                            >
                              <option value="">Ignorar</option>
                              <option value="novo">➕ Criar nova pergunta</option>
                              {analysis.questions.map((q) => (
                                <option key={q.id} value={q.id}>
                                  {q.label}
                                </option>
                              ))}
                            </select>

                            {columns[header] === "novo" && !isIdentity ? (
                              <select
                                value={newTypes[header] ?? "texto"}
                                onChange={(e) =>
                                  setNewTypes({
                                    ...newTypes,
                                    [header]: e.target.value as QuestionType,
                                  })
                                }
                                className="rounded-lg border border-neutral-800 bg-black px-2 py-1.5 text-xs text-white outline-none focus:border-red-600"
                              >
                                {(
                                  Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]
                                ).map((t) => (
                                  <option key={t} value={t}>
                                    {QUESTION_TYPE_LABEL[t]}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              onClick={runImport}
              disabled={busy || !studentColumn}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {busy ? "Importando..." : "Importar respostas"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Resultado */}
      {report ? (
        <div className="mt-6 rounded-2xl border border-[#199e70]/40 bg-[#199e70]/5 p-5">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-[#4ec99b]">
            Importação concluída
          </h2>
          <ul className="mt-3 space-y-1 text-sm text-neutral-300">
            <li>{report.checkins} check-ins gravados</li>
            <li>{report.answers} respostas gravadas</li>
            <li>{report.studentsCreated} alunos cadastrados automaticamente</li>
            <li>{report.newQuestions} perguntas criadas</li>
          </ul>
          {report.skipped.length > 0 ? (
            <p className="mt-3 text-xs text-[#e0a63a]">
              Ignorados (aluno não encontrado): {report.skipped.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

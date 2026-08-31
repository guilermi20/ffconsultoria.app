/**
 * Parser de CSV suficiente para exportações do Google Forms: aspas duplas,
 * aspas escapadas (""), quebras de linha dentro do campo, BOM e separador
 * detectado automaticamente (vírgula ou ponto e vírgula).
 */

export type Sheet = { headers: string[]; rows: string[][] };

function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.indexOf("\n") + 1 || text.length);
  let commas = 0;
  let semicolons = 0;
  let inQuotes = false;

  for (const char of firstLine) {
    if (char === '"') inQuotes = !inQuotes;
    else if (!inQuotes && char === ",") commas++;
    else if (!inQuotes && char === ";") semicolons++;
  }
  return semicolons > commas ? ";" : ",";
}

export function parseCSV(input: string): Sheet {
  const text = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const delimiter = detectDelimiter(text);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') inQuotes = true;
    else if (char === delimiter) {
      row.push(field.trim());
      field = "";
    } else if (char === "\n") {
      row.push(field.trim());
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);

  const headers = rows.shift() ?? [];
  return { headers, rows };
}

/**
 * Datas do Google Forms chegam em vários formatos. Aceita
 * DD/MM/AAAA [HH:MM:SS], AAAA-MM-DD e ISO completo.
 */
export function parseFlexibleDate(value: string): Date | null {
  const raw = value.trim();
  if (!raw) return null;

  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2}))?/);
  if (br) {
    const [, d, m, y, hh, mm] = br;
    return new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh ?? 0),
      Number(mm ?? 0)
    );
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** "8" / "8,5" / "R$ 72,4 kg" -> número. Devolve null quando não há número. */
export function parseNumber(value: string): number | null {
  const cleaned = value
    .replace(/[^\d,.\-]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Normaliza para comparar nomes/e-mails vindos da planilha. */
export function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

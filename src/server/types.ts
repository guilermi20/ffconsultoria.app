export type QuestionType =
  | "escala"
  | "numero"
  | "texto"
  | "texto_longo"
  | "escolha"
  | "sim_nao";

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  escala: "Escala (1 a 10)",
  numero: "Número",
  texto: "Texto curto",
  texto_longo: "Texto longo",
  escolha: "Múltipla escolha",
  sim_nao: "Sim / Não",
};

/** Tipos cujas respostas viram série numérica (gráfico de evolução). */
export const NUMERIC_TYPES: QuestionType[] = ["escala", "numero", "sim_nao"];

export type Question = {
  id: string;
  key: string;
  label: string;
  help: string | null;
  type: QuestionType;
  unit: string | null;
  options: string[];
  min_value: number | null;
  max_value: number | null;
  required: boolean;
  track: boolean;
  position: number;
  active: boolean;
};

export type StudentStatus = "ativo" | "pausado" | "inativo";

export type Student = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  token: string;
  status: StudentStatus;
  started_at: string;
  birth_date: string | null;
  goal: string | null;
  notes: string | null;
};

export type CheckinStatus = "pendente" | "respondido";

export type Checkin = {
  id: string;
  student_id: string;
  week_start: string;
  status: CheckinStatus;
  source: "app" | "import" | "manual";
  submitted_at: string | null;
  coach_note: string | null;
};

export type Answer = {
  question_id: string;
  num: number | null;
  txt: string | null;
};

export type QueueStatus = "pendente" | "enviado" | "falhou" | "cancelado";

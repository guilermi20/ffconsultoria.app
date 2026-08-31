-- FF Training — Módulo 1: Check-in semanal
-- Schema não-destrutivo: pode ser reaplicado com segurança (CREATE ... IF NOT EXISTS).

-- gen_random_uuid() é nativo do Postgres desde a 13 — não exige extensão.

-- ---------------------------------------------------------------------------
-- Coach (acesso ao painel de gestão)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coaches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Alunos
-- token: link fixo e pessoal do aluno (check-in + painel). Não muda por semana.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text,
  phone       text,
  token       text NOT NULL UNIQUE,
  status      text NOT NULL DEFAULT 'ativo'
              CHECK (status IN ('ativo', 'pausado', 'inativo')),
  started_at  date NOT NULL DEFAULT CURRENT_DATE,
  birth_date  date,
  goal        text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS students_status_idx ON students (status, name);

-- ---------------------------------------------------------------------------
-- Perguntas do check-in — totalmente configuráveis pelo coach.
-- O formulário do aluno e os gráficos são gerados a partir desta tabela.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checkin_questions (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key       text NOT NULL UNIQUE,
  label     text NOT NULL,
  help      text,
  type      text NOT NULL
            CHECK (type IN ('escala', 'numero', 'texto', 'texto_longo', 'escolha', 'sim_nao')),
  unit      text,
  options   jsonb NOT NULL DEFAULT '[]'::jsonb,
  min_value numeric,
  max_value numeric,
  required  boolean NOT NULL DEFAULT false,
  track     boolean NOT NULL DEFAULT false,  -- entra nos gráficos de evolução
  position  integer NOT NULL DEFAULT 0,
  active    boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS checkin_questions_pos_idx ON checkin_questions (active, position);

-- ---------------------------------------------------------------------------
-- Check-ins (um por aluno por semana). week_start = segunda-feira da semana.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checkins (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  week_start   date NOT NULL,
  status       text NOT NULL DEFAULT 'pendente'
               CHECK (status IN ('pendente', 'respondido')),
  source       text NOT NULL DEFAULT 'app'
               CHECK (source IN ('app', 'import', 'manual')),
  submitted_at timestamptz,
  coach_note   text,
  reviewed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, week_start)
);

CREATE INDEX IF NOT EXISTS checkins_week_idx ON checkins (week_start DESC, status);
CREATE INDEX IF NOT EXISTS checkins_student_idx ON checkins (student_id, week_start DESC);

-- ---------------------------------------------------------------------------
-- Respostas. num alimenta os gráficos; txt guarda o texto livre / escolha.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checkin_answers (
  checkin_id  uuid NOT NULL REFERENCES checkins (id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES checkin_questions (id) ON DELETE CASCADE,
  num         numeric,
  txt         text,
  PRIMARY KEY (checkin_id, question_id)
);

-- ---------------------------------------------------------------------------
-- Fila de disparo semanal de WhatsApp.
-- O provedor real é plugável (ver src/server/whatsapp.ts).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_queue (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  week_start   date NOT NULL,
  phone        text,
  message      text NOT NULL,
  status       text NOT NULL DEFAULT 'pendente'
               CHECK (status IN ('pendente', 'enviado', 'falhou', 'cancelado')),
  provider     text,
  provider_ref text,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  sent_at      timestamptz,
  UNIQUE (student_id, week_start)
);

CREATE INDEX IF NOT EXISTS whatsapp_queue_week_idx ON whatsapp_queue (week_start DESC, status);

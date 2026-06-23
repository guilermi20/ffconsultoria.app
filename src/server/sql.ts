// AUTO-GERADO a partir de db/schema.sql e db/seed.sql — não editar à mão.
// Embutido em string para ficar disponível no bundle serverless (Vercel).
/* eslint-disable */

export const SCHEMA_SQL = `-- =====================================================================
-- TEAM FF | CONSULTORIA  --  Schema PostgreSQL (MVP v1)
-- Fiel ao documento "Arquitetura Geral V2"
-- =====================================================================

-- Extensão para gen_random_uuid() (Postgres 13+ já tem pgcrypto disponível)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('coach', 'student');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE video_status AS ENUM ('pending', 'reviewed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    instagram_handle VARCHAR(100) DEFAULT '@teamff.consultoria',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- training_plans
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS training_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- workouts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_plan_id UUID REFERENCES training_plans(id) ON DELETE CASCADE,
    is_template BOOLEAN DEFAULT false,
    template_title VARCHAR(255),
    day_sequence INT NOT NULL,
    target_focus VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- workout_exercises
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_name VARCHAR(255) NOT NULL,
    sets INT NOT NULL,
    reps_range VARCHAR(50) NOT NULL,
    rest_seconds INT DEFAULT 90,
    notes TEXT,
    sequence_order INT NOT NULL
);

-- ---------------------------------------------------------------------
-- workout_logs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workout_id UUID REFERENCES workouts(id),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    rpe INT CHECK (rpe BETWEEN 1 AND 10),
    general_student_feedback TEXT,
    general_coach_feedback TEXT
);

-- ---------------------------------------------------------------------
-- exercise_feedbacks
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exercise_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_log_id UUID REFERENCES workout_logs(id) ON DELETE CASCADE,
    workout_exercise_id UUID REFERENCES workout_exercises(id),
    weight_used NUMERIC(5,2),
    reps_performed INT,
    video_url TEXT,
    video_status video_status DEFAULT 'pending',
    coach_video_comment TEXT
);

-- ---------------------------------------------------------------------
-- Índices úteis para o painel/consultas do demo
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_training_plans_student ON training_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_workouts_plan          ON workouts(training_plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_wk   ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_student   ON workout_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_exercise_feedbacks_log ON exercise_feedbacks(workout_log_id);
CREATE INDEX IF NOT EXISTS idx_exercise_feedbacks_status ON exercise_feedbacks(video_status);
`;

export const SEED_SQL = `-- =====================================================================
-- TEAM FF | CONSULTORIA  --  Seed de demonstração (dados de exemplo)
-- Coach: Fábio Filho  |  6 alunos  |  planos, treinos, logs e vídeos
-- Datas são relativas ao momento do seed (sempre "recentes" no demo).
-- Senha de todos (demo): "teamff123"  (hash bcrypt real abaixo, login funciona)
-- =====================================================================

-- Idempotência: limpa antes de semear (ordem respeita FKs)
TRUNCATE exercise_feedbacks, workout_logs, workout_exercises, workouts,
         training_plans, users RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------
INSERT INTO users (id, name, email, password_hash, role, instagram_handle, created_at) VALUES
('aaaa0000-0000-0000-0000-000000000001', 'Fábio Filho',  'coach@teamff.consultoria', '$2a$10$fGVdiU7Mv9zUlSaq6iNPQu6aWSb0khrugJ/pr76lug8BfrjglMUiC', 'coach',   '@teamff.consultoria',  CURRENT_TIMESTAMP - INTERVAL '420 days'),
('aaaa0000-0000-0000-0000-000000000011', 'Lucas Andrade','lucas.andrade@gmail.com',  '$2a$10$fGVdiU7Mv9zUlSaq6iNPQu6aWSb0khrugJ/pr76lug8BfrjglMUiC', 'student', '@lucas.andrade',       CURRENT_TIMESTAMP - INTERVAL '210 days'),
('aaaa0000-0000-0000-0000-000000000012', 'Marina Costa', 'marina.costa@gmail.com',   '$2a$10$fGVdiU7Mv9zUlSaq6iNPQu6aWSb0khrugJ/pr76lug8BfrjglMUiC', 'student', '@marina.costafit',     CURRENT_TIMESTAMP - INTERVAL '165 days'),
('aaaa0000-0000-0000-0000-000000000013', 'Rafael Mendes','rafa.mendes@outlook.com',  '$2a$10$fGVdiU7Mv9zUlSaq6iNPQu6aWSb0khrugJ/pr76lug8BfrjglMUiC', 'student', '@rafa.hybrid',         CURRENT_TIMESTAMP - INTERVAL '120 days'),
('aaaa0000-0000-0000-0000-000000000014', 'Juliana Rocha','juliana.rocha@gmail.com',  '$2a$10$fGVdiU7Mv9zUlSaq6iNPQu6aWSb0khrugJ/pr76lug8BfrjglMUiC', 'student', '@ju.rocha',            CURRENT_TIMESTAMP - INTERVAL '54 days'),
('aaaa0000-0000-0000-0000-000000000015', 'Bruno Tavares','bruno.tavares@gmail.com',  '$2a$10$fGVdiU7Mv9zUlSaq6iNPQu6aWSb0khrugJ/pr76lug8BfrjglMUiC', 'student', '@brunotvrs',           CURRENT_TIMESTAMP - INTERVAL '300 days'),
('aaaa0000-0000-0000-0000-000000000016', 'Carla Nunes',  'carla.nunes@gmail.com',    '$2a$10$fGVdiU7Mv9zUlSaq6iNPQu6aWSb0khrugJ/pr76lug8BfrjglMUiC', 'student', '@carlanunes.fit',      CURRENT_TIMESTAMP - INTERVAL '38 days');

-- ---------------------------------------------------------------------
-- TRAINING PLANS  (um plano ativo por aluno; Lucas tem um antigo inativo)
-- ---------------------------------------------------------------------
INSERT INTO training_plans (id, student_id, title, description, is_active, created_at) VALUES
('bbbb0000-0000-0000-0000-000000000010', 'aaaa0000-0000-0000-0000-000000000011', 'Base Hipertrofia — Off Season',  'Bloco anterior de acúmulo. Arquivado.', false, CURRENT_TIMESTAMP - INTERVAL '120 days'),
('bbbb0000-0000-0000-0000-000000000011', 'aaaa0000-0000-0000-0000-000000000011', 'Hybrid Strength — Bloco de Força', 'Foco em força máxima nos básicos + condicionamento residual. Periodização ondulatória, 6 semanas.', true,  CURRENT_TIMESTAMP - INTERVAL '28 days'),
('bbbb0000-0000-0000-0000-000000000012', 'aaaa0000-0000-0000-0000-000000000012', 'Hipertrofia & Estética — Glúteo/Posterior', 'Ênfase em cadeia posterior e glúteos, densidade de volume e conexão mente-músculo.', true,  CURRENT_TIMESTAMP - INTERVAL '21 days'),
('bbbb0000-0000-0000-0000-000000000013', 'aaaa0000-0000-0000-0000-000000000013', 'Hybrid Athlete — Força + Condicionamento', 'Combina padrões de força com metcons curtos. Preparação para corrida de obstáculos.', true,  CURRENT_TIMESTAMP - INTERVAL '18 days'),
('bbbb0000-0000-0000-0000-000000000014', 'aaaa0000-0000-0000-0000-000000000014', 'Iniciante — Adaptação & Técnica', 'Primeiro bloco. Aprendizado dos padrões, baixa fadiga, foco total em execução.', true,  CURRENT_TIMESTAMP - INTERVAL '12 days'),
('bbbb0000-0000-0000-0000-000000000015', 'aaaa0000-0000-0000-0000-000000000015', 'Powerbuilding — Peak Block', 'Mescla powerlifting e bodybuilding. Picos de carga nos básicos + acessórios de hipertrofia.', true,  CURRENT_TIMESTAMP - INTERVAL '25 days'),
('bbbb0000-0000-0000-0000-000000000016', 'aaaa0000-0000-0000-0000-000000000016', 'Cutting — Definição & Retenção', 'Déficit calórico com manutenção de força. Densidade alta, descansos curtos.', true,  CURRENT_TIMESTAMP - INTERVAL '14 days');

-- ---------------------------------------------------------------------
-- WORKOUTS  (3 por aluno)
-- ---------------------------------------------------------------------
INSERT INTO workouts (id, training_plan_id, is_template, template_title, day_sequence, target_focus, created_at) VALUES
-- Lucas (plano 11)
('cccc0000-0000-0000-0000-000000000001', 'bbbb0000-0000-0000-0000-000000000011', false, NULL, 1, 'Upper Push — Força Máxima', CURRENT_TIMESTAMP - INTERVAL '28 days'),
('cccc0000-0000-0000-0000-000000000002', 'bbbb0000-0000-0000-0000-000000000011', false, NULL, 3, 'Lower — Força',            CURRENT_TIMESTAMP - INTERVAL '28 days'),
('cccc0000-0000-0000-0000-000000000003', 'bbbb0000-0000-0000-0000-000000000011', false, NULL, 5, 'Upper Pull — Dorsais',     CURRENT_TIMESTAMP - INTERVAL '28 days'),
-- Marina (plano 12)
('cccc0000-0000-0000-0000-000000000004', 'bbbb0000-0000-0000-0000-000000000012', false, NULL, 1, 'Inferior A — Glúteo/Quadríceps', CURRENT_TIMESTAMP - INTERVAL '21 days'),
('cccc0000-0000-0000-0000-000000000005', 'bbbb0000-0000-0000-0000-000000000012', false, NULL, 3, 'Superior — Costas/Ombro',        CURRENT_TIMESTAMP - INTERVAL '21 days'),
('cccc0000-0000-0000-0000-000000000006', 'bbbb0000-0000-0000-0000-000000000012', false, NULL, 5, 'Inferior B — Posterior/Glúteo',  CURRENT_TIMESTAMP - INTERVAL '21 days'),
-- Rafael (plano 13)
('cccc0000-0000-0000-0000-000000000007', 'bbbb0000-0000-0000-0000-000000000013', false, NULL, 1, 'Full Body Força + Metcon', CURRENT_TIMESTAMP - INTERVAL '18 days'),
('cccc0000-0000-0000-0000-000000000008', 'bbbb0000-0000-0000-0000-000000000013', false, NULL, 3, 'Push + Core',              CURRENT_TIMESTAMP - INTERVAL '18 days'),
('cccc0000-0000-0000-0000-000000000009', 'bbbb0000-0000-0000-0000-000000000013', false, NULL, 5, 'Pull + Cardio Intervalado',CURRENT_TIMESTAMP - INTERVAL '18 days'),
-- Juliana (plano 14)
('cccc0000-0000-0000-0000-000000000010', 'bbbb0000-0000-0000-0000-000000000014', false, NULL, 1, 'Full Body A — Padrões Básicos', CURRENT_TIMESTAMP - INTERVAL '12 days'),
('cccc0000-0000-0000-0000-000000000011', 'bbbb0000-0000-0000-0000-000000000014', false, NULL, 3, 'Full Body B — Empurrar/Puxar',  CURRENT_TIMESTAMP - INTERVAL '12 days'),
('cccc0000-0000-0000-0000-000000000012', 'bbbb0000-0000-0000-0000-000000000014', false, NULL, 5, 'Full Body C — Pernas/Core',     CURRENT_TIMESTAMP - INTERVAL '12 days'),
-- Bruno (plano 15)
('cccc0000-0000-0000-0000-000000000013', 'bbbb0000-0000-0000-0000-000000000015', false, NULL, 1, 'Squat Day — Agachamento Peak', CURRENT_TIMESTAMP - INTERVAL '25 days'),
('cccc0000-0000-0000-0000-000000000014', 'bbbb0000-0000-0000-0000-000000000015', false, NULL, 3, 'Bench Day — Supino Peak',      CURRENT_TIMESTAMP - INTERVAL '25 days'),
('cccc0000-0000-0000-0000-000000000015', 'bbbb0000-0000-0000-0000-000000000015', false, NULL, 5, 'Deadlift Day — Terra Peak',    CURRENT_TIMESTAMP - INTERVAL '25 days'),
-- Carla (plano 16)
('cccc0000-0000-0000-0000-000000000016', 'bbbb0000-0000-0000-0000-000000000016', false, NULL, 1, 'Upper Densidade',  CURRENT_TIMESTAMP - INTERVAL '14 days'),
('cccc0000-0000-0000-0000-000000000017', 'bbbb0000-0000-0000-0000-000000000016', false, NULL, 3, 'Lower Densidade',  CURRENT_TIMESTAMP - INTERVAL '14 days'),
('cccc0000-0000-0000-0000-000000000018', 'bbbb0000-0000-0000-0000-000000000016', false, NULL, 5, 'Full Body Metabólico', CURRENT_TIMESTAMP - INTERVAL '14 days');

-- ---------------------------------------------------------------------
-- WORKOUT EXERCISES  (5 por treino — UUID default)
-- ---------------------------------------------------------------------
INSERT INTO workout_exercises (workout_id, exercise_name, sets, reps_range, rest_seconds, notes, sequence_order) VALUES
-- Lucas / Upper Push (cccc...01)
('cccc0000-0000-0000-0000-000000000001', 'Supino Reto com Barra',       4, '4-6',   180, 'Pausa de 1s no peito. Foco em explosão na subida.', 1),
('cccc0000-0000-0000-0000-000000000001', 'Desenvolvimento Militar',     4, '6-8',   150, 'Em pé, sem impulso de perna.', 2),
('cccc0000-0000-0000-0000-000000000001', 'Supino Inclinado com Halteres',3,'8-10',  120, 'Banco a 30°. Amplitude completa.', 3),
('cccc0000-0000-0000-0000-000000000001', 'Paralelas com Carga',         3, '8',     120, 'Inclinar o tronco à frente.', 4),
('cccc0000-0000-0000-0000-000000000001', 'Tríceps na Corda',            3, '12-15', 60,  'Drop set na última série.', 5),
-- Lucas / Lower (cccc...02)
('cccc0000-0000-0000-0000-000000000002', 'Agachamento Livre',           5, '4-6',   210, 'Profundidade abaixo do paralelo. Cinto liberado.', 1),
('cccc0000-0000-0000-0000-000000000002', 'Levantamento Terra',          4, '4',     210, 'Convencional. Resetar a cada rep.', 2),
('cccc0000-0000-0000-0000-000000000002', 'Leg Press 45°',               4, '10',    120, 'Pés na largura do quadril.', 3),
('cccc0000-0000-0000-0000-000000000002', 'Cadeira Flexora',             3, '12',    90,  'Cadência 3-1-1.', 4),
('cccc0000-0000-0000-0000-000000000002', 'Panturrilha em Pé',           4, '15',    60,  'Pausa de 2s no alongamento.', 5),
-- Lucas / Upper Pull (cccc...03)
('cccc0000-0000-0000-0000-000000000003', 'Barra Fixa Pronada',          4, '6-8',   150, 'Adicionar carga se passar de 8 reps.', 1),
('cccc0000-0000-0000-0000-000000000003', 'Remada Curvada com Barra',    4, '8',     120, 'Tronco a 45°, pegada pronada.', 2),
('cccc0000-0000-0000-0000-000000000003', 'Puxada Frontal',              3, '10',    90,  'Pegada aberta.', 3),
('cccc0000-0000-0000-0000-000000000003', 'Rosca Direta com Barra',      3, '10-12', 75,  'Sem balanço.', 4),
('cccc0000-0000-0000-0000-000000000003', 'Face Pull',                   3, '15',    60,  'Foco no deltoide posterior.', 5),
-- Marina / Inferior A (cccc...04)
('cccc0000-0000-0000-0000-000000000004', 'Agachamento Hack',            4, '10-12', 120, 'Pés baixos para ênfase em quadríceps.', 1),
('cccc0000-0000-0000-0000-000000000004', 'Elevação Pélvica com Barra',  4, '8-10',  120, 'Pausa de 2s no topo, contração máxima.', 2),
('cccc0000-0000-0000-0000-000000000004', 'Cadeira Extensora',           3, '15',    75,  'Cadência controlada, pico de 1s.', 3),
('cccc0000-0000-0000-0000-000000000004', 'Afundo no Smith',             3, '12',    90,  'Passada longa para glúteo.', 4),
('cccc0000-0000-0000-0000-000000000004', 'Abdução na Máquina',          4, '20',    45,  'Inclinar tronco à frente.', 5),
-- Marina / Superior (cccc...05)
('cccc0000-0000-0000-0000-000000000005', 'Puxada Aberta',               4, '12',    75,  'Foco em dorsais.', 1),
('cccc0000-0000-0000-0000-000000000005', 'Remada Baixa Triângulo',      3, '12',    75,  'Apertar escápulas.', 2),
('cccc0000-0000-0000-0000-000000000005', 'Desenvolvimento Halteres',    3, '12',    75,  'Sentada, encosto a 80°.', 3),
('cccc0000-0000-0000-0000-000000000005', 'Elevação Lateral',            4, '15',    45,  'Drop set na última.', 4),
('cccc0000-0000-0000-0000-000000000005', 'Rosca Alternada',             3, '12',    60,  'Supinar no topo.', 5),
-- Marina / Inferior B (cccc...06)
('cccc0000-0000-0000-0000-000000000006', 'Stiff com Barra',             4, '10',    120, 'Alongar posterior, joelho semiflexionado.', 1),
('cccc0000-0000-0000-0000-000000000006', 'Cadeira Flexora',             4, '12-15', 75,  'Pico de contração de 1s.', 2),
('cccc0000-0000-0000-0000-000000000006', 'Elevação Pélvica Unilateral', 3,'12',    90,  'Cada perna.', 3),
('cccc0000-0000-0000-0000-000000000006', 'Mesa Flexora',                3, '15',    60,  'Cadência 2-1-2.', 4),
('cccc0000-0000-0000-0000-000000000006', 'Panturrilha Sentado',         4, '20',    45,  'Amplitude total.', 5),
-- Rafael / Full Body + Metcon (cccc...07)
('cccc0000-0000-0000-0000-000000000007', 'Agachamento Frontal',         4, '6',     150, 'Cotovelos altos.', 1),
('cccc0000-0000-0000-0000-000000000007', 'Supino Reto com Barra',       4, '6',     120, 'Controle na descida.', 2),
('cccc0000-0000-0000-0000-000000000007', 'Remada Cavalinho',            4, '8',     120, 'Peito apoiado.', 3),
('cccc0000-0000-0000-0000-000000000007', 'Thruster com Halteres',       3, '12',    75,  'Transição fluida agacho→desenvolvimento.', 4),
('cccc0000-0000-0000-0000-000000000007', 'Metcon: Burpee + Box Jump',   5, '10',    60,  'AMRAP 12min, ritmo constante.', 5),
-- Rafael / Push + Core (cccc...08)
('cccc0000-0000-0000-0000-000000000008', 'Desenvolvimento Militar',     4, '6-8',   150, 'Em pé.', 1),
('cccc0000-0000-0000-0000-000000000008', 'Supino Inclinado com Barra',  4, '8',     120, 'Banco a 30°.', 2),
('cccc0000-0000-0000-0000-000000000008', 'Flexão Diamante',             3, 'AMRAP', 75,  'Máximo de reps com boa forma.', 3),
('cccc0000-0000-0000-0000-000000000008', 'Prancha com Peso',            4, '45s',   60,  'Manter pelve neutra.', 4),
('cccc0000-0000-0000-0000-000000000008', 'Roda Abdominal',              3, '12',    60,  'Extensão controlada.', 5),
-- Rafael / Pull + Cardio (cccc...09)
('cccc0000-0000-0000-0000-000000000009', 'Levantamento Terra',          4, '5',     180, 'Convencional.', 1),
('cccc0000-0000-0000-0000-000000000009', 'Barra Fixa',                  4, '8',     120, 'Pegada pronada.', 2),
('cccc0000-0000-0000-0000-000000000009', 'Remada Curvada com Barra',    3, '10',    90,  'Pegada supinada.', 3),
('cccc0000-0000-0000-0000-000000000009', 'Farmer Walk',                 4, '40m',   90,  'Carga pesada, postura ereta.', 4),
('cccc0000-0000-0000-0000-000000000009', 'Cardio: Remo Ergômetro',      1, '2000m', 0,   'Ritmo alvo 2:00/500m.', 5),
-- Juliana / Full Body A (cccc...10)
('cccc0000-0000-0000-0000-000000000010', 'Leg Press 45°',               3, '12',    90,  'Aprender amplitude segura.', 1),
('cccc0000-0000-0000-0000-000000000010', 'Supino Máquina',              3, '12',    75,  'Sentir o peitoral.', 2),
('cccc0000-0000-0000-0000-000000000010', 'Puxada Frontal',              3, '12',    75,  'Descer até o queixo.', 3),
('cccc0000-0000-0000-0000-000000000010', 'Cadeira Extensora',           2, '15',    60,  'Leve, técnica.', 4),
('cccc0000-0000-0000-0000-000000000010', 'Prancha Frontal',             3, '30s',   45,  'Abdômen contraído.', 5),
-- Juliana / Full Body B (cccc...11)
('cccc0000-0000-0000-0000-000000000011', 'Agachamento Goblet',          3, '12',    90,  'Halter junto ao peito.', 1),
('cccc0000-0000-0000-0000-000000000011', 'Desenvolvimento Máquina',     3, '12',    75,  'Não travar cotovelos.', 2),
('cccc0000-0000-0000-0000-000000000011', 'Remada Sentada Máquina',      3, '12',    75,  'Puxar até o abdômen.', 3),
('cccc0000-0000-0000-0000-000000000011', 'Mesa Flexora',                2, '15',    60,  'Posterior de coxa.', 4),
('cccc0000-0000-0000-0000-000000000011', 'Elevação de Pernas',          3, '12',    45,  'Lombar apoiada.', 5),
-- Juliana / Full Body C (cccc...12)
('cccc0000-0000-0000-0000-000000000012', 'Agachamento Smith',           3, '12',    90,  'Pés à frente.', 1),
('cccc0000-0000-0000-0000-000000000012', 'Elevação Pélvica',            3, '12',    75,  'Subir empurrando o calcanhar.', 2),
('cccc0000-0000-0000-0000-000000000012', 'Cadeira Adutora',             3, '15',    45,  'Amplitude confortável.', 3),
('cccc0000-0000-0000-0000-000000000012', 'Panturrilha em Pé',           3, '15',    45,  'Subir devagar.', 4),
('cccc0000-0000-0000-0000-000000000012', 'Abdominal Supra',             3, '15',    45,  'Sem puxar o pescoço.', 5),
-- Bruno / Squat Day (cccc...13)
('cccc0000-0000-0000-0000-000000000013', 'Agachamento Livre',           6, '3',     240, 'Top set @8RPE depois back-off.', 1),
('cccc0000-0000-0000-0000-000000000013', 'Agachamento Pausado',         3, '5',     180, 'Pausa de 2s no buraco.', 2),
('cccc0000-0000-0000-0000-000000000013', 'Leg Press 45°',               4, '8',     120, 'Pesado.', 3),
('cccc0000-0000-0000-0000-000000000013', 'Cadeira Extensora',           3, '12',    75,  'Acessório.', 4),
('cccc0000-0000-0000-0000-000000000013', 'Abdominal na Polia',          4, '15',    60,  'Carga progressiva.', 5),
-- Bruno / Bench Day (cccc...14)
('cccc0000-0000-0000-0000-000000000014', 'Supino Reto com Barra',       6, '3',     240, 'Top set @8RPE depois back-off.', 1),
('cccc0000-0000-0000-0000-000000000014', 'Supino Fechado',              3, '6',     150, 'Foco em tríceps.', 2),
('cccc0000-0000-0000-0000-000000000014', 'Desenvolvimento Militar',     4, '6',     150, 'Em pé.', 3),
('cccc0000-0000-0000-0000-000000000014', 'Crucifixo Inclinado',         3, '12',    75,  'Alongamento máximo.', 4),
('cccc0000-0000-0000-0000-000000000014', 'Tríceps Testa',               3, '10',    75,  'Cotovelos fixos.', 5),
-- Bruno / Deadlift Day (cccc...15)
('cccc0000-0000-0000-0000-000000000015', 'Levantamento Terra',          5, '3',     240, 'Convencional, top set @8RPE.', 1),
('cccc0000-0000-0000-0000-000000000015', 'Terra Romeno',                3, '8',     150, 'Ênfase posterior.', 2),
('cccc0000-0000-0000-0000-000000000015', 'Remada Curvada com Barra',    4, '8',     120, 'Pendlay.', 3),
('cccc0000-0000-0000-0000-000000000015', 'Barra Fixa com Carga',        3, '8',     120, 'Adicionar peso.', 4),
('cccc0000-0000-0000-0000-000000000015', 'Rosca Direta com Barra',      3, '10',    75,  'Acessório.', 5),
-- Carla / Upper Densidade (cccc...16)
('cccc0000-0000-0000-0000-000000000016', 'Supino Inclinado com Halteres',4,'12',    60,  'Descanso curto, densidade.', 1),
('cccc0000-0000-0000-0000-000000000016', 'Puxada Frontal',              4, '12',    60,  'Cadência controlada.', 2),
('cccc0000-0000-0000-0000-000000000016', 'Desenvolvimento Halteres',    3, '12',    60,  'Sem pausa entre lados.', 3),
('cccc0000-0000-0000-0000-000000000016', 'Rosca + Tríceps (bi-set)',    3, '15',    45,  'Bi-set agonista/antagonista.', 4),
('cccc0000-0000-0000-0000-000000000016', 'Elevação Lateral',            4, '15',    30,  'Queima final.', 5),
-- Carla / Lower Densidade (cccc...17)
('cccc0000-0000-0000-0000-000000000017', 'Agachamento Livre',           4, '12',    75,  'Carga moderada, ritmo alto.', 1),
('cccc0000-0000-0000-0000-000000000017', 'Stiff com Halteres',          4, '12',    60,  'Posterior.', 2),
('cccc0000-0000-0000-0000-000000000017', 'Afundo Caminhada',            3, '20',    60,  '10 passos cada perna.', 3),
('cccc0000-0000-0000-0000-000000000017', 'Cadeira Flexora',             3, '15',    45,  'Pico de 1s.', 4),
('cccc0000-0000-0000-0000-000000000017', 'Elevação Pélvica',            4, '15',    45,  'Contração no topo.', 5),
-- Carla / Full Body Metabólico (cccc...18)
('cccc0000-0000-0000-0000-000000000018', 'Thruster com Halteres',       4, '15',    45,  'Circuito metabólico.', 1),
('cccc0000-0000-0000-0000-000000000018', 'Remada Curvada com Halteres', 4, '15',    45,  'Sem pausa.', 2),
('cccc0000-0000-0000-0000-000000000018', 'Swing com Kettlebell',        4, '20',    45,  'Quadril explosivo.', 3),
('cccc0000-0000-0000-0000-000000000018', 'Mountain Climber',            4, '30s',   30,  'Ritmo alto.', 4),
('cccc0000-0000-0000-0000-000000000018', 'Prancha Frontal',             3, '45s',   30,  'Fechamento de core.', 5);

-- ---------------------------------------------------------------------
-- WORKOUT LOGS  (treinos concluídos pelos alunos, recentes)
-- ---------------------------------------------------------------------
INSERT INTO workout_logs (id, student_id, workout_id, completed_at, rpe, general_student_feedback, general_coach_feedback) VALUES
-- Lucas
('dddd0000-0000-0000-0000-000000000001', 'aaaa0000-0000-0000-0000-000000000011', 'cccc0000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '2 days',  8, 'Supino subiu bem, peguei 112kg no top set. Ombro direito incomodou um pouco no militar.', NULL),
('dddd0000-0000-0000-0000-000000000002', 'aaaa0000-0000-0000-0000-000000000011', 'cccc0000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '5 days',  9, 'Dia pesado. Agachamento brutal, terra voou. Joelho ok.', 'Excelente sessão, Lucas. Mantém a profundidade que filmou. Subimos 2,5kg semana que vem.'),
-- Marina
('dddd0000-0000-0000-0000-000000000003', 'aaaa0000-0000-0000-0000-000000000012', 'cccc0000-0000-0000-0000-000000000004', CURRENT_TIMESTAMP - INTERVAL '1 days',  7, 'Senti muito o glúteo na elevação pélvica! Hack pesado tá ficando confortável.', NULL),
('dddd0000-0000-0000-0000-000000000004', 'aaaa0000-0000-0000-0000-000000000012', 'cccc0000-0000-0000-0000-000000000005', CURRENT_TIMESTAMP - INTERVAL '4 days',  7, 'Treino de superior tranquilo. Elevação lateral destruiu o ombro (no bom sentido).', 'Boa, Marina! Na próxima segura 1s no topo da pélvica que sua ativação melhora ainda mais.'),
-- Rafael
('dddd0000-0000-0000-0000-000000000005', 'aaaa0000-0000-0000-0000-000000000013', 'cccc0000-0000-0000-0000-000000000007', CURRENT_TIMESTAMP - INTERVAL '3 days',  9, 'Metcon me acabou. Frontal travou um pouco no punho, vou usar straps.', NULL),
-- Juliana
('dddd0000-0000-0000-0000-000000000006', 'aaaa0000-0000-0000-0000-000000000014', 'cccc0000-0000-0000-0000-000000000010', CURRENT_TIMESTAMP - INTERVAL '1 days',  6, 'Primeiro treino completo sozinha! Fiquei na dúvida na amplitude do leg press.', NULL),
-- Bruno
('dddd0000-0000-0000-0000-000000000007', 'aaaa0000-0000-0000-0000-000000000015', 'cccc0000-0000-0000-0000-000000000013', CURRENT_TIMESTAMP - INTERVAL '2 days',  8, 'Top set de agacho com 180kg subiu sólido. Back-off pesado mas controlado.', NULL),
('dddd0000-0000-0000-0000-000000000008', 'aaaa0000-0000-0000-0000-000000000015', 'cccc0000-0000-0000-0000-000000000014', CURRENT_TIMESTAMP - INTERVAL '6 days',  9, 'Supino 140kg no top set! Recorde pessoal. Fechado travou um pouco.', 'Monstro! PR validado. Cuidado com a abertura do cotovelo no fechado — corrige no vídeo que te mandei.'),
-- Carla
('dddd0000-0000-0000-0000-000000000009', 'aaaa0000-0000-0000-0000-000000000016', 'cccc0000-0000-0000-0000-000000000016', CURRENT_TIMESTAMP - INTERVAL '1 days',  7, 'Densidade alta, descanso curto deu um pump absurdo. Suei demais.', NULL);

-- ---------------------------------------------------------------------
-- EXERCISE FEEDBACKS  (carga/reps por exercício; vídeos pending/reviewed)
-- workout_exercise_id resolvido por (workout_id, sequence_order)
-- ---------------------------------------------------------------------

-- helper macro mental: WE(wk, seq) = (SELECT id FROM workout_exercises WHERE workout_id=wk AND sequence_order=seq)

-- == Log 1 — Lucas / Upper Push (workout 01) ==
INSERT INTO exercise_feedbacks (workout_log_id, workout_exercise_id, weight_used, reps_performed, video_url, video_status, coach_video_comment) VALUES
('dddd0000-0000-0000-0000-000000000001', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000001' AND sequence_order=1), 112.00, 5, 'https://media.teamff.dev/demo/lucas-supino-top.mp4', 'pending',  NULL),
('dddd0000-0000-0000-0000-000000000001', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000001' AND sequence_order=2), 62.50,  6, 'https://media.teamff.dev/demo/lucas-militar.mp4',    'pending',  NULL),
('dddd0000-0000-0000-0000-000000000001', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000001' AND sequence_order=3), 40.00,  9, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000001', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000001' AND sequence_order=4), 25.00,  8, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000001', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000001' AND sequence_order=5), 32.50, 14, NULL, 'pending', NULL);

-- == Log 2 — Lucas / Lower (workout 02) — coach já revisou ==
INSERT INTO exercise_feedbacks (workout_log_id, workout_exercise_id, weight_used, reps_performed, video_url, video_status, coach_video_comment) VALUES
('dddd0000-0000-0000-0000-000000000002', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000002' AND sequence_order=1), 150.00, 5, 'https://media.teamff.dev/demo/lucas-agacho.mp4', 'reviewed', 'Profundidade perfeita e coluna neutra. É isso. Pode subir a carga.'),
('dddd0000-0000-0000-0000-000000000002', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000002' AND sequence_order=2), 180.00, 4, 'https://media.teamff.dev/demo/lucas-terra.mp4',  'reviewed', 'Barra colada no corpo, ótimo lockout. Só cuidado pra não hiperextender no topo.'),
('dddd0000-0000-0000-0000-000000000002', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000002' AND sequence_order=3), 260.00, 10, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000002', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000002' AND sequence_order=4), 50.00,  12, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000002', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000002' AND sequence_order=5), 90.00,  15, NULL, 'pending', NULL);

-- == Log 3 — Marina / Inferior A (workout 04) ==
INSERT INTO exercise_feedbacks (workout_log_id, workout_exercise_id, weight_used, reps_performed, video_url, video_status, coach_video_comment) VALUES
('dddd0000-0000-0000-0000-000000000003', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000004' AND sequence_order=1), 80.00, 11, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000003', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000004' AND sequence_order=2), 90.00,  9, 'https://media.teamff.dev/demo/marina-pelvica.mp4', 'pending', NULL),
('dddd0000-0000-0000-0000-000000000003', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000004' AND sequence_order=3), 45.00, 15, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000003', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000004' AND sequence_order=4), 24.00, 12, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000003', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000004' AND sequence_order=5), 35.00, 20, NULL, 'pending', NULL);

-- == Log 4 — Marina / Superior (workout 05) — revisado ==
INSERT INTO exercise_feedbacks (workout_log_id, workout_exercise_id, weight_used, reps_performed, video_url, video_status, coach_video_comment) VALUES
('dddd0000-0000-0000-0000-000000000004', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000005' AND sequence_order=1), 50.00, 12, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000004', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000005' AND sequence_order=2), 45.00, 12, 'https://media.teamff.dev/demo/marina-remada.mp4', 'reviewed', 'Escápula retraindo bem. Pode aproximar o cotovelo do corpo pra pegar mais dorsal.'),
('dddd0000-0000-0000-0000-000000000004', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000005' AND sequence_order=3), 14.00, 12, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000004', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000005' AND sequence_order=4), 10.00, 15, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000004', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000005' AND sequence_order=5), 12.00, 12, NULL, 'pending', NULL);

-- == Log 5 — Rafael / Full Body + Metcon (workout 07) ==
INSERT INTO exercise_feedbacks (workout_log_id, workout_exercise_id, weight_used, reps_performed, video_url, video_status, coach_video_comment) VALUES
('dddd0000-0000-0000-0000-000000000005', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000007' AND sequence_order=1), 100.00, 6, 'https://media.teamff.dev/demo/rafael-frontal.mp4', 'pending', NULL),
('dddd0000-0000-0000-0000-000000000005', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000007' AND sequence_order=2), 90.00,  6, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000005', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000007' AND sequence_order=3), 70.00,  8, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000005', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000007' AND sequence_order=4), 22.00, 12, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000005', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000007' AND sequence_order=5), 0.00,  50, NULL, 'pending', NULL);

-- == Log 6 — Juliana / Full Body A (workout 10) — iniciante, pede atenção ==
INSERT INTO exercise_feedbacks (workout_log_id, workout_exercise_id, weight_used, reps_performed, video_url, video_status, coach_video_comment) VALUES
('dddd0000-0000-0000-0000-000000000006', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000010' AND sequence_order=1), 60.00, 12, 'https://media.teamff.dev/demo/juliana-legpress.mp4', 'pending', NULL),
('dddd0000-0000-0000-0000-000000000006', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000010' AND sequence_order=2), 25.00, 12, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000006', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000010' AND sequence_order=3), 27.00, 12, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000006', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000010' AND sequence_order=4), 20.00, 15, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000006', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000010' AND sequence_order=5), 0.00,  30, NULL, 'pending', NULL);

-- == Log 7 — Bruno / Squat Day (workout 13) ==
INSERT INTO exercise_feedbacks (workout_log_id, workout_exercise_id, weight_used, reps_performed, video_url, video_status, coach_video_comment) VALUES
('dddd0000-0000-0000-0000-000000000007', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000013' AND sequence_order=1), 180.00, 3, 'https://media.teamff.dev/demo/bruno-agacho-top.mp4', 'pending', NULL),
('dddd0000-0000-0000-0000-000000000007', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000013' AND sequence_order=2), 150.00, 5, 'https://media.teamff.dev/demo/bruno-agacho-pausa.mp4', 'pending', NULL),
('dddd0000-0000-0000-0000-000000000007', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000013' AND sequence_order=3), 320.00, 8, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000007', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000013' AND sequence_order=4), 70.00, 12, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000007', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000013' AND sequence_order=5), 60.00, 15, NULL, 'pending', NULL);

-- == Log 8 — Bruno / Bench Day (workout 14) — PR revisado ==
INSERT INTO exercise_feedbacks (workout_log_id, workout_exercise_id, weight_used, reps_performed, video_url, video_status, coach_video_comment) VALUES
('dddd0000-0000-0000-0000-000000000008', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000014' AND sequence_order=1), 140.00, 3, 'https://media.teamff.dev/demo/bruno-supino-pr.mp4', 'reviewed', 'PR limpo! Escápula retraída e pés firmes. Só fecha um pouco o cotovelo no fechado a seguir.'),
('dddd0000-0000-0000-0000-000000000008', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000014' AND sequence_order=2), 100.00, 6, 'https://media.teamff.dev/demo/bruno-fechado.mp4', 'reviewed', 'Aqui o cotovelo abriu. Mantém mais junto ao tronco que protege o ombro.'),
('dddd0000-0000-0000-0000-000000000008', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000014' AND sequence_order=3), 60.00,  6, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000008', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000014' AND sequence_order=4), 24.00, 12, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000008', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000014' AND sequence_order=5), 30.00, 10, NULL, 'pending', NULL);

-- == Log 9 — Carla / Upper Densidade (workout 16) ==
INSERT INTO exercise_feedbacks (workout_log_id, workout_exercise_id, weight_used, reps_performed, video_url, video_status, coach_video_comment) VALUES
('dddd0000-0000-0000-0000-000000000009', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000016' AND sequence_order=1), 20.00, 12, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000009', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000016' AND sequence_order=2), 50.00, 12, 'https://media.teamff.dev/demo/carla-puxada.mp4', 'pending', NULL),
('dddd0000-0000-0000-0000-000000000009', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000016' AND sequence_order=3), 12.00, 12, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000009', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000016' AND sequence_order=4), 10.00, 15, NULL, 'pending', NULL),
('dddd0000-0000-0000-0000-000000000009', (SELECT id FROM workout_exercises WHERE workout_id='cccc0000-0000-0000-0000-000000000016' AND sequence_order=5), 8.00,  15, NULL, 'pending', NULL);

-- =====================================================================
-- Resumo do seed:
--   1 coach + 6 alunos | 7 planos (1 inativo) | 18 treinos | 90 exercícios
--   9 logs concluídos  | 45 feedbacks de exercício
--   Vídeos: 5 reviewed (com comentário do coach) + 8 pending (fila de revisão)
-- =====================================================================
`;

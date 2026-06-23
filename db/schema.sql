-- =====================================================================
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

import bcrypt from "bcryptjs";
import { pool, query, queryOne } from "./db";

// =====================================================================
// Camada de acesso a dados — SQL portado do backend Fastify (validado).
// Usada pelos Route Handlers em app/api/*.
// =====================================================================

export async function getCoachOverview() {
  const kpis = await queryOne(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role='student')::int AS students,
      (SELECT COUNT(*) FROM training_plans WHERE is_active)::int AS active_plans,
      (SELECT COUNT(*) FROM exercise_feedbacks
          WHERE video_status='pending' AND video_url IS NOT NULL)::int AS pending_videos,
      (SELECT COUNT(*) FROM workout_logs
          WHERE completed_at > NOW() - INTERVAL '7 days')::int AS logs_week
  `);

  const pendingVideos = await query(`
    SELECT ef.id AS feedback_id, wl.id AS log_id,
           u.id AS student_id, u.name AS student_name, u.instagram_handle, u.avatar_url,
           we.exercise_name, ef.weight_used, ef.reps_performed, ef.video_url,
           w.target_focus, wl.completed_at
    FROM exercise_feedbacks ef
    JOIN workout_logs wl       ON wl.id = ef.workout_log_id
    JOIN workout_exercises we  ON we.id = ef.workout_exercise_id
    JOIN workouts w            ON w.id = wl.workout_id
    JOIN users u               ON u.id = wl.student_id
    WHERE ef.video_status='pending' AND ef.video_url IS NOT NULL
    ORDER BY wl.completed_at DESC
  `);

  const recentActivity = await query(`
    SELECT wl.id AS log_id, u.id AS student_id, u.name AS student_name, u.avatar_url,
           w.target_focus, wl.rpe, wl.completed_at,
           (wl.general_coach_feedback IS NOT NULL) AS coach_replied,
           (SELECT COUNT(*) FROM exercise_feedbacks ef
              WHERE ef.workout_log_id=wl.id
                AND ef.video_status='pending' AND ef.video_url IS NOT NULL)::int AS pending_videos
    FROM workout_logs wl
    JOIN workouts w  ON w.id = wl.workout_id
    JOIN users u     ON u.id = wl.student_id
    ORDER BY wl.completed_at DESC
    LIMIT 12
  `);

  // Volume total (kg) por semana, últimas 8 semanas — para o gráfico do painel.
  const weeklyVolume = await query(`
    WITH semanas AS (
      SELECT generate_series(0, 7) AS k
    )
    SELECT
      to_char(date_trunc('week', NOW()) - (k || ' weeks')::interval, 'DD/MM') AS week_label,
      COALESCE((
        SELECT SUM(we.sets * ef.reps_performed * ef.weight_used)
        FROM workout_logs wl
        JOIN exercise_feedbacks ef ON ef.workout_log_id = wl.id
        JOIN workout_exercises we ON we.id = ef.workout_exercise_id
        WHERE date_trunc('week', wl.completed_at) = date_trunc('week', NOW()) - (k || ' weeks')::interval
      ), 0)::float AS volume
    FROM semanas
    ORDER BY k DESC
  `);

  return { kpis, pendingVideos, recentActivity, weeklyVolume };
}

export async function listStudents() {
  return query(`
    SELECT u.id, u.name, u.email, u.instagram_handle, u.avatar_url, u.is_active, u.created_at,
           p.id AS active_plan_id, p.title AS active_plan_title,
           (SELECT COUNT(*) FROM workout_logs wl WHERE wl.student_id=u.id)::int AS total_logs,
           (SELECT MAX(wl.completed_at) FROM workout_logs wl WHERE wl.student_id=u.id) AS last_log_at,
           (SELECT COUNT(*) FROM exercise_feedbacks ef
              JOIN workout_logs wl ON wl.id=ef.workout_log_id
              WHERE wl.student_id=u.id
                AND ef.video_status='pending' AND ef.video_url IS NOT NULL)::int AS pending_videos
    FROM users u
    LEFT JOIN training_plans p ON p.student_id=u.id AND p.is_active=true
    WHERE u.role='student'
    ORDER BY last_log_at DESC NULLS LAST, u.name
  `);
}

export async function getStudentDetail(id: string) {
  const student = await queryOne(
    `SELECT id, name, email, instagram_handle, avatar_url, is_active, goal, role, created_at
     FROM users WHERE id=$1 AND role='student'`,
    [id]
  );
  if (!student) return null;

  const activePlan = await queryOne(
    `SELECT id, title, description, is_active, created_at
     FROM training_plans WHERE student_id=$1 AND is_active=true
     ORDER BY created_at DESC LIMIT 1`,
    [id]
  );

  let workouts: any[] = [];
  if (activePlan) {
    workouts = await query(
      `SELECT id, day_sequence, target_focus, template_title, created_at
       FROM workouts WHERE training_plan_id=$1
       ORDER BY day_sequence`,
      [activePlan.id]
    );
    for (const w of workouts) {
      w.exercises = await query(
        `SELECT id, exercise_name, sets, reps_range, rest_seconds, rest_after_seconds, notes, muscle_group, target_weight, sequence_order
         FROM workout_exercises WHERE workout_id=$1
         ORDER BY sequence_order`,
        [w.id]
      );
    }
  }

  const logs = await query(
    `SELECT wl.id, wl.completed_at, wl.rpe,
            wl.general_student_feedback, wl.general_coach_feedback,
            w.id AS workout_id, w.target_focus AS workout_focus, w.day_sequence,
            (SELECT COUNT(*) FROM exercise_feedbacks ef WHERE ef.workout_log_id=wl.id)::int AS exercises_count,
            (SELECT COUNT(*) FROM exercise_feedbacks ef
               WHERE ef.workout_log_id=wl.id
                 AND ef.video_status='pending' AND ef.video_url IS NOT NULL)::int AS pending_videos,
            (SELECT COUNT(*) FROM exercise_feedbacks ef
               WHERE ef.workout_log_id=wl.id AND ef.skipped)::int AS skipped_count,
            COALESCE((SELECT SUM(we.sets * ef.reps_performed * ef.weight_used)
               FROM exercise_feedbacks ef
               JOIN workout_exercises we ON we.id=ef.workout_exercise_id
               WHERE ef.workout_log_id=wl.id), 0)::float AS tonnage
     FROM workout_logs wl
     JOIN workouts w ON w.id=wl.workout_id
     WHERE wl.student_id=$1
     ORDER BY wl.completed_at DESC`,
    [id]
  );

  return { student, activePlan, workouts, logs };
}

export async function getWorkout(id: string) {
  const workout = await queryOne(
    `SELECT w.id, w.day_sequence, w.target_focus, w.template_title,
            tp.id AS plan_id, tp.title AS plan_title,
            u.id AS student_id, u.name AS student_name
     FROM workouts w
     JOIN training_plans tp ON tp.id = w.training_plan_id
     JOIN users u           ON u.id = tp.student_id
     WHERE w.id=$1`,
    [id]
  );
  if (!workout) return null;

  const exercises = await query(
    `SELECT id, exercise_name, sets, reps_range, rest_seconds, rest_after_seconds, notes, muscle_group, target_weight, sequence_order
     FROM workout_exercises WHERE workout_id=$1
     ORDER BY sequence_order`,
    [id]
  );

  return { workout, exercises };
}

export async function getLogDetail(id: string) {
  const log = await queryOne(
    `SELECT wl.id, wl.completed_at, wl.rpe,
            wl.general_student_feedback, wl.general_coach_feedback, wl.pump_photo_url,
            u.id AS student_id, u.name AS student_name, u.instagram_handle,
            w.id AS workout_id, w.target_focus, w.day_sequence,
            tp.title AS plan_title
     FROM workout_logs wl
     JOIN users u  ON u.id = wl.student_id
     JOIN workouts w ON w.id = wl.workout_id
     JOIN training_plans tp ON tp.id = w.training_plan_id
     WHERE wl.id=$1`,
    [id]
  );
  if (!log) return null;

  const feedbacks = await query(
    `SELECT ef.id, we.exercise_name, we.sets, we.reps_range, we.sequence_order, we.muscle_group, we.target_weight,
            ef.weight_used, ef.reps_performed,
            ef.video_url, ef.video_status, ef.coach_video_comment,
            ef.skipped, ef.skip_reason, ef.student_note
     FROM exercise_feedbacks ef
     JOIN workout_exercises we ON we.id = ef.workout_exercise_id
     WHERE ef.workout_log_id=$1
     ORDER BY we.sequence_order`,
    [id]
  );

  const tonnage = feedbacks.reduce((acc: number, f: any) => {
    const w = Number(f.weight_used) || 0;
    const reps = Number(f.reps_performed) || 0;
    const sets = Number(f.sets) || 0;
    return acc + sets * reps * w;
  }, 0);

  return { log, feedbacks, tonnage };
}

interface FeedbackInput {
  workout_exercise_id: string;
  weight_used?: number | null;
  reps_performed?: number | null;
  video_url?: string | null;
  skipped?: boolean | null;
  skip_reason?: string | null;
  student_note?: string | null;
}

export async function createLog(input: {
  student_id: string;
  workout_id: string;
  rpe?: number | null;
  general_student_feedback?: string | null;
  pump_photo_url?: string | null;
  feedbacks?: FeedbackInput[];
}): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const logRes = await client.query(
      `INSERT INTO workout_logs (student_id, workout_id, rpe, general_student_feedback, pump_photo_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        input.student_id,
        input.workout_id,
        input.rpe ?? null,
        input.general_student_feedback ?? null,
        input.pump_photo_url ?? null,
      ]
    );
    const logId = logRes.rows[0].id as string;

    for (const f of input.feedbacks ?? []) {
      await client.query(
        `INSERT INTO exercise_feedbacks
           (workout_log_id, workout_exercise_id, weight_used, reps_performed, video_url, video_status, skipped, skip_reason, student_note)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8)`,
        [
          logId,
          f.workout_exercise_id,
          f.weight_used ?? null,
          f.reps_performed ?? null,
          f.video_url ?? null,
          f.skipped ?? false,
          f.skip_reason ?? null,
          f.student_note ?? null,
        ]
      );
    }

    await client.query("COMMIT");
    return logId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function reviewFeedback(id: string, comment: string) {
  return queryOne(
    `UPDATE exercise_feedbacks
     SET coach_video_comment=$1, video_status='reviewed'
     WHERE id=$2
     RETURNING id, coach_video_comment, video_status`,
    [comment, id]
  );
}

export async function setLogCoachFeedback(id: string, feedback: string) {
  return queryOne(
    `UPDATE workout_logs SET general_coach_feedback=$1
     WHERE id=$2 RETURNING id, general_coach_feedback`,
    [feedback, id]
  );
}

// --- Criar aluno / plano (coach) -----------------------------------------
export async function createStudent(input: {
  name: string;
  email: string;
  instagram_handle?: string | null;
  password?: string | null;
}) {
  const hash = await bcrypt.hash(input.password || "teamff123", 10);
  return queryOne(
    `INSERT INTO users (name, email, password_hash, role, instagram_handle)
     VALUES ($1, $2, $3, 'student', $4)
     RETURNING id, name, email, instagram_handle`,
    [
      input.name.trim(),
      input.email.toLowerCase().trim(),
      hash,
      input.instagram_handle?.trim() || "@teamff.consultoria",
    ]
  );
}

export async function createActivePlan(
  studentId: string,
  input: { title: string; description?: string | null }
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Só um plano ativo por vez.
    await client.query(
      `UPDATE training_plans SET is_active=false WHERE student_id=$1`,
      [studentId]
    );
    const r = await client.query(
      `INSERT INTO training_plans (student_id, title, description, is_active)
       VALUES ($1, $2, $3, true) RETURNING id, title`,
      [studentId, input.title.trim(), input.description?.trim() || null]
    );
    await client.query("COMMIT");
    return r.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// --- Agenda / calendário do coach ----------------------------------------
export async function getCoachCalendar() {
  const schedule = await query(`
    SELECT u.id AS student_id, u.name AS student_name, u.avatar_url,
           w.id AS workout_id, w.day_sequence, w.target_focus
    FROM workouts w
    JOIN training_plans tp ON tp.id = w.training_plan_id AND tp.is_active
    JOIN users u ON u.id = tp.student_id
    WHERE w.is_template = false
    ORDER BY w.day_sequence, u.name
  `);
  const logs = await query(`
    SELECT wl.id, wl.student_id, u.name AS student_name, u.avatar_url,
           wl.workout_id, wl.completed_at, w.target_focus,
           (SELECT COUNT(*) FROM exercise_feedbacks ef WHERE ef.workout_log_id=wl.id)::int AS total,
           (SELECT COUNT(*) FROM exercise_feedbacks ef WHERE ef.workout_log_id=wl.id AND ef.skipped)::int AS skipped
    FROM workout_logs wl
    JOIN users u ON u.id = wl.student_id
    JOIN workouts w ON w.id = wl.workout_id
    WHERE wl.completed_at > NOW() - INTERVAL '120 days'
    ORDER BY wl.completed_at DESC
  `);
  return { schedule, logs };
}

// --- Biblioteca de exercícios (catálogo) ---------------------------------
export async function getExerciseCatalog(muscleGroup?: string | null) {
  if (muscleGroup) {
    return query(
      `SELECT id, name, muscle_group, equipment FROM exercise_catalog
       WHERE muscle_group=$1 ORDER BY name`,
      [muscleGroup]
    );
  }
  return query(
    `SELECT id, name, muscle_group, equipment FROM exercise_catalog ORDER BY muscle_group, name`
  );
}

// --- Coach adiciona um exercício a um treino -----------------------------
interface ExerciseInput {
  exercise_name: string;
  sets?: number | null;
  reps_range?: string | null;
  rest_seconds?: number | null;
  notes?: string | null;
  muscle_group?: string | null;
  target_weight?: number | null;
}

export async function addWorkoutExercise(workoutId: string, input: ExerciseInput) {
  const seqRow = await queryOne<{ next: number }>(
    `SELECT COALESCE(MAX(sequence_order), 0) + 1 AS next
     FROM workout_exercises WHERE workout_id=$1`,
    [workoutId]
  );
  const next = seqRow?.next ?? 1;

  return queryOne(
    `INSERT INTO workout_exercises
       (workout_id, exercise_name, sets, reps_range, rest_seconds, notes, muscle_group, target_weight, sequence_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, exercise_name, sets, reps_range, rest_seconds, notes, muscle_group, target_weight, sequence_order`,
    [
      workoutId,
      input.exercise_name,
      input.sets ?? 3,
      input.reps_range ?? "10-12",
      input.rest_seconds ?? 90,
      input.notes ?? null,
      input.muscle_group ?? null,
      input.target_weight ?? null,
      next,
    ]
  );
}

export async function updateWorkoutExercise(id: string, input: ExerciseInput) {
  return queryOne(
    `UPDATE workout_exercises SET
        exercise_name = COALESCE($2, exercise_name),
        sets          = COALESCE($3, sets),
        reps_range    = COALESCE($4, reps_range),
        rest_seconds  = COALESCE($5, rest_seconds),
        notes         = $6,
        muscle_group  = COALESCE($7, muscle_group),
        target_weight = $8
      WHERE id=$1
      RETURNING id, exercise_name, sets, reps_range, rest_seconds, notes, muscle_group, target_weight, sequence_order`,
    [
      id,
      input.exercise_name ?? null,
      input.sets ?? null,
      input.reps_range ?? null,
      input.rest_seconds ?? null,
      input.notes ?? null,
      input.muscle_group ?? null,
      input.target_weight ?? null,
    ]
  );
}

export async function deleteWorkoutExercise(id: string) {
  return queryOne(`DELETE FROM workout_exercises WHERE id=$1 RETURNING id`, [id]);
}

/** Reordena: define sequence_order conforme a posição no array. */
export async function reorderWorkoutExercises(orderedIds: string[]) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        `UPDATE workout_exercises SET sequence_order=$1 WHERE id=$2`,
        [i + 1, orderedIds[i]]
      );
    }
    await client.query("COMMIT");
    return { ok: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateWorkout(
  id: string,
  input: { target_focus?: string | null; day_sequence?: number | null; template_title?: string | null }
) {
  return queryOne(
    `UPDATE workouts SET
        target_focus  = COALESCE($2, target_focus),
        day_sequence  = COALESCE($3, day_sequence),
        template_title = COALESCE($4, template_title)
      WHERE id=$1
      RETURNING id, target_focus, day_sequence, template_title, is_template`,
    [id, input.target_focus ?? null, input.day_sequence ?? null, input.template_title ?? null]
  );
}

export async function deleteWorkout(id: string) {
  return queryOne(`DELETE FROM workouts WHERE id=$1 RETURNING id`, [id]);
}

/** Garante um plano ativo para o aluno (cria se não existir). */
async function ensureActivePlan(client: any, studentId: string): Promise<string> {
  const existing = await client.query(
    `SELECT id FROM training_plans WHERE student_id=$1 AND is_active=true ORDER BY created_at DESC LIMIT 1`,
    [studentId]
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const created = await client.query(
    `INSERT INTO training_plans (student_id, title, description, is_active)
     VALUES ($1, 'Plano de Treino', 'Plano criado pelo coach.', true) RETURNING id`,
    [studentId]
  );
  return created.rows[0].id;
}

/** Cria um treino (com exercícios) para um aluno, sob o plano ativo. */
export async function createWorkoutForStudent(
  studentId: string,
  input: {
    target_focus: string;
    day_sequence?: number | null;
    exercises?: ExerciseInput[];
  }
): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const planId = await ensureActivePlan(client, studentId);
    const wk = await client.query(
      `INSERT INTO workouts (training_plan_id, is_template, day_sequence, target_focus)
       VALUES ($1, false, $2, $3) RETURNING id`,
      [planId, input.day_sequence ?? 1, input.target_focus]
    );
    const workoutId = wk.rows[0].id as string;
    let seq = 1;
    for (const ex of input.exercises ?? []) {
      await client.query(
        `INSERT INTO workout_exercises
           (workout_id, exercise_name, sets, reps_range, rest_seconds, notes, muscle_group, target_weight, sequence_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          workoutId,
          ex.exercise_name,
          ex.sets ?? 3,
          ex.reps_range ?? "10-12",
          ex.rest_seconds ?? 90,
          ex.notes ?? null,
          ex.muscle_group ?? null,
          ex.target_weight ?? null,
          seq++,
        ]
      );
    }
    await client.query("COMMIT");
    return workoutId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// --- Templates (galeria de treinos) --------------------------------------
export async function getTemplates() {
  const templates = await query(
    `SELECT id, template_title, target_focus, created_at
     FROM workouts WHERE is_template=true ORDER BY created_at`
  );
  for (const t of templates) {
    t.exercises = await query(
      `SELECT id, exercise_name, sets, reps_range, rest_seconds, rest_after_seconds, notes, muscle_group, target_weight, sequence_order
       FROM workout_exercises WHERE workout_id=$1 ORDER BY sequence_order`,
      [t.id]
    );
  }
  return templates;
}

export async function createTemplate(input: {
  template_title: string;
  target_focus: string;
  exercises?: ExerciseInput[];
}): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const wk = await client.query(
      `INSERT INTO workouts (training_plan_id, is_template, template_title, day_sequence, target_focus)
       VALUES (NULL, true, $1, 0, $2) RETURNING id`,
      [input.template_title, input.target_focus]
    );
    const id = wk.rows[0].id as string;
    let seq = 1;
    for (const ex of input.exercises ?? []) {
      await client.query(
        `INSERT INTO workout_exercises
           (workout_id, exercise_name, sets, reps_range, rest_seconds, notes, muscle_group, target_weight, sequence_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, ex.exercise_name, ex.sets ?? 3, ex.reps_range ?? "10-12", ex.rest_seconds ?? 90,
         ex.notes ?? null, ex.muscle_group ?? null, ex.target_weight ?? null, seq++],
      );
    }
    await client.query("COMMIT");
    return id;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Aplica um template a um aluno: COPIA os exercícios para um novo treino. */
export async function applyTemplate(
  templateId: string,
  studentId: string
): Promise<string> {
  const tpl = await queryOne<{ target_focus: string; template_title: string }>(
    `SELECT target_focus, template_title FROM workouts WHERE id=$1 AND is_template=true`,
    [templateId]
  );
  if (!tpl) throw new Error("Template não encontrado.");
  const exercises = await query<ExerciseInput>(
    `SELECT exercise_name, sets, reps_range, rest_seconds, notes, muscle_group, target_weight
     FROM workout_exercises WHERE workout_id=$1 ORDER BY sequence_order`,
    [templateId]
  );
  // Cria um treino normal (cópia independente) — editar não afeta o template.
  return createWorkoutForStudent(studentId, {
    target_focus: tpl.target_focus || tpl.template_title,
    day_sequence: 1,
    exercises,
  });
}

// --- Coach atualiza perfil do aluno (foto / instagram / status) ----------
export async function updateStudentProfile(
  id: string,
  input: {
    instagram_handle?: string | null;
    avatar_url?: string | null;
    is_active?: boolean | null;
    goal?: string | null;
  }
) {
  return queryOne(
    `UPDATE users
        SET instagram_handle = COALESCE($2, instagram_handle),
            avatar_url       = COALESCE($3, avatar_url),
            is_active        = COALESCE($4, is_active),
            goal             = COALESCE($5, goal)
      WHERE id=$1 AND role='student'
      RETURNING id, name, instagram_handle, avatar_url, is_active, goal`,
    [id, input.instagram_handle ?? null, input.avatar_url ?? null,
     typeof input.is_active === "boolean" ? input.is_active : null,
     input.goal ?? null]
  );
}

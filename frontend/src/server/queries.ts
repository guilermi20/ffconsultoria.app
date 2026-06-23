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
           u.id AS student_id, u.name AS student_name, u.instagram_handle,
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
    SELECT wl.id AS log_id, u.id AS student_id, u.name AS student_name,
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

  return { kpis, pendingVideos, recentActivity };
}

export async function listStudents() {
  return query(`
    SELECT u.id, u.name, u.email, u.instagram_handle, u.created_at,
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
    `SELECT id, name, email, instagram_handle, role, created_at
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
        `SELECT id, exercise_name, sets, reps_range, rest_seconds, notes, sequence_order
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
    `SELECT id, exercise_name, sets, reps_range, rest_seconds, notes, sequence_order
     FROM workout_exercises WHERE workout_id=$1
     ORDER BY sequence_order`,
    [id]
  );

  return { workout, exercises };
}

export async function getLogDetail(id: string) {
  const log = await queryOne(
    `SELECT wl.id, wl.completed_at, wl.rpe,
            wl.general_student_feedback, wl.general_coach_feedback,
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
    `SELECT ef.id, we.exercise_name, we.sets, we.reps_range, we.sequence_order,
            ef.weight_used, ef.reps_performed,
            ef.video_url, ef.video_status, ef.coach_video_comment
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
}

export async function createLog(input: {
  student_id: string;
  workout_id: string;
  rpe?: number | null;
  general_student_feedback?: string | null;
  feedbacks?: FeedbackInput[];
}): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const logRes = await client.query(
      `INSERT INTO workout_logs (student_id, workout_id, rpe, general_student_feedback)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        input.student_id,
        input.workout_id,
        input.rpe ?? null,
        input.general_student_feedback ?? null,
      ]
    );
    const logId = logRes.rows[0].id as string;

    for (const f of input.feedbacks ?? []) {
      await client.query(
        `INSERT INTO exercise_feedbacks
           (workout_log_id, workout_exercise_id, weight_used, reps_performed, video_url, video_status)
         VALUES ($1, $2, $3, $4, $5, 'pending')`,
        [
          logId,
          f.workout_exercise_id,
          f.weight_used ?? null,
          f.reps_performed ?? null,
          f.video_url ?? null,
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

import type { FastifyInstance } from "fastify";
import { query, queryOne } from "../db.js";

export async function coachRoutes(app: FastifyInstance) {
  // -------------------------------------------------------------------
  // Visão geral do Painel do Consultor (KPIs + filas)
  // -------------------------------------------------------------------
  app.get("/api/coach/overview", async () => {
    const kpis = await queryOne<{
      students: number;
      active_plans: number;
      pending_videos: number;
      logs_week: number;
    }>(`
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
  });

  // -------------------------------------------------------------------
  // Lista de alunos (com resumo para os cards do painel)
  // -------------------------------------------------------------------
  app.get("/api/students", async () => {
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
  });

  // -------------------------------------------------------------------
  // Detalhe de um aluno: perfil + plano ativo (treinos/exercícios) + logs
  // -------------------------------------------------------------------
  app.get<{ Params: { id: string } }>("/api/students/:id", async (req, reply) => {
    const { id } = req.params;

    const student = await queryOne(`
      SELECT id, name, email, instagram_handle, role, created_at
      FROM users WHERE id=$1 AND role='student'
    `, [id]);

    if (!student) return reply.code(404).send({ error: "Aluno não encontrado" });

    const activePlan = await queryOne(`
      SELECT id, title, description, is_active, created_at
      FROM training_plans WHERE student_id=$1 AND is_active=true
      ORDER BY created_at DESC LIMIT 1
    `, [id]);

    let workouts: any[] = [];
    if (activePlan) {
      workouts = await query(`
        SELECT id, day_sequence, target_focus, template_title, created_at
        FROM workouts WHERE training_plan_id=$1
        ORDER BY day_sequence
      `, [activePlan.id]);

      for (const w of workouts) {
        w.exercises = await query(`
          SELECT id, exercise_name, sets, reps_range, rest_seconds, notes, sequence_order
          FROM workout_exercises WHERE workout_id=$1
          ORDER BY sequence_order
        `, [w.id]);
      }
    }

    const logs = await query(`
      SELECT wl.id, wl.completed_at, wl.rpe,
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
      ORDER BY wl.completed_at DESC
    `, [id]);

    return { student, activePlan, workouts, logs };
  });

  // -------------------------------------------------------------------
  // Marcar revisão de um vídeo (coach comenta) — caminho de escrita
  // -------------------------------------------------------------------
  app.patch<{ Params: { id: string }; Body: { coach_video_comment?: string } }>(
    "/api/feedbacks/:id/review",
    async (req, reply) => {
      const { id } = req.params;
      const comment = (req.body?.coach_video_comment ?? "").trim();
      if (!comment) {
        return reply.code(400).send({ error: "Comentário do coach é obrigatório." });
      }
      const updated = await queryOne(`
        UPDATE exercise_feedbacks
        SET coach_video_comment=$1, video_status='reviewed'
        WHERE id=$2
        RETURNING id, coach_video_comment, video_status
      `, [comment, id]);

      if (!updated) return reply.code(404).send({ error: "Feedback não encontrado." });
      return updated;
    }
  );
}

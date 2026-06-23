import type { FastifyInstance } from "fastify";
import { query, queryOne, pool } from "../db.js";

interface FeedbackInput {
  workout_exercise_id: string;
  weight_used?: number | null;
  reps_performed?: number | null;
  video_url?: string | null;
}

export async function logRoutes(app: FastifyInstance) {
  // -------------------------------------------------------------------
  // Detalhe completo de um log (alimenta ShareableCard + revisão do coach)
  // -------------------------------------------------------------------
  app.get<{ Params: { id: string } }>("/api/logs/:id", async (req, reply) => {
    const { id } = req.params;

    const log = await queryOne(`
      SELECT wl.id, wl.completed_at, wl.rpe,
             wl.general_student_feedback, wl.general_coach_feedback,
             u.id AS student_id, u.name AS student_name, u.instagram_handle,
             w.id AS workout_id, w.target_focus, w.day_sequence,
             tp.title AS plan_title
      FROM workout_logs wl
      JOIN users u  ON u.id = wl.student_id
      JOIN workouts w ON w.id = wl.workout_id
      JOIN training_plans tp ON tp.id = w.training_plan_id
      WHERE wl.id=$1
    `, [id]);

    if (!log) return reply.code(404).send({ error: "Registro não encontrado." });

    const feedbacks = await query(`
      SELECT ef.id, we.exercise_name, we.sets, we.reps_range, we.sequence_order,
             ef.weight_used, ef.reps_performed,
             ef.video_url, ef.video_status, ef.coach_video_comment
      FROM exercise_feedbacks ef
      JOIN workout_exercises we ON we.id = ef.workout_exercise_id
      WHERE ef.workout_log_id=$1
      ORDER BY we.sequence_order
    `, [id]);

    const tonnage = feedbacks.reduce((acc: number, f: any) => {
      const w = Number(f.weight_used) || 0;
      const reps = Number(f.reps_performed) || 0;
      const sets = Number(f.sets) || 0;
      return acc + sets * reps * w;
    }, 0);

    return { log, feedbacks, tonnage };
  });

  // -------------------------------------------------------------------
  // Criar um log de treino (aluno registra a sessão) — caminho de escrita
  // -------------------------------------------------------------------
  app.post<{
    Body: {
      student_id: string;
      workout_id: string;
      rpe?: number | null;
      general_student_feedback?: string | null;
      feedbacks?: FeedbackInput[];
    };
  }>("/api/logs", async (req, reply) => {
    const { student_id, workout_id, rpe, general_student_feedback, feedbacks } =
      req.body ?? ({} as any);

    if (!student_id || !workout_id) {
      return reply
        .code(400)
        .send({ error: "student_id e workout_id são obrigatórios." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const logRes = await client.query(
        `INSERT INTO workout_logs (student_id, workout_id, rpe, general_student_feedback)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [student_id, workout_id, rpe ?? null, general_student_feedback ?? null]
      );
      const logId = logRes.rows[0].id;

      for (const f of feedbacks ?? []) {
        await client.query(
          `INSERT INTO exercise_feedbacks
             (workout_log_id, workout_exercise_id, weight_used, reps_performed, video_url, video_status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            logId,
            f.workout_exercise_id,
            f.weight_used ?? null,
            f.reps_performed ?? null,
            f.video_url ?? null,
            "pending",
          ]
        );
      }

      await client.query("COMMIT");
      return reply.code(201).send({ id: logId });
    } catch (err) {
      await client.query("ROLLBACK");
      req.log.error(err);
      return reply.code(500).send({ error: "Falha ao registrar o treino." });
    } finally {
      client.release();
    }
  });

  // -------------------------------------------------------------------
  // Coach responde o feedback geral da sessão
  // -------------------------------------------------------------------
  app.patch<{ Params: { id: string }; Body: { general_coach_feedback?: string } }>(
    "/api/logs/:id",
    async (req, reply) => {
      const { id } = req.params;
      const feedback = (req.body?.general_coach_feedback ?? "").trim();
      if (!feedback) {
        return reply.code(400).send({ error: "Feedback do coach é obrigatório." });
      }
      const updated = await queryOne(`
        UPDATE workout_logs SET general_coach_feedback=$1
        WHERE id=$2 RETURNING id, general_coach_feedback
      `, [feedback, id]);

      if (!updated) return reply.code(404).send({ error: "Registro não encontrado." });
      return updated;
    }
  );
}

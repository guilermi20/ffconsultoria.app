import type { FastifyInstance } from "fastify";
import { query, queryOne } from "../db.js";

export async function workoutRoutes(app: FastifyInstance) {
  // Treino com seus exercícios (usado na Área do Aluno para executar/logar)
  app.get<{ Params: { id: string } }>("/api/workouts/:id", async (req, reply) => {
    const { id } = req.params;

    const workout = await queryOne(`
      SELECT w.id, w.day_sequence, w.target_focus, w.template_title,
             tp.id AS plan_id, tp.title AS plan_title,
             u.id AS student_id, u.name AS student_name
      FROM workouts w
      JOIN training_plans tp ON tp.id = w.training_plan_id
      JOIN users u           ON u.id = tp.student_id
      WHERE w.id=$1
    `, [id]);

    if (!workout) return reply.code(404).send({ error: "Treino não encontrado." });

    const exercises = await query(`
      SELECT id, exercise_name, sets, reps_range, rest_seconds, notes, sequence_order
      FROM workout_exercises WHERE workout_id=$1
      ORDER BY sequence_order
    `, [id]);

    return { workout, exercises };
  });
}

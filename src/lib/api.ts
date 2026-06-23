"use client";

import { useCallback, useEffect, useState } from "react";

// Por padrão a API é servida na MESMA origem (Route Handlers em /api),
// então usamos caminho relativo — sem CORS e sem configuração de URL.
// Opcionalmente, defina NEXT_PUBLIC_API_URL para apontar a um backend externo.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// ---------------------------------------------------------------------
// Tipos do domínio (espelham as respostas do backend)
// ---------------------------------------------------------------------
export interface StudentSummary {
  id: string;
  name: string;
  email: string;
  instagram_handle: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  active_plan_id: string | null;
  active_plan_title: string | null;
  total_logs: number;
  last_log_at: string | null;
  pending_videos: number;
}

export interface Exercise {
  id: string;
  exercise_name: string;
  sets: number;
  reps_range: string;
  rest_seconds: number;
  notes: string | null;
  muscle_group: string | null;
  target_weight: string | null;
  rest_after_seconds: number | null;
  sequence_order: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string | null;
}

export interface Template {
  id: string;
  template_title: string;
  target_focus: string;
  created_at: string;
  exercises: Exercise[];
}

export interface Workout {
  id: string;
  day_sequence: number;
  target_focus: string;
  template_title: string | null;
  created_at?: string;
  exercises?: Exercise[];
}

export interface LogSummary {
  id: string;
  completed_at: string;
  rpe: number | null;
  general_student_feedback: string | null;
  general_coach_feedback: string | null;
  workout_id: string;
  workout_focus: string;
  day_sequence: number;
  exercises_count: number;
  pending_videos: number;
  skipped_count: number;
  tonnage: number;
}

export interface CoachAnalytics {
  volumeByMuscle: Array<{ muscle: string; volume: number }>;
  ranking: Array<{
    id: string;
    name: string;
    avatar_url: string | null;
    sessions: number;
    last_log_at: string | null;
    volume30: number;
  }>;
  skippedReasons: Array<{ reason: string; n: number }>;
}

export interface StudentAnalytics {
  prs: Array<{ exercise: string; pr: number; e1rm: number }>;
  volumeByMuscle: Array<{ muscle: string; volume: number }>;
}

export interface CoachCalendar {
  schedule: Array<{
    student_id: string;
    student_name: string;
    avatar_url: string | null;
    workout_id: string;
    day_sequence: number;
    target_focus: string;
  }>;
  logs: Array<{
    id: string;
    student_id: string;
    student_name: string;
    avatar_url: string | null;
    workout_id: string;
    completed_at: string;
    target_focus: string;
    total: number;
    skipped: number;
  }>;
}

export interface StudentDetail {
  student: {
    id: string;
    name: string;
    email: string;
    instagram_handle: string;
    avatar_url: string | null;
    is_active: boolean;
    goal: string | null;
    role: string;
    created_at: string;
  };
  activePlan: {
    id: string;
    title: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
  } | null;
  workouts: Workout[];
  logs: LogSummary[];
}

export interface FeedbackRow {
  id: string;
  exercise_name: string;
  sets: number;
  reps_range: string;
  sequence_order: number;
  muscle_group: string | null;
  target_weight: string | null;
  weight_used: string | null;
  reps_performed: number | null;
  video_url: string | null;
  video_status: "pending" | "reviewed";
  coach_video_comment: string | null;
  skipped: boolean;
  skip_reason: string | null;
  student_note: string | null;
}

export interface LogDetail {
  log: {
    id: string;
    completed_at: string;
    rpe: number | null;
    general_student_feedback: string | null;
    general_coach_feedback: string | null;
    pump_photo_url: string | null;
    student_id: string;
    student_name: string;
    instagram_handle: string;
    workout_id: string;
    target_focus: string;
    day_sequence: number;
    plan_title: string;
  };
  feedbacks: FeedbackRow[];
  tonnage: number;
}

export interface CoachOverview {
  kpis: {
    students: number;
    active_plans: number;
    pending_videos: number;
    logs_week: number;
  };
  pendingVideos: Array<{
    feedback_id: string;
    log_id: string;
    student_id: string;
    student_name: string;
    instagram_handle: string;
    avatar_url: string | null;
    exercise_name: string;
    weight_used: string | null;
    reps_performed: number | null;
    video_url: string;
    target_focus: string;
    completed_at: string;
  }>;
  recentActivity: Array<{
    log_id: string;
    student_id: string;
    student_name: string;
    avatar_url: string | null;
    target_focus: string;
    rpe: number | null;
    completed_at: string;
    coach_replied: boolean;
    pending_videos: number;
  }>;
  weeklyVolume: Array<{ week_label: string; volume: number }>;
}

// ---------------------------------------------------------------------
// Cliente HTTP minimalista
// ---------------------------------------------------------------------
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

export async function apiSend<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body: unknown
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `${method} ${path} → ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}

// ---------------------------------------------------------------------
// Hook de carregamento com estados (loading / error / data + refetch)
// ---------------------------------------------------------------------
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!!path);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<T>(path);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch, setData };
}

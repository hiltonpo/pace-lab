import type {
  CreateWorkoutInput,
  ActualWorkoutResponse,
} from "@pace-lab/shared";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

/**
 * 記錄一次訓練
 */
export async function createWorkout(
  input: CreateWorkoutInput
): Promise<ActualWorkoutResponse> {
  const res = await fetch(`${apiBase}/api/workouts`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to create workout");
  }

  return res.json();
}

/**
 * 列出訓練紀錄（可篩選 planId / 日期範圍）
 */
export async function listWorkouts(params?: {
  planId?: string;
  from?: string;
  to?: string;
}): Promise<ActualWorkoutResponse[]> {
  const query = new URLSearchParams();
  if (params?.planId) query.set("planId", params.planId);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);

  const qs = query.toString();
  const url = `${apiBase}/api/workouts${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch workouts");
  return res.json();
}

/**
 * 刪除訓練紀錄
 */
export async function deleteWorkout(id: string): Promise<void> {
  const res = await fetch(`${apiBase}/api/workouts/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete workout");
}

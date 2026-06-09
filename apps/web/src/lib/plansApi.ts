import type {
  CreatePlanInput,
  PlanDetail,
  PlanSummary,
} from "@pace-lab/shared";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

/**
 * 建立新計畫
 */
export async function createPlan(input: CreatePlanInput): Promise<PlanDetail> {
  const res = await fetch(`${apiBase}/api/plans`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to create plan");
  }

  return res.json();
}

/**
 * 列出我的所有計畫
 */
export async function listPlans(): Promise<PlanSummary[]> {
  const res = await fetch(`${apiBase}/api/plans`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch plans");
  }

  return res.json();
}

/**
 * 取得單一計畫詳情
 */
export async function getPlanDetail(id: string): Promise<PlanDetail> {
  const res = await fetch(`${apiBase}/api/plans/${id}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch plan");
  }

  return res.json();
}

/**
 * 刪除計畫
 */
export async function deletePlan(id: string): Promise<void> {
  const res = await fetch(`${apiBase}/api/plans/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to delete plan");
  }
}

import type { CreatePRInput, PersonalRecordResponse } from "@pace-lab/shared";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export const listPRs = async (): Promise<PersonalRecordResponse[]> => {
  const res = await fetch(`${apiBase}/api/prs`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch PRs");
  return res.json();
};

export const createPR = async (
  input: CreatePRInput
): Promise<PersonalRecordResponse> => {
  const res = await fetch(`${apiBase}/api/prs`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to create PR");
  }
  return res.json();
};

export const deletePR = async (id: string): Promise<void> => {
  const res = await fetch(`${apiBase}/api/prs/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete PR");
};

import type { FitLap, MainSetAnalysis } from "@pace-lab/shared";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export type FitParseResult = {
  date: string | null;
  distanceKm: number | null;
  durationSec: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  sport: string | null;
  laps: FitLap[];
  mainSet: MainSetAnalysis | null;
};

export const parseFit = async (file: File): Promise<FitParseResult> => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${apiBase}/api/fit/parse`, {
    method: "POST",
    credentials: "include",
    body: formData, // 不設 Content-Type，瀏覽器自動加 boundary
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "解析失敗" }));
    throw new Error(error.error || "解析失敗");
  }
  return res.json();
};

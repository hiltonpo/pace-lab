import { z } from "zod";
/**
 * 比賽類型。
 * 注意：值是 lowercase + snake_case 慣例，跟 URL 友好。
 */
export const raceTypeSchema = z.enum([
  "marathon",
  "half_marathon",
  "10k",
  "5k",
]);

export type RaceType = z.infer<typeof raceTypeSchema>;

/**
 * 各賽事的標準距離（公里）。
 * 用於 VDOT 計算公式。
 */
export const RACE_DISTANCE_KM: Record<RaceType, number> = {
  marathon: 42.195,
  half_marathon: 21.0975,
  "10k": 10,
  "5k": 5,
};

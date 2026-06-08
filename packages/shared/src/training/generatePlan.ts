import { calculateTrainingPaces, type PaceType } from "./vdot.js";
import { type RaceType } from "./raceType.js";
import {
  MARATHON_8_WEEKS,
  MARATHON_12_WEEKS,
  MARATHON_16_WEEKS,
} from "./templates/marathon-templates.js";
import type { PlanTemplate, WorkoutTemplate } from "./templates/types.js";

/**
 * 支援的計畫週數。
 * 之後加新長度時擴充這裡跟下面的 template map。
 */
export const SUPPORTED_WEEKS = [8, 12, 16] as const;
export type WeeksTotal = (typeof SUPPORTED_WEEKS)[number];

/**
 * 演算法產出的單一 workout——已套用個人化配速。
 * 這是準備要存進 DB 的 PlannedWorkout 格式（少了 id、planId、createdAt）。
 */
export type GeneratedWorkout = {
  weekNumber: number; // 1〜N
  dayOfWeek: number; // 0=Sun, 6=Sat
  workoutType: string; // "rest" | "easy" | "long" | "tempo" | ...
  targetPaceSec: number | null; // 秒/km
  targetDistanceKm: number | null;
  targetDurationSec: number | null;
  notes: string | null;
};

/**
 * 完整產生計畫的回傳值。
 */
export type GeneratedPlan = {
  vdot: number;
  workouts: GeneratedWorkout[];
};

/**
 * 根據比賽類型 + 週數查找對應模板。
 */
const getTemplate = (raceType: RaceType, weeksTotal: WeeksTotal): PlanTemplate => {
  if (raceType === "marathon") {
    if (weeksTotal === 8) return MARATHON_8_WEEKS;
    if (weeksTotal === 12) return MARATHON_12_WEEKS;
    if (weeksTotal === 16) return MARATHON_16_WEEKS;
  }
  // 之後加 half_marathon、10k、5k 的模板會擴充這裡
  throw new Error(
    `No template available for raceType=${raceType}, weeksTotal=${weeksTotal}`
  );
}

/**
 * 把單一 WorkoutTemplate（純結構）轉換成 GeneratedWorkout（含配速）。
 */
const expandWorkout = (
  template: WorkoutTemplate,
  weekNumber: number,
  dayOfWeek: number,
  paces: Record<PaceType, number>
): GeneratedWorkout => {
  if (template.type === "rest") {
    return {
      weekNumber,
      dayOfWeek,
      workoutType: "rest",
      targetPaceSec: null,
      targetDistanceKm: null,
      targetDurationSec: null,
      notes: null,
    };
  }

  if (template.type === "race") {
    return {
      weekNumber,
      dayOfWeek,
      workoutType: "race",
      targetPaceSec: null,
      targetDistanceKm: null,
      targetDurationSec: null,
      notes: "Race day! 比賽配速跑、依當天狀況微調。",
    };
  }

  // 其他類型：套用配速
  return {
    weekNumber,
    dayOfWeek,
    workoutType: template.type,
    targetPaceSec: paces[template.paceType],
    targetDistanceKm: template.distanceKm,
    targetDurationSec: null,
    notes: null,
  };
}

/**
 * 根據目標時間產生完整訓練計畫。
 *
 * @param raceType 比賽類型
 * @param goalTimeSec 目標完賽秒數
 * @param weeksTotal 計畫週數（8 / 12 / 16）
 * @returns 包含 VDOT 跟所有 workouts 的計畫
 */
export function generatePlan(
  raceType: RaceType,
  goalTimeSec: number,
  weeksTotal: WeeksTotal
): GeneratedPlan {
  // 1. 算出 VDOT 跟五種配速
  const { vdot, paces } = calculateTrainingPaces(raceType, goalTimeSec);

  // 2. 取對應模板
  const template = getTemplate(raceType, weeksTotal);

  // 3. 把模板展開成 GeneratedWorkout 陣列
  const workouts: GeneratedWorkout[] = [];
  template.forEach((weekTemplate, weekIndex) => {
    weekTemplate.forEach((workoutTemplate, dayOfWeek) => {
      const weekNumber = weekIndex + 1; // 第1週
      workouts.push(
        expandWorkout(workoutTemplate, weekNumber, dayOfWeek, paces)
      );
    });
  });

  return { vdot, workouts };
}

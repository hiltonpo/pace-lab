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
  warmupKm: number | null;
  cooldownKm: number | null;
  intervals: IntervalStructure | null;
  notes: string | null;
};

/**
 * Interval workout 的結構化資料。
 */
export type IntervalStructure = {
  sets: number; // 趟數
  setDistanceMeters: number; // 每趟距離（公尺）
  recoveryDurationSec: number; // 趟間恢復秒數
  recoveryType: "easy" | "rest"; // 恢復方式
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
const getTemplate = (
  raceType: RaceType,
  weeksTotal: WeeksTotal
): PlanTemplate => {
  if (raceType === "marathon") {
    if (weeksTotal === 8) return MARATHON_8_WEEKS;
    if (weeksTotal === 12) return MARATHON_12_WEEKS;
    if (weeksTotal === 16) return MARATHON_16_WEEKS;
  }
  // 之後加 half_marathon、10k、5k 的模板會擴充這裡
  throw new Error(
    `No template available for raceType=${raceType}, weeksTotal=${weeksTotal}`
  );
};

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
      warmupKm: null,
      cooldownKm: null,
      intervals: null,
      notes:
        "主動恢復：15-20 分鐘動態伸展、yoga 或滾筒按摩。心肺不受負荷即可。",
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
      warmupKm: null,
      cooldownKm: null,
      intervals: null,
      notes: "Race day! 比賽配速跑、依當天狀況微調。",
    };
  }

  // 其他類型質量課表：套用配速
  const isQuality = ["tempo", "marathon", "interval"].includes(template.type);

  return {
    weekNumber,
    dayOfWeek,
    workoutType: template.type,
    targetPaceSec: paces[template.paceType],
    targetDistanceKm: template.distanceKm,
    targetDurationSec: null,
    // quality workouts 才有 warmup / cooldown
    warmupKm: isQuality ? 2 : null,
    cooldownKm: isQuality ? 2 : null,
    // 只有 interval 有結構
    intervals:
      template.type === "interval"
        ? buildIntervalStructure(template.distanceKm)
        : null,
    notes: buildNotes(template.type),
  };
};

/**
 * 根據 interval workout 的目標距離，產生趟數結構。
 * 簡化邏輯：用 1km 一趟、湊到目標距離。
 */
function buildIntervalStructure(distanceKm: number): IntervalStructure {
  return {
    sets: Math.round(distanceKm), // 例如 8km → 8 趟
    setDistanceMeters: 1000, // 每趟 1km
    recoveryDurationSec: 180, // 趟間慢跑 3 分鐘
    recoveryType: "easy",
  };
}

/**
 * 根據 workout type 產生訓練提醒文字。
 */
function buildNotes(workoutType: string): string | null {
  switch (workoutType) {
    case "tempo":
      return "連續跑、不停。維持「舒服的吃力」強度，能在比賽撐 1 小時的配速。";
    case "marathon":
      return "用比賽配速持續跑，模擬實際比賽節奏。";
    case "interval":
      return "主段為間歇，每趟之間慢跑恢復。前後加 warm-up / cool-down。";
    case "easy":
    case "long":
    default:
      return null;
  }
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

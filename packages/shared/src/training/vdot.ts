import { RACE_DISTANCE_KM, type RaceType } from "./raceType.js";

/**
 * 根據 Jack Daniels 公式，從比賽成績反推 VDOT。
 *
 * 公式來源：Daniels' Running Formula 第四版
 *
 * 流程：
 * 1. 從距離跟時間算出「比賽速度」（公尺/分鐘）
 * 2. 用兩個經驗公式算出：
 *    - VO2：在此速度下需要的氧耗
 *    - %VO2max：以該速度需動用最大攝氧的比率
 * 3. VDOT = VO2 / %VO2max
 *
 * @param raceType 比賽類型（決定距離）
 * @param goalTimeSec 目標完賽時間（秒）
 * @returns VDOT 分數（整數，四捨五入）
 */
export const calculateVDOT = (raceType: RaceType, goalTimeSec: number) => {
  if (goalTimeSec <= 0) {
    throw new Error("goalTimeSec must be positive");
  }

  const distanceMeters = RACE_DISTANCE_KM[raceType] * 1000;
  const timeMinutes = goalTimeSec / 60;
  const velocityMetersPerMinute = distanceMeters / timeMinutes;

  // Jack Daniels 公式 1: 估算該速度的 VO2 需求
  const vo2 =
    -4.6 +
    0.182258 * velocityMetersPerMinute +
    0.000104 * velocityMetersPerMinute ** 2;

  // Jack Daniels 公式 2: 估算該時長下能維持的 %VO2max
  const percentVO2max =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeMinutes) +
    0.2989558 * Math.exp(-0.1932605 * timeMinutes);

  const vdot = vo2 / percentVO2max;

  return Math.round(vdot);
};

/**
 * 五種訓練配速類型。
 */
export type PaceType =
  | "easy" // E 配速
  | "marathon" // M 配速
  | "threshold" // T 配速（Tempo）
  | "interval" // I 配速
  | "repetition"; // R 配速
/**
 * 五種訓練配速的 Jack Daniels 標準縮寫。
 */
export const PACE_SHORT_LABELS: Record<PaceType, string> = {
  easy: "E",
  marathon: "M",
  threshold: "T",
  interval: "I",
  repetition: "R",
};
/**
 * 各訓練配速對應的 VDOT %強度。
 * 數值是 Jack Daniels 表的近似中間值。
 */
const PACE_INTENSITY: Record<PaceType, number> = {
  easy: 0.65, // E 配速 ≈ 65% vVO2max
  marathon: 0.76, // M 配速 ≈ 75.5% vVO2max
  threshold: 0.83, // T 配速（Tempo）≈ 83% vVO2max
  interval: 0.96, // I 配速 ≈ 96% vVO2max
  repetition: 1.05, // R 配速 ≈ 105% vVO2max（短時間能超過 100%）
};

/**
 * 根據 VDOT 算出某種訓練配速（秒/公里）。
 *
 * 用 vVO2max（達成最大攝氧的速度，公尺/分鐘）反推：
 * vVO2max = 29 + 5.355 * VDOT  （Jack Daniels 經驗公式）
 *
 * 訓練配速速度 = vVO2max * 強度比例
 * 換算成「秒/公里」：60000 / (公尺/分鐘)
 *
 * @param vdot 跑者 VDOT 分數
 * @param paceType 訓練類型
 * @returns 配速（秒/公里），整數
 */
export const calculatePace = (vdot: number, paceType: PaceType) => {
  if (vdot <= 0) {
    throw new Error("vdot must be positive");
  }

  // vVO2max 是「達成最大攝氧的速度」（公尺/分鐘）
  const vVO2max = 29 + 5.355 * vdot;

  // 對應訓練類型的速度
  const trainingVelocity = vVO2max * PACE_INTENSITY[paceType];

  // 速度 (公尺/分鐘) 轉「秒/公里」: 60000 公尺/小時 = 1000 公尺/分鐘配 60 秒
  // 公式：秒/公里 = 60000 / (公尺/分鐘)
  const paceSecPerKm = 60000 / trainingVelocity;

  return Math.round(paceSecPerKm);
};

/**
 * 一次算出 VDOT + 五種訓練配速。便利函式。
 */
export const calculateTrainingPaces = (
  raceType: RaceType,
  goalTimeSec: number
): { vdot: number; paces: Record<PaceType, number> } => {
  const vdot = calculateVDOT(raceType, goalTimeSec);
  return {
    vdot,
    paces: {
      easy: calculatePace(vdot, "easy"),
      marathon: calculatePace(vdot, "marathon"),
      threshold: calculatePace(vdot, "threshold"),
      interval: calculatePace(vdot, "interval"),
      repetition: calculatePace(vdot, "repetition"),
    },
  };
};

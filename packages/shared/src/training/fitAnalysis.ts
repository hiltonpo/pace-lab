/** FIT 解析出的單趟資料 */
export type FitLap = {
  index: number;
  distanceM: number | null;
  durationSec: number | null;
  avgHeartRate: number | null;
  paceSec: number | null;
};

/** 主段偵測結果 */
export type MainSetAnalysis = {
  /** 判定為主段的 lap index */
  mainSetIndexes: number[];
  /** 主段平均配速（秒/km） */
  mainSetPaceSec: number;
  /** 主段趟數 */
  sets: number;
  /** 主段每趟距離（公尺，取中位數） */
  setDistanceM: number;
};

/** 取中位數 */
const median = (nums: number[]): number => {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
};

/**
 * 從 laps 自動偵測 interval 主段（快跑段）。
 *
 * 原理：主段配速明顯快於恢復/熱身。用配速中位數當分界，
 * 比中位數快一定比例的 lap 判定為主段。
 *
 * @param laps FIT 解析出的所有 lap
 * @param thresholdRatio 判定門檻（預設 0.75 = 比中位數快 25% 以上算主段）
 * @returns 偵測結果，資料不足時回 null
 */
export const detectMainSet = (
  laps: FitLap[],
  thresholdRatio = 0.75
): MainSetAnalysis | null => {
  // 1. 濾掉雜訊：距離 < 50m 或沒配速的 lap
  const valid = laps.filter(
    (l) => l.paceSec !== null && l.distanceM !== null && l.distanceM >= 50
  );
  if (valid.length < 3) return null; // 太少無法判斷

  // 2. 配速中位數
  const paces = valid.map((l) => l.paceSec!);
  const medianPace = median(paces);
  const threshold = medianPace * thresholdRatio;

  // 3. 比中位數快 25% 以上 → 主段
  const mainSet = valid.filter((l) => l.paceSec! < threshold);
  const rest = valid.filter((l) => l.paceSec! >= threshold);
  if (mainSet.length < 2 || rest.length === 0) return null; // 至少 2 趟主段才算 interval

  // 4. 快慢差距要夠大（主段比休息快 30% 以上）
  const mainAvg = mainSet.reduce((s, l) => s + l.paceSec!, 0) / mainSet.length;
  const restAvg = rest.reduce((s, l) => s + l.paceSec!, 0) / rest.length;
  if (mainAvg > restAvg * 0.7) return null;

  // 5. 主段各趟距離要一致（interval 特性）
  const distances = mainSet.map((l) => l.distanceM!);
  const medianDist = median(distances);
  const consistent = distances.every(
    (d) => Math.abs(d - medianDist) / medianDist < 0.2
  );
  if (!consistent) return null;

  // 6. 主段平均配速（用總距離÷總時間，比「配速平均」準）
  const totalDistanceM = mainSet.reduce((sum, l) => sum + l.distanceM!, 0);
  const totalDurationSec = mainSet.reduce(
    (sum, l) => sum + (l.durationSec ?? 0),
    0
  );

  return {
    mainSetIndexes: mainSet.map((l) => l.index),
    mainSetPaceSec: Math.round(totalDurationSec / (totalDistanceM / 1000)),
    sets: mainSet.length,
    setDistanceM: medianDist,
  };
};

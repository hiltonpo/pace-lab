import type { IntervalStructure } from "./generatePlan.js";

/** interval 結構  */
export const formatIntervalParts = (intervals: IntervalStructure) => {
  const { sets, setDistanceMeters, recoveryDurationSec, recoveryType } =
    intervals;

  return {
    sets, // 趟數
    distance:
      setDistanceMeters >= 1000
        ? `${setDistanceMeters / 1000}km`
        : `${setDistanceMeters}m`, // 距離（已格式化）
    recoveryMin: Math.round(recoveryDurationSec / 60), // 恢復幾分鐘
    recoveryType, // "easy" or "rest"
  };
};

/**
 * 把秒數格式化為「H:MM:SS」或「MM:SS」字串。
 *
 * @example
 * formatDuration(14340) // "3:59:00"
 * formatDuration(3600)  // "1:00:00"
 * formatDuration(335)   // "5:35"
 */
export const formatDuration = (totalSec: number): string => {
  if (totalSec < 0) {
    throw new Error("totalSec cannot be negative");
  }

  const hour = Math.floor(totalSec / 3600);
  const minute = Math.floor((totalSec % 3600) / 60);
  const second = totalSec % 60;

  // 只有個位數時，十位數用0填充
  const mm = minute.toString().padStart(2, "0");
  const ss = second.toString().padStart(2, "0");

  if (hour > 0) {
    return `${hour}:${mm}:${ss}`;
  } else {
    return `${minute}:${ss}`;
  }
};

/**
 * 把配速（秒/公里）格式化為「M:SS/km」字串。
 *
 * @example
 * formatPace(335) // "5:35/km"
 * formatPace(283) // "4:43/km"
 */
export const formatPace = (paceSecPerKm: number): string => {
  return `${formatDuration(paceSecPerKm)}/km`;
};

/**
 * 把「H:MM:SS」或「MM:SS」字串解析回秒數。
 *
 * @example
 * parseDuration("3:59:00") // 14340
 * parseDuration("5:35")    // 335
 */
export function parseDuration(str: string): number {
  const trimmed = str.trim();

  // 檢查是否符合 hh:mm:ss 格式 (秒數和分鐘必須是兩位數 00~59)
  const isHms = /^\d+:[0-5]\d:[0-5]\d$/.test(trimmed);

  // 檢查是否符合 mm:ss 格式 (秒數必須是兩位數 00~59)
  const isMs = /^\d+:[0-5]\d$/.test(trimmed);

  if (!isHms && !isMs) {
    throw new Error(
      `Invalid duration format: ${str}. Expected hh:mm:ss or mm:ss with valid seconds.`
    );
  }

  const nums = trimmed.split(":").map(Number);

  if (nums.length === 3) {
    const [h, m, s] = nums;
    return h * 3600 + m * 60 + s;
  } else {
    const [m, s] = nums;
    return m * 60 + s;
  }
}

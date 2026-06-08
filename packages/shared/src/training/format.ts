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
  const parts = str.split(":").map(Number);

  if (parts.some(isNaN)) {
    throw new Error(`Invalid duration format: ${str}`);
  }

  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }
  throw new Error(`Invalid duration format: ${str}`);
}

import { describe, expect, test } from "vitest";
import {
  calculateVDOT,
  calculatePace,
  calculateTrainingPaces,
} from "./vdot.js";

describe("calculateVDOT", () => {
  // 基於 Daniels 表的標準對照
  test("sub-4 馬拉松應該算出 VDOT 38", () => {
    // 3:59:00 = 14340 秒
    expect(calculateVDOT("marathon", 14340)).toBe(38);
  });

  test("sub-3:30 馬拉松應該算出 VDOT 約 45", () => {
    // 3:29:00 = 12540 秒
    const vdot = calculateVDOT("marathon", 12540);
    expect(vdot).toBeGreaterThanOrEqual(44);
    expect(vdot).toBeLessThanOrEqual(46);
  });

  test("sub-1:40 半馬應該算出 VDOT 約 45", () => {
    // 1:39:00 = 5940 秒。Daniels 表 VDOT 45 ≈ 1:40:20，VDOT 46 ≈ 1:38:27
    // 1:39:00 落在 45〜46 之間
    const vdot = calculateVDOT("half_marathon", 5940);
    expect(vdot).toBeGreaterThanOrEqual(45);
    expect(vdot).toBeLessThanOrEqual(46);
  });

  test("跑得越快，VDOT 越高", () => {
    const slow = calculateVDOT("marathon", 18000); // 5 小時
    const fast = calculateVDOT("marathon", 12000); // 3:20
    expect(fast).toBeGreaterThan(slow);
  });

  test("負數時間應該 throw error", () => {
    expect(() => calculateVDOT("marathon", -100)).toThrow();
  });

  test("零秒應該 throw error", () => {
    expect(() => calculateVDOT("marathon", 0)).toThrow();
  });
});

describe("calculatePace", () => {
  test("VDOT 38 的 marathon 配速應該接近 5:40/km", () => {
    const pace = calculatePace(38, "marathon");
    // 5:35 = 335 秒，5:45 = 345 秒
    expect(pace).toBeGreaterThanOrEqual(335);
    expect(pace).toBeLessThanOrEqual(345);
  });

  test("VDOT 越高，同訓練類型的配速越快（秒數越小）", () => {
    const slowMarathon = calculatePace(35, "marathon");
    const fastMarathon = calculatePace(50, "marathon");
    expect(fastMarathon).toBeLessThan(slowMarathon);
  });

  test("同 VDOT 下，配速強度從慢到快依序是 easy > marathon > threshold > interval > repetition", () => {
    const vdot = 38;
    const easy = calculatePace(vdot, "easy");
    const marathon = calculatePace(vdot, "marathon");
    const threshold = calculatePace(vdot, "threshold");
    const interval = calculatePace(vdot, "interval");
    const repetition = calculatePace(vdot, "repetition");

    // 越快的訓練，秒/km 數值越小
    expect(easy).toBeGreaterThan(marathon);
    expect(marathon).toBeGreaterThan(threshold);
    expect(threshold).toBeGreaterThan(interval);
    expect(interval).toBeGreaterThan(repetition);
  });

  test("負 VDOT 應該 throw error", () => {
    expect(() => calculatePace(-5, "easy")).toThrow();
  });
});

describe("calculateTrainingPaces", () => {
  test("sub-4 馬拉松回傳 VDOT 38 + 五種配速", () => {
    const result = calculateTrainingPaces("marathon", 14340);

    expect(result.vdot).toBe(38);
    expect(result.paces.easy).toBeGreaterThan(0);
    expect(result.paces.marathon).toBeGreaterThan(0);
    expect(result.paces.threshold).toBeGreaterThan(0);
    expect(result.paces.interval).toBeGreaterThan(0);
    expect(result.paces.repetition).toBeGreaterThan(0);
  });

  test("配速彼此一致：marathon 配速跑完馬拉松距離應該接近目標時間", () => {
    const goalTimeSec = 14340; // 3:59:00
    const result = calculateTrainingPaces("marathon", goalTimeSec);

    // marathon 配速 × 42.195 km 應該接近目標時間
    const estimatedFinishSec = result.paces.marathon * 42.195;
    const diff = Math.abs(estimatedFinishSec - goalTimeSec);

    // 允許 2 分鐘誤差
    expect(diff).toBeLessThan(120);
  });
});

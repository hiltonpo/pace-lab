import type { PlanTemplate, WorkoutTemplate } from "./types.js";

// ============================================================================
// Workout 便利常數（避免到處寫 { type: "rest" } 之類）
// ============================================================================

const REST: WorkoutTemplate = { type: "rest" };
const RACE: WorkoutTemplate = { type: "race" };

const easy = (km: number): WorkoutTemplate => ({
  type: "easy",
  distanceKm: km,
  paceType: "easy",
});
const long = (km: number): WorkoutTemplate => ({
  type: "long",
  distanceKm: km,
  paceType: "easy",
});
const tempo = (km: number): WorkoutTemplate => ({
  type: "tempo",
  distanceKm: km,
  paceType: "threshold",
});
const mPace = (km: number): WorkoutTemplate => ({
  type: "marathon",
  distanceKm: km,
  paceType: "marathon",
});
const interval = (km: number): WorkoutTemplate => ({
  type: "interval",
  distanceKm: km,
  paceType: "interval",
});

// ============================================================================
// 8 週馬拉松計畫（短期 sharpening 用）
// 每行：[Sun, Mon, Tue, Wed, Thu, Fri, Sat]
// ============================================================================

export const MARATHON_8_WEEKS: PlanTemplate = [
  // Week 1: Base
  [long(12), REST, easy(6), easy(6), easy(5), REST, easy(6)],
  // Week 2: Base
  [long(14), REST, easy(6), easy(8), easy(5), REST, easy(7)],
  // Week 3: Base → 引入 tempo
  [long(16), REST, easy(7), tempo(6), easy(5), REST, easy(7)],
  // Week 4: Build
  [long(18), REST, easy(8), tempo(8), easy(6), REST, easy(7)],
  // Week 5: Build → 引入 marathon pace
  [long(20), REST, easy(8), mPace(10), easy(6), REST, easy(8)],
  // Week 6: Build → 引入 interval
  [long(22), REST, easy(8), interval(8), easy(6), REST, easy(8)],
  // Week 7: Peak
  [long(25), REST, easy(8), mPace(12), easy(6), REST, easy(8)],
  // Week 8: Taper + Race
  [RACE, REST, easy(5), tempo(4), easy(4), REST, easy(3)],
];

// ============================================================================
// 12 週馬拉松計畫（標準推薦）
// ============================================================================

export const MARATHON_12_WEEKS: PlanTemplate = [
  // Week 1-3: Base
  [long(10), REST, easy(5), easy(6), easy(4), REST, easy(5)],
  [long(12), REST, easy(6), easy(6), easy(5), REST, easy(6)],
  [long(14), REST, easy(6), easy(7), easy(5), REST, easy(6)],
  // Week 4-5: 引入 tempo
  [long(14), REST, easy(7), tempo(5), easy(5), REST, easy(7)],
  [long(16), REST, easy(7), tempo(6), easy(6), REST, easy(7)],
  // Week 6: 引入 marathon pace
  [long(18), REST, easy(8), mPace(8), easy(6), REST, easy(7)],
  // Week 7-8: Build
  [long(20), REST, easy(8), tempo(8), easy(6), REST, easy(8)],
  [long(22), REST, easy(8), interval(8), easy(6), REST, easy(8)],
  // Week 9-10: Peak
  [long(24), REST, easy(8), mPace(10), easy(6), REST, easy(8)],
  [long(28), REST, easy(8), mPace(12), easy(6), REST, easy(8)],
  // Week 11: 開始 Taper
  [long(16), REST, easy(7), tempo(6), easy(5), REST, easy(6)],
  // Week 12: Race
  [RACE, REST, easy(5), tempo(4), easy(4), REST, easy(3)],
];

// ============================================================================
// 16 週馬拉松計畫（紮實準備）
// ============================================================================

export const MARATHON_16_WEEKS: PlanTemplate = [
  // Week 1-4: Base
  [long(8), REST, easy(4), easy(5), easy(4), REST, easy(4)],
  [long(10), REST, easy(5), easy(5), easy(4), REST, easy(5)],
  [long(12), REST, easy(5), easy(6), easy(5), REST, easy(5)],
  [long(12), REST, easy(6), easy(6), easy(5), REST, easy(6)],
  // Week 5-7: 引入 tempo
  [long(14), REST, easy(6), tempo(5), easy(5), REST, easy(6)],
  [long(14), REST, easy(7), tempo(6), easy(6), REST, easy(6)],
  [long(16), REST, easy(7), tempo(6), easy(6), REST, easy(7)],
  // Week 8: 引入 marathon pace
  [long(18), REST, easy(7), mPace(8), easy(6), REST, easy(7)],
  // Week 9-10: Build
  [long(20), REST, easy(8), tempo(8), easy(6), REST, easy(8)],
  [long(22), REST, easy(8), interval(8), easy(6), REST, easy(8)],
  // Week 11-13: Peak (longest builds)
  [long(24), REST, easy(8), mPace(10), easy(7), REST, easy(8)],
  [long(26), REST, easy(8), tempo(10), easy(7), REST, easy(8)],
  [long(30), REST, easy(8), mPace(12), easy(7), REST, easy(8)],
  // Week 14-15: Taper start
  [long(22), REST, easy(8), tempo(8), easy(6), REST, easy(8)],
  [long(12), REST, easy(6), tempo(5), easy(5), REST, easy(6)],
  // Week 16: Race
  [RACE, REST, easy(5), tempo(4), easy(4), REST, easy(3)],
];

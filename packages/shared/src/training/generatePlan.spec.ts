import { describe, expect, test } from "vitest";
import { generatePlan, SUPPORTED_WEEKS } from "./generatePlan.js";

const SUB_4_MARATHON_SEC = 14340; // 3:59:00

describe("generatePlan - 結構驗證", () => {
  test.each(SUPPORTED_WEEKS)("%i 週計畫總 workout 數應為 N × 7", (weeks) => {
    const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, weeks);
    expect(plan.workouts.length).toBe(weeks * 7);
  });

  test.each(SUPPORTED_WEEKS)(
    "%i 週計畫的 weekNumber 應從 1 連續到 N",
    (weeks) => {
      const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, weeks);
      const weekNumbers = new Set(plan.workouts.map((w) => w.weekNumber));
      const expected = new Set(Array.from({ length: weeks }, (_, i) => i + 1));
      expect(weekNumbers).toEqual(expected);
    }
  );

  test.each(SUPPORTED_WEEKS)(
    "%i 週計畫每週應有 7 天 (dayOfWeek 0〜6)",
    (weeks) => {
      const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, weeks);
      for (let week = 1; week <= weeks; week++) {
        const days = plan.workouts
          .filter((w) => w.weekNumber === week)
          .map((w) => w.dayOfWeek)
          .sort();
        expect(days).toEqual([0, 1, 2, 3, 4, 5, 6]);
      }
    }
  );
});

describe("generatePlan - VDOT 與配速", () => {
  test("sub-4 馬拉松產出 VDOT 38", () => {
    const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, 12);
    expect(plan.vdot).toBe(38);
  });

  test("Easy workouts 套用 easy 配速 (約 6:37/km = 397 秒)", () => {
    const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, 12);
    const easyWorkouts = plan.workouts.filter((w) => w.workoutType === "easy");

    expect(easyWorkouts.length).toBeGreaterThan(0);
    // 所有 easy workout 配速一致
    const paces = new Set(easyWorkouts.map((w) => w.targetPaceSec));
    expect(paces.size).toBe(1);
    // 配速合理範圍（6:25 〜 6:50/km）
    const pace = easyWorkouts[0].targetPaceSec!;
    expect(pace).toBeGreaterThanOrEqual(385);
    expect(pace).toBeLessThanOrEqual(410);
  });

  test("Marathon pace workouts 套用 marathon 配速 (約 5:40/km = 340 秒)", () => {
    const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, 12);
    const mPaceWorkouts = plan.workouts.filter(
      (w) => w.workoutType === "marathon"
    );

    expect(mPaceWorkouts.length).toBeGreaterThan(0);
    const pace = mPaceWorkouts[0].targetPaceSec!;
    expect(pace).toBeGreaterThanOrEqual(335);
    expect(pace).toBeLessThanOrEqual(345);
  });

  test("Long runs 用 easy 配速（不是更快）", () => {
    const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, 12);
    const longRuns = plan.workouts.filter((w) => w.workoutType === "long");
    const easyWorkouts = plan.workouts.filter((w) => w.workoutType === "easy");

    expect(longRuns[0].targetPaceSec).toBe(easyWorkouts[0].targetPaceSec);
  });

  test("Rest day 沒有配速跟距離", () => {
    const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, 12);
    const restDays = plan.workouts.filter((w) => w.workoutType === "rest");

    restDays.forEach((w) => {
      expect(w.targetPaceSec).toBeNull();
      expect(w.targetDistanceKm).toBeNull();
      expect(w.targetDurationSec).toBeNull();
    });
  });

  test("Race day 沒有配速但有 notes", () => {
    const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, 12);
    const raceDay = plan.workouts.find((w) => w.workoutType === "race");

    expect(raceDay).toBeDefined();
    expect(raceDay!.targetPaceSec).toBeNull();
    expect(raceDay!.targetDistanceKm).toBeNull();
    expect(raceDay!.notes).toContain("Race day");
  });
});

describe("generatePlan - 訓練哲學", () => {
  // 計算某週的總里程（用 reduce）
  const weekTotalKm = (plan: ReturnType<typeof generatePlan>, week: number) =>
    plan.workouts
      .filter((w) => w.weekNumber === week)
      .reduce((sum, w) => sum + (w.targetDistanceKm ?? 0), 0);

  test.each(SUPPORTED_WEEKS)(
    "%i 週計畫: Peak 週的總里程應該比 Week 1 高",
    (weeks) => {
      const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, weeks);
      const week1Km = weekTotalKm(plan, 1);
      // Peak week 一般在倒數第二或第三週
      const peakWeek = weeks - 2;
      const peakKm = weekTotalKm(plan, peakWeek);

      expect(peakKm).toBeGreaterThan(week1Km);
    }
  );

  test.each(SUPPORTED_WEEKS)(
    "%i 週計畫: 最後一週 (Race week) 的總里程應該明顯低於 Peak",
    (weeks) => {
      const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, weeks);
      const peakWeek = weeks - 2;
      const peakKm = weekTotalKm(plan, peakWeek);
      const raceWeekKm = weekTotalKm(plan, weeks);

      // Taper 應該至少減半
      expect(raceWeekKm).toBeLessThan(peakKm * 0.5);
    }
  );

  test.each(SUPPORTED_WEEKS)(
    "%i 週計畫: 每週至少 2 天休息（rest 或 race）",
    (weeks) => {
      const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, weeks);
      for (let week = 1; week <= weeks; week++) {
        const restCount = plan.workouts.filter(
          (w) =>
            w.weekNumber === week &&
            (w.workoutType === "rest" || w.workoutType === "race")
        ).length;
        expect(restCount).toBeGreaterThanOrEqual(2);
      }
    }
  );

  test.each(SUPPORTED_WEEKS)(
    "%i 週計畫: 每週日 (dayOfWeek=0) 應是 long run 或 race",
    (weeks) => {
      const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, weeks);
      const sundays = plan.workouts.filter((w) => w.dayOfWeek === 0);

      sundays.forEach((sunday) => {
        expect(["long", "race"]).toContain(sunday.workoutType);
      });
    }
  );

  test("12 週計畫: 最長 long run 至少 26km（馬拉松準備門檻）", () => {
    const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, 12);
    const longRuns = plan.workouts.filter((w) => w.workoutType === "long");
    const maxDistance = Math.max(...longRuns.map((w) => w.targetDistanceKm!));

    expect(maxDistance).toBeGreaterThanOrEqual(26);
  });

  test("16 週計畫: 最長 long run 至少 28km", () => {
    const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, 16);
    const longRuns = plan.workouts.filter((w) => w.workoutType === "long");
    const maxDistance = Math.max(...longRuns.map((w) => w.targetDistanceKm!));

    expect(maxDistance).toBeGreaterThanOrEqual(28);
  });
});

describe("generatePlan - 錯誤處理", () => {
  test("不支援的週數應該 throw", () => {
    expect(() =>
      generatePlan("marathon", SUB_4_MARATHON_SEC, 10 as any)
    ).toThrow();
  });

  test("尚未支援的 race type 應該 throw", () => {
    expect(() => generatePlan("half_marathon", 6000, 12)).toThrow();
  });
});

describe("generatePlan - 訓練細節結構（Sprint 3）", () => {
  test("Interval workout 有結構化的 intervals", () => {
    const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, 16);
    const interval = plan.workouts.find((w) => w.workoutType === "interval");

    expect(interval).toBeDefined();
    expect(interval!.intervals).not.toBeNull();
    expect(interval!.intervals!.sets).toBeGreaterThan(0);
    expect(interval!.intervals!.setDistanceMeters).toBe(1000);
    expect(interval!.intervals!.recoveryDurationSec).toBeGreaterThan(0);
  });

  test("Quality workouts 有 warm-up / cool-down", () => {
    const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, 16);
    const qualityTypes = ["tempo", "marathon", "interval"];

    plan.workouts
      .filter((w) => qualityTypes.includes(w.workoutType))
      .forEach((w) => {
        expect(w.warmupKm).not.toBeNull();
        expect(w.cooldownKm).not.toBeNull();
      });
  });

  test("Easy / Long workouts 不需要 warm-up / cool-down", () => {
    const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, 16);

    plan.workouts
      .filter((w) => ["easy", "long"].includes(w.workoutType))
      .forEach((w) => {
        expect(w.warmupKm).toBeNull();
        expect(w.cooldownKm).toBeNull();
      });
  });

  test("Tempo workout 的 notes 提到連續跑", () => {
    const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, 16);
    const tempo = plan.workouts.find((w) => w.workoutType === "tempo");

    expect(tempo!.notes).toContain("連續");
  });

  test("只有 interval 有 intervals 結構，其他都 null", () => {
    const plan = generatePlan("marathon", SUB_4_MARATHON_SEC, 16);

    plan.workouts
      .filter((w) => w.workoutType !== "interval")
      .forEach((w) => {
        expect(w.intervals).toBeNull();
      });
  });
});

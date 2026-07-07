import { z } from "zod";

export const WEATHER_OPTIONS = [
  "sunny",
  "cloudy",
  "rainy",
  "hot",
  "cold",
  "windy",
] as const;

export const FEELING_OPTIONS = [
  "great",
  "good",
  "normal",
  "tired",
  "exhausted",
] as const;
// ============================================================================
// POST /api/workouts - 建立訓練紀錄
// ============================================================================

export const workoutObjectSchema = z.object({
  plannedWorkoutId: z.string().optional().nullable(),
  planId: z.string().optional().nullable(),
  date: z.string().datetime(),
  workoutType: z.string().min(1),
  actualDistanceKm: z
    .number({ message: "errors.distance.required" })
    .positive({ message: "errors.distance.positive" })
    .max(500, { message: "errors.distance.max" }),
  actualDurationSec: z
    .number({ message: "errors.time.required" })
    .int()
    .positive({ message: "errors.time.positive" })
    .max(86400, { message: "errors.time.max" }),
  // 以下全可選
  avgHeartRate: z
    .number({ message: "errors.avgHr.number" })
    .int({ message: "errors.avgHr.integer" })
    .min(30, { message: "errors.hr.range" })
    .max(250, { message: "errors.hr.range" })
    .optional()
    .nullable(),
  maxHeartRate: z
    .number({ message: "errors.maxHr.number" })
    .int({ message: "errors.maxHr.integer" })
    .min(30, { message: "errors.hr.range" })
    .max(250, { message: "errors.hr.range" })
    .optional()
    .nullable(),
  /**
   * RPE (Rate of Perceived Exertion) — 主觀費力程度，1-10 量表。
   * 補足心率數據的不足（心率有延遲、受咖啡因/睡眠/天氣影響）。
   * 1-2: 非常輕鬆（走路）
   * 3-4: 輕鬆，能完整對話（Easy run）
   * 5-6: 中等，講話會喘（Long run / Marathon pace）
   * 7-8: 吃力，只能講短句（Tempo / Threshold）
   * 9:   非常吃力（Interval）
   * 10:  全力衝刺
   */
  rpe: z
    .number({ message: "errors.rpe.number" })
    .int({ message: "errors.rpe.integer" })
    .min(1, { message: "errors.rpe.range" })
    .max(10, { message: "errors.rpe.range" })
    .optional()
    .nullable(),
  /**
   * 訓練當下的天氣。影響配速表現的重要環境因素
   * （尤其台灣夏天高溫會明顯拉高同配速的心率與費力程度）。
   * sunny:  晴
   * cloudy: 多雲 / 陰
   * rainy:  雨
   * hot:    高溫（約 30°C 以上，影響表現）
   * cold:   低溫
   * windy:  強風
   */
  weather: z
    .enum(WEATHER_OPTIONS, { message: "errors.weather.invalid" })
    .optional()
    .nullable(),
  temperatureC: z
    .number({ message: "errors.temp.number" })
    .min(-50, { message: "errors.temp.range" })
    .max(60, { message: "errors.temp.range" })
    .optional()
    .nullable(),
  /**
   * 訓練後的整體體感狀態。
   * great:     很好，輕鬆有餘力
   * good:      不錯，順順完成
   * normal:    普通，照表操課
   * tired:     有點累，撐完
   * exhausted: 非常累，很勉強
   */
  feeling: z
    .enum(FEELING_OPTIONS, { message: "errors.feeling.invalid" })
    .optional()
    .nullable(),
  notes: z.string().max(1000).optional().nullable(),
  /** interval 主段平均配速（秒/km），只有 interval 訓練填 */
  mainSetPaceSec: z
    .number({ message: "errors.pace.number" })
    .int()
    .positive({ message: "errors.pace.positive" })
    .max(1800, { message: "errors.pace.unreasonable" })
    .optional()
    .nullable(),
});

export const createWorkoutInputSchema = workoutObjectSchema.refine(
  (data) => {
    if (data.avgHeartRate != null && data.maxHeartRate != null) {
      return data.maxHeartRate >= data.avgHeartRate;
    }
    return true; // 任一沒填就不檢查
  },
  {
    message: "errors.hr.order",
    path: ["maxHeartRate"],
  }
);
export type CreateWorkoutInput = z.infer<typeof createWorkoutInputSchema>;

// ============================================================================
// PATCH /api/workouts/:id - 部分更新
// ============================================================================

/**
 * 部分更新：所有欄位變可選。
 * .partial() 把 createWorkoutInputSchema 的每個欄位都變 optional。
 */
export const updateWorkoutInputSchema = workoutObjectSchema.partial().refine(
  (data) => {
    if (data.avgHeartRate != null && data.maxHeartRate != null) {
      return data.maxHeartRate >= data.avgHeartRate;
    }
    return true; // 任一沒填就不檢查
  },
  {
    message: "errors.hr.order",
    path: ["maxHeartRate"],
  }
);

export type UpdateWorkoutInput = z.infer<typeof updateWorkoutInputSchema>;

// ============================================================================
// GET /api/workouts - 列表查詢篩選
// ============================================================================

export const listWorkoutsQuerySchema = z.object({
  planId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type ListWorkoutsQuery = z.infer<typeof listWorkoutsQuerySchema>;

// ============================================================================
// Response schema
// ============================================================================

export const actualWorkoutSchema = z.object({
  id: z.string(),
  userId: z.string(),
  plannedWorkoutId: z.string().nullable(),
  planId: z.string().nullable(),
  date: z.string().datetime(),
  workoutType: z.string(),
  actualDistanceKm: z.number(),
  actualDurationSec: z.number().int(),
  actualPaceSec: z.number().int().nullable(),
  mainSetPaceSec: z.number().int().nullable(),
  avgHeartRate: z.number().int().nullable(),
  maxHeartRate: z.number().int().nullable(),
  rpe: z.number().int().nullable(),
  weather: z.string().nullable(),
  temperatureC: z.number().nullable(),
  feeling: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type ActualWorkoutResponse = z.infer<typeof actualWorkoutSchema>;

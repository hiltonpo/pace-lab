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
    .number({ message: "請輸入距離" })
    .positive({ message: "距離必須大於 0" })
    .max(500, { message: "距離不可超過 500km" }),
  actualDurationSec: z
    .number({ message: "請輸入時間" })
    .int()
    .positive({ message: "時間必須大於 0" })
    .max(86400, { message: "時間不可超過 24 小時" }),
  // 以下全可選
  avgHeartRate: z
    .number({ message: "平均心率必須是數字" })
    .int({ message: "平均心率必須是整數" })
    .min(30, { message: "平均心率範圍是 30-250" })
    .max(250, { message: "平均心率範圍是 30-250" })
    .optional()
    .nullable(),
  maxHeartRate: z
    .number({ message: "最大心率必須是數字" })
    .int({ message: "最大心率必須是整數" })
    .min(30, { message: "最大心率範圍是 30-250" })
    .max(250, { message: "最大心率範圍是 30-250" })
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
    .number({ message: "RPE 必須是數字" })
    .int({ message: "RPE 必須是整數" })
    .min(1, { message: "RPE 範圍是 1-10（1=非常輕鬆，10=全力）" })
    .max(10, { message: "RPE 範圍是 1-10（1=非常輕鬆，10=全力）" })
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
    .enum(WEATHER_OPTIONS, {
      message:
        "weather 必須是：sunny / cloudy / rainy / hot / cold / windy 之一",
    })
    .optional()
    .nullable(),
  temperatureC: z
    .number({ message: "溫度必須是數字" })
    .min(-50, { message: "溫度範圍是 -50 至 60°C" })
    .max(60, { message: "溫度範圍是 -50 至 60°C" })
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
    .enum(FEELING_OPTIONS, {
      message: "feeling 必須是：great / good / normal / tired / exhausted 之一",
    })
    .optional()
    .nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const createWorkoutInputSchema = workoutObjectSchema.refine(
  (data) => {
    if (data.avgHeartRate != null && data.maxHeartRate != null) {
      return data.maxHeartRate >= data.avgHeartRate;
    }
    return true; // 任一沒填就不檢查
  },
  {
    message: "最大心率不應低於平均心率",
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
    message: "最大心率不應低於平均心率",
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

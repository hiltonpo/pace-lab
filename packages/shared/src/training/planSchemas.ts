import { z } from "zod";
import { raceTypeSchema } from "./raceType.js";
import { SUPPORTED_WEEKS } from "./generatePlan.js";

// ============================================================================
// POST /api/plans - 建立計畫
// ============================================================================

/**
 * 建立計畫的請求 body schema。
 * 前端表單也用這份。
 */
export const createPlanInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "計畫名稱不可為空")
    .max(100, "名稱不可超過 100 字"),
  goalRaceType: raceTypeSchema,
  goalTimeSec: z
    .number()
    .int()
    .positive()
    .max(86400, "目標時間不可超過 24 小時"),
  weeksTotal: z.union([z.literal(8), z.literal(12), z.literal(16)]),
  startDate: z.string().datetime().optional().nullable(),
});

export type CreatePlanInput = z.infer<typeof createPlanInputSchema>;

// ============================================================================
// Response schemas
// ============================================================================

/**
 * 計畫摘要（列表頁用）—— 不含 workouts。
 */
export const planSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  goalRaceType: raceTypeSchema,
  goalTimeSec: z.number().int(),
  vdot: z.number().int(),
  status: z.string(),
  weeksTotal: z.number().int(),
  startDate: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type PlanSummary = z.infer<typeof planSummarySchema>;

/**
 * 單一 workout schema（詳情頁回傳）。
 */
export const plannedWorkoutSchema = z.object({
  id: z.string(),
  weekNumber: z.number().int(),
  dayOfWeek: z.number().int().min(0).max(6),
  workoutType: z.string(),
  targetPaceSec: z.number().int().nullable(),
  targetDistanceKm: z.number().nullable(),
  targetDurationSec: z.number().int().nullable(),
  notes: z.string().nullable(),
  warmupKm: z.number().nullable(),
  cooldownKm: z.number().nullable(),
  intervals: z
    .object({
      sets: z.number(),
      setDistanceMeters: z.number(),
      recoveryDurationSec: z.number(),
      recoveryType: z.enum(["easy", "rest"]),
    })
    .nullable(),
});

export type PlannedWorkoutResponse = z.infer<typeof plannedWorkoutSchema>;

/**
 * 計畫詳情（含 workouts）。
 */
export const planDetailSchema = planSummarySchema.extend({
  plannedWorkouts: z.array(plannedWorkoutSchema),
});

export type PlanDetail = z.infer<typeof planDetailSchema>;

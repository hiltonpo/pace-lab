// 先放一個 placeholder，Day 2 會在這裡放 Zod schemas
export const SHARED_VERSION = "0.0.1";

// 訓練相關
export * from "./training/raceType.js";
export * from "./training/vdot.js";
export * from "./training/format.js";

export * from "./training/generatePlan.js";
export * from "./training/workoutSchemas.js";
export type {
  WorkoutTemplate,
  WeekTemplate,
  PlanTemplate,
} from "./training/templates/types.js";
export * from "./training/planSchemas.js";
export * from "./training/prSchemas.js";

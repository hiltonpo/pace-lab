import type { PaceType } from "../vdot.js";

/**
 * 模板中的一個 workout（還沒套用個人化配速）。
 * 純資料結構，描述「這個 workout 是哪種類型、目標多少」。
 */
export type WorkoutTemplate =
  | {
      type: "rest";
    }
  | {
      type: "easy" | "long";
      distanceKm: number;
      paceType: "easy"; // easy 跟 long 都用 easy 配速
    }
  | {
      type: "tempo";
      distanceKm: number;
      paceType: "threshold";
    }
  | {
      type: "marathon"; // marathon pace workout（不是賽事本身）
      distanceKm: number;
      paceType: "marathon";
    }
  | {
      type: "interval";
      distanceKm: number;
      paceType: "interval";
    }
  | {
      type: "race";
      // race day 不指定具體配速，由使用者自由發揮
    };

/**
 * 一週訓練模板。每個欄位對應一週的某一天：1個週訓練計畫包含 7 個單日訓練
 * 索引：0=週日, 1=週一, ..., 6=週六
 */
export type WeekTemplate = [
  WorkoutTemplate, // Sun (0)
  WorkoutTemplate, // Mon (1)
  WorkoutTemplate, // Tue (2)
  WorkoutTemplate, // Wed (3)
  WorkoutTemplate, // Thu (4)
  WorkoutTemplate, // Fri (5)
  WorkoutTemplate // Sat (6)
];

/**
 * 完整計畫模板：1個訓練計畫 N 個 WeekTemplate週訓練計畫。
 */
export type PlanTemplate = WeekTemplate[];

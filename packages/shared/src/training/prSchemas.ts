import { z } from "zod";
import { raceTypeSchema } from "./raceType.js";

/** 建立 PR 的請求 body */
export const createPRInputSchema = z.object({
  distance: raceTypeSchema,
  timeSec: z
    .number({ message: "請輸入成績" })
    .int()
    .positive({ message: "成績必須大於 0" })
    .max(86400, { message: "成績不可超過 24 小時" }),
  date: z.string().datetime(),
  note: z.string().max(200).optional().nullable(),
});
export type CreatePRInput = z.infer<typeof createPRInputSchema>;

/** 部分更新 */
export const updatePRInputSchema = createPRInputSchema.partial();
export type UpdatePRInput = z.infer<typeof updatePRInputSchema>;

/** PR response */
export const personalRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  distance: raceTypeSchema,
  timeSec: z.number().int(),
  date: z.string().datetime(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type PersonalRecordResponse = z.infer<typeof personalRecordSchema>;

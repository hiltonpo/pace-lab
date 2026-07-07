import { z } from "zod";
import { raceTypeSchema } from "./raceType.js";

/** 建立 PR 的請求 body */
export const createPRInputSchema = z.object({
  distance: raceTypeSchema,
  timeSec: z
    .number({ message: "errors.time.required" })
    .int()
    .positive({ message: "errors.time.positive" })
    .max(86400, { message: "errors.time.max" }),
  date: z.string().min(1).datetime(),
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

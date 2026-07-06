import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { validateSessionToken } from "../auth/session.js";
import { SESSION_COOKIE_NAME } from "../auth/cookie.js";
import {
  createWorkoutInputSchema,
  updateWorkoutInputSchema,
  listWorkoutsQuerySchema,
} from "@pace-lab/shared";

async function getCurrentUser(request: any) {
  const token = request.cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  const result = await validateSessionToken(token);
  return result?.user ?? null;
}

/**
 * 由距離與時間算出配速（秒/km）。
 */
function calcPaceSec(distanceKm: number, durationSec: number): number | null {
  if (distanceKm <= 0) return null;
  return Math.round(durationSec / distanceKm);
}

const paramsSchema = z.object({ id: z.string() });

export async function workoutsRoutes(app: FastifyInstance) {
  // ==========================================================================
  // POST /api/workouts - 記錄一次訓練
  // ==========================================================================
  app.post("/api/workouts", async (request, reply) => {
    const user = await getCurrentUser(request);
    if (!user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const parseResult = createWorkoutInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Invalid input",
        details: parseResult.error.issues,
      });
    }
    const input = parseResult.data;

    // 如果有指定 plannedWorkoutId，驗證它屬於這個 user 的計畫
    if (input.plannedWorkoutId) {
      const planned = await prisma.plannedWorkout.findUnique({
        where: { id: input.plannedWorkoutId },
        include: { plan: true },
      });
      if (!planned || planned.plan.userId !== user.id) {
        return reply.status(404).send({ error: "Planned workout not found" });
      }
    }

    // 自動算配速
    const actualPaceSec = calcPaceSec(
      input.actualDistanceKm,
      input.actualDurationSec
    );

    const workout = await prisma.actualWorkout.create({
      data: {
        userId: user.id,
        plannedWorkoutId: input.plannedWorkoutId ?? null,
        planId: input.planId ?? null,
        date: new Date(input.date),
        workoutType: input.workoutType,
        actualDistanceKm: input.actualDistanceKm,
        actualDurationSec: input.actualDurationSec,
        actualPaceSec,
        mainSetPaceSec: input.mainSetPaceSec ?? null,
        avgHeartRate: input.avgHeartRate ?? null,
        maxHeartRate: input.maxHeartRate ?? null,
        rpe: input.rpe ?? null,
        weather: input.weather ?? null,
        temperatureC: input.temperatureC ?? null,
        feeling: input.feeling ?? null,
        notes: input.notes ?? null,
      },
    });

    return reply.status(201).send(workout);
  });

  // ==========================================================================
  // GET /api/workouts - 列出我的紀錄（可篩選）
  // ==========================================================================
  app.get("/api/workouts", async (request, reply) => {
    const user = await getCurrentUser(request);
    if (!user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const queryResult = listWorkoutsQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({
        error: "Invalid query",
        details: queryResult.error.issues,
      });
    }
    const { planId, from, to } = queryResult.data;

    // 動態組 where
    /** Prisma內建語法 
      where: {
           date: {
               gte: new Date("2026-06-01"),  // >= 大於等於
               lte: new Date("2026-06-30"),  // <= 小於等於
               gt:  ...,                      // >  大於
               lt:  ...,                      // <  小於
            }
        } 
    **/
    const where: any = { userId: user.id };
    if (planId) {
      where.planId = planId;
    }
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const workouts = await prisma.actualWorkout.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return reply.send(workouts);
  });

  // ==========================================================================
  // GET /api/workouts/:id - 單一紀錄
  // ==========================================================================
  app.get("/api/workouts/:id", async (request, reply) => {
    const user = await getCurrentUser(request);
    if (!user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ error: "Invalid id" });
    }

    const workout = await prisma.actualWorkout.findUnique({
      where: { id: paramsResult.data.id },
    });

    if (!workout || workout.userId !== user.id) {
      return reply.status(404).send({ error: "Workout not found" });
    }

    return reply.send(workout);
  });

  // ==========================================================================
  // PATCH /api/workouts/:id - 部分更新
  // ==========================================================================
  app.patch("/api/workouts/:id", async (request, reply) => {
    const user = await getCurrentUser(request);
    if (!user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ error: "Invalid id" });
    }

    const parseResult = updateWorkoutInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Invalid input",
        details: parseResult.error.issues,
      });
    }
    const input = parseResult.data;

    // 確認紀錄存在且屬於這個 user
    const existing = await prisma.actualWorkout.findUnique({
      where: { id: paramsResult.data.id },
    });
    if (!existing || existing.userId !== user.id) {
      return reply.status(404).send({ error: "Workout not found" });
    }

    // 組更新資料（只放有給的欄位）
    const data: any = {};
    if (input.date !== undefined) data.date = new Date(input.date);
    if (input.workoutType !== undefined) data.workoutType = input.workoutType;
    if (input.actualDistanceKm !== undefined)
      data.actualDistanceKm = input.actualDistanceKm;
    if (input.actualDurationSec !== undefined)
      data.actualDurationSec = input.actualDurationSec;
    if (input.avgHeartRate !== undefined)
      data.avgHeartRate = input.avgHeartRate;
    if (input.maxHeartRate !== undefined)
      data.maxHeartRate = input.maxHeartRate;
    if (input.rpe !== undefined) data.rpe = input.rpe;
    if (input.weather !== undefined) data.weather = input.weather;
    if (input.temperatureC !== undefined)
      data.temperatureC = input.temperatureC;
    if (input.feeling !== undefined) data.feeling = input.feeling;
    if (input.notes !== undefined) data.notes = input.notes;

    // 如果距離或時間有改，重算配速
    if (
      input.actualDistanceKm !== undefined ||
      input.actualDurationSec !== undefined
    ) {
      const distance = input.actualDistanceKm ?? existing.actualDistanceKm;
      const duration = input.actualDurationSec ?? existing.actualDurationSec;
      data.actualPaceSec = calcPaceSec(distance, duration);
    }
    if (input.mainSetPaceSec !== undefined)
      data.mainSetPaceSec = input.mainSetPaceSec;

    const updated = await prisma.actualWorkout.update({
      where: { id: paramsResult.data.id },
      data,
    });

    return reply.send(updated);
  });

  // ==========================================================================
  // DELETE /api/workouts/:id
  // ==========================================================================
  app.delete("/api/workouts/:id", async (request, reply) => {
    const user = await getCurrentUser(request);
    if (!user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ error: "Invalid id" });
    }

    const existing = await prisma.actualWorkout.findUnique({
      where: { id: paramsResult.data.id },
    });
    if (!existing || existing.userId !== user.id) {
      return reply.status(404).send({ error: "Workout not found" });
    }

    await prisma.actualWorkout.delete({
      where: { id: paramsResult.data.id },
    });

    return reply.status(204).send();
  });
}

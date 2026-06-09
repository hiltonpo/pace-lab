import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { validateSessionToken } from "../auth/session.js";
import { SESSION_COOKIE_NAME } from "../auth/cookie.js";
import {
  createPlanInputSchema,
  generatePlan,
  type WeeksTotal,
} from "@pace-lab/shared";

/**
 * 從 request 取得當前登入使用者，未登入回 null。
 * 用 cookie 中的 session token 查找。
 */
async function getCurrentUser(request: any) {
  const token = request.cookies[SESSION_COOKIE_NAME];
  if (!token) return null;

  const result = await validateSessionToken(token);
  return result?.user ?? null;
}

export async function plansRoutes(app: FastifyInstance) {
  // ==========================================================================
  // POST /api/plans - 建立新計畫
  // ==========================================================================
  app.post("/api/plans", async (request, reply) => {
    // 1. 驗證登入
    const user = await getCurrentUser(request);
    if (!user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    // 2. 驗證 request body
    const parseResult = createPlanInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Invalid input",
        details: parseResult.error.issues,
      });
    }
    const input = parseResult.data;

    // 3. 產生訓練計畫
    const generated = generatePlan(
      input.goalRaceType,
      input.goalTimeSec,
      input.weeksTotal as WeeksTotal
    );

    // 4. 用 transaction 一次寫入 plan + 所有 workouts
    const plan = await prisma.$transaction(async (tx) => {
      const createdPlan = await tx.trainingPlan.create({
        data: {
          userId: user.id,
          name: input.name,
          goalRaceType: input.goalRaceType,
          goalTimeSec: input.goalTimeSec,
          vdot: generated.vdot,
          weeksTotal: input.weeksTotal,
          startDate: input.startDate ? new Date(input.startDate) : null,
        },
      });

      await tx.plannedWorkout.createMany({
        data: generated.workouts.map((w) => ({
          planId: createdPlan.id,
          weekNumber: w.weekNumber,
          dayOfWeek: w.dayOfWeek,
          workoutType: w.workoutType,
          targetPaceSec: w.targetPaceSec,
          targetDistanceKm: w.targetDistanceKm,
          targetDurationSec: w.targetDurationSec,
          notes: w.notes,
        })),
      });

      // 回傳完整 plan 含 workouts
      return tx.trainingPlan.findUnique({
        where: { id: createdPlan.id },
        include: {
          plannedWorkouts: {
            orderBy: [{ weekNumber: "asc" }, { dayOfWeek: "asc" }],
          },
        },
      });
    });

    return reply.status(201).send(plan);
  });

  // ==========================================================================
  // GET /api/plans - 列出我的所有計畫（不含 workouts）
  // ==========================================================================
  app.get("/api/plans", async (request, reply) => {
    const user = await getCurrentUser(request);
    if (!user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const plans = await prisma.trainingPlan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return reply.send(plans);
  });

  // ==========================================================================
  // GET /api/plans/:id - 看單一計畫詳情（含所有 workouts）
  // ==========================================================================
  const paramsSchema = z.object({ id: z.string() });

  app.get("/api/plans/:id", async (request, reply) => {
    const user = await getCurrentUser(request);
    if (!user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ error: "Invalid id" });
    }

    const plan = await prisma.trainingPlan.findUnique({
      where: { id: paramsResult.data.id },
      include: {
        plannedWorkouts: {
          orderBy: [{ weekNumber: "asc" }, { dayOfWeek: "asc" }],
        },
      },
    });

    // 找不到 OR 不是這個使用者的 → 都回 404（避免洩漏存在性）
    if (!plan || plan.userId !== user.id) {
      return reply.status(404).send({ error: "Plan not found" });
    }

    return reply.send(plan);
  });

  // ==========================================================================
  // DELETE /api/plans/:id - 刪除計畫
  // ==========================================================================
  app.delete("/api/plans/:id", async (request, reply) => {
    const user = await getCurrentUser(request);
    if (!user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ error: "Invalid id" });
    }

    // 確認 plan 存在且屬於當前使用者
    const plan = await prisma.trainingPlan.findUnique({
      where: { id: paramsResult.data.id },
    });

    if (!plan || plan.userId !== user.id) {
      return reply.status(404).send({ error: "Plan not found" });
    }

    // onDelete: Cascade 會自動刪掉所有 plannedWorkouts
    await prisma.trainingPlan.delete({
      where: { id: paramsResult.data.id },
    });

    return reply.status(204).send();
  });
}

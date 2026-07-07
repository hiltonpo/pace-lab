import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { validateSessionToken } from "../auth/session.js";
import { SESSION_COOKIE_NAME } from "../auth/cookie.js";
import { createPRInputSchema, updatePRInputSchema } from "@pace-lab/shared";

const getCurrentUser = async (request: any) => {
  const token = request.cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  const result = await validateSessionToken(token);
  return result?.user ?? null;
};

const paramsSchema = z.object({ id: z.string() });

export const prRoutes = async (app: FastifyInstance) => {
  // ========================================================================
  // POST /api/prs - 建立 PR
  // ========================================================================
  app.post("/api/prs", async (request, reply) => {
    const user = await getCurrentUser(request);
    if (!user) return reply.status(401).send({ error: "Unauthorized" });

    const parsed = createPRInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "Invalid input", details: parsed.error.issues });
    }
    const input = parsed.data;

    const pr = await prisma.personalRecord.create({
      data: {
        userId: user.id,
        distance: input.distance,
        timeSec: input.timeSec,
        date: new Date(input.date),
        note: input.note ?? null,
      },
    });

    return reply.status(201).send(pr);
  });

  // ========================================================================
  // GET /api/prs - 列出我的 PR
  // ========================================================================
  app.get("/api/prs", async (request, reply) => {
    const user = await getCurrentUser(request);
    if (!user) return reply.status(401).send({ error: "Unauthorized" });

    const prs = await prisma.personalRecord.findMany({
      where: { userId: user.id },
      orderBy: [{ distance: "asc" }, { timeSec: "asc" }],
    });

    return reply.send(prs);
  });

  // ========================================================================
  // GET /api/prs/:id
  // ========================================================================
  app.get("/api/prs/:id", async (request, reply) => {
    const user = await getCurrentUser(request);
    if (!user) return reply.status(401).send({ error: "Unauthorized" });

    const p = paramsSchema.safeParse(request.params);
    if (!p.success) return reply.status(400).send({ error: "Invalid id" });

    const pr = await prisma.personalRecord.findUnique({
      where: { id: p.data.id },
    });
    if (!pr || pr.userId !== user.id) {
      return reply.status(404).send({ error: "PR not found" });
    }

    return reply.send(pr);
  });

  // ========================================================================
  // PATCH /api/prs/:id
  // ========================================================================
  app.patch("/api/prs/:id", async (request, reply) => {
    const user = await getCurrentUser(request);
    if (!user) return reply.status(401).send({ error: "Unauthorized" });

    const p = paramsSchema.safeParse(request.params);
    if (!p.success) return reply.status(400).send({ error: "Invalid id" });

    const parsed = updatePRInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "Invalid input", details: parsed.error.issues });
    }
    const input = parsed.data;

    const existing = await prisma.personalRecord.findUnique({
      where: { id: p.data.id },
    });
    if (!existing || existing.userId !== user.id) {
      return reply.status(404).send({ error: "PR not found" });
    }

    const data: Record<string, unknown> = {};
    if (input.distance !== undefined) data.distance = input.distance;
    if (input.timeSec !== undefined) data.timeSec = input.timeSec;
    if (input.date !== undefined) data.date = new Date(input.date);
    if (input.note !== undefined) data.note = input.note;

    const updated = await prisma.personalRecord.update({
      where: { id: p.data.id },
      data,
    });

    return reply.send(updated);
  });

  // ========================================================================
  // DELETE /api/prs/:id
  // ========================================================================
  app.delete("/api/prs/:id", async (request, reply) => {
    const user = await getCurrentUser(request);
    if (!user) return reply.status(401).send({ error: "Unauthorized" });

    const p = paramsSchema.safeParse(request.params);
    if (!p.success) return reply.status(400).send({ error: "Invalid id" });

    const existing = await prisma.personalRecord.findUnique({
      where: { id: p.data.id },
    });
    if (!existing || existing.userId !== user.id) {
      return reply.status(404).send({ error: "PR not found" });
    }

    await prisma.personalRecord.delete({ where: { id: p.data.id } });
    return reply.status(204).send();
  });
};

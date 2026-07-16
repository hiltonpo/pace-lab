if (process.env.NODE_ENV !== "production") {
  await import("dotenv/config");
}
import { prisma } from "./db.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { SHARED_VERSION } from "@pace-lab/shared";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";

import { authRoutes } from "./routes/auth.js";
import { plansRoutes } from "./routes/plans.js";
import { workoutsRoutes } from "./routes/workouts.js";
import { prRoutes } from "./routes/pr.js";
import { fitRoutes } from "./routes/fit.js";
import { fi } from "zod/v4/locales";

const app = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  },
});

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ["http://localhost:5173"];

await app.register(cors, {
  origin: allowedOrigins,
  credentials: true,
});

await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB（FIT 檔通常 < 1MB，10MB 綽綽有餘）
  },
});

await app.register(cookie);
await app.register(authRoutes);
await app.register(plansRoutes);
await app.register(workoutsRoutes);
await app.register(prRoutes);
await app.register(fitRoutes);

app.get("/api/health", async () => {
  await prisma.$queryRaw`SELECT 1`;
  return {
    status: "ok",
    db: "connected",
    shared: SHARED_VERSION,
    ts: new Date().toISOString(),
  };
});

const PORT = Number(process.env.PORT ?? 3000);

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

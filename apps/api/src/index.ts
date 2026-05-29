import "dotenv/config";
import { prisma } from "./db";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { SHARED_VERSION } from "@pace-lab/shared";
import cookie from "@fastify/cookie";
import { authRoutes } from "./routes/auth";

const app = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  },
});

await app.register(cors, {
  origin: ["http://localhost:5173"],
  credentials: true,
});

await app.register(cookie);
await app.register(authRoutes);

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

import Fastify from "fastify";
import cors from "@fastify/cors";
import { SHARED_VERSION } from "@pace-lab/shared";

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

app.get("/api/health", async () => ({
  status: "ok",
  shared: SHARED_VERSION,
  ts: new Date().toISOString(),
}));

const PORT = Number(process.env.PORT ?? 3000);

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
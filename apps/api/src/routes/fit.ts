import type { FastifyInstance } from "fastify";
import { Decoder, Stream } from "@garmin/fitsdk";
import { validateSessionToken } from "../auth/session.js";
import { SESSION_COOKIE_NAME } from "../auth/cookie.js";
import { detectMainSet } from "@pace-lab/shared";

const getCurrentUser = async (request: any) => {
  const token = request.cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  const result = await validateSessionToken(token);
  return result?.user ?? null;
};

export const fitRoutes = async (app: FastifyInstance) => {
  // POST /api/fit/parse — 上傳 FIT 檔，回傳解析後的結構化資料（不存 DB）
  app.post("/api/fit/parse", async (request, reply) => {
    const user = await getCurrentUser(request);
    if (!user) return reply.status(401).send({ error: "Unauthorized" });

    const data = await request.file();
    if (!data) return reply.status(400).send({ error: "No file uploaded" });

    const buffer = await data.toBuffer();

    // 解析 FIT
    const stream = Stream.fromBuffer(buffer);
    if (!Decoder.isFIT(stream)) {
      return reply.status(400).send({ error: "不是有效的 FIT 檔" });
    }

    const decoder = new Decoder(stream);
    const { messages, errors } = decoder.read();

    if (errors.length > 0) {
      console.error("FIT decode errors:", errors);
    }

    // 取 session（整場摘要）
    const session = messages.sessionMesgs?.[0];
    if (!session) {
      return reply.status(400).send({ error: "FIT 檔沒有活動資料" });
    }

    // 取 laps（每趟）
    const laps = (messages.lapMesgs ?? []).map((lap: any, i: number) => ({
      index: i + 1,
      distanceM: lap.totalDistance ?? null,
      durationSec: lap.totalTimerTime ? Math.round(lap.totalTimerTime) : null,
      avgHeartRate: lap.avgHeartRate ?? null,
      paceSec:
        lap.totalDistance && lap.totalTimerTime
          ? Math.round(lap.totalTimerTime / (lap.totalDistance / 1000))
          : null,
    }));
    // 自動偵測 interval 主段
    const mainSet = detectMainSet(laps);

    return reply.send({
      // 整場摘要
      date: session.startTime?.toISOString?.() ?? null,
      distanceKm: session.totalDistance ? session.totalDistance / 1000 : null,
      durationSec: session.totalTimerTime
        ? Math.round(session.totalTimerTime)
        : null,
      avgHeartRate: session.avgHeartRate ?? null,
      maxHeartRate: session.maxHeartRate ?? null,
      sport: session.sport ?? null,

      // 每趟資料
      laps,
      // 偵測結果（null = 不是 interval）
      mainSet,
    });
  });
};

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../db.js";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 天

// 產生一個無法被猜到的隨機 token（給瀏覽器的原始值）
export function generateSessionToken(): string {
  return randomBytes(20).toString("base64url");
}

// 把 token 雜湊（存進 DB 的值，原始 token 絕不進 DB）
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// 建立 session：token 給瀏覽器，雜湊存 DB
export async function createSession(token: string, userId: string) {
  const sessionId = hashToken(token);
  const session = await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    },
  });
  return session;
}

// 驗證 session：從 token 反查使用者，並處理過期 / 自動續期
export async function validateSessionToken(token: string) {
  const sessionId = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session) {
    return { session: null, user: null };
  }

  // 已過期 → 刪掉，視為未登入
  if (Date.now() >= session.expiresAt.getTime()) {
    await prisma.session.delete({ where: { id: sessionId } });
    return { session: null, user: null };
  }

  // 快過期了（剩不到 15 天）→ 自動續期，使用者不會被登出
  if (Date.now() >= session.expiresAt.getTime() - SESSION_DURATION_MS / 2) {
    const newExpiry = new Date(Date.now() + SESSION_DURATION_MS);
    await prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: newExpiry },
    });
    session.expiresAt = newExpiry;
  }

  return { session, user: session.user };
}

// 登出：刪掉 session
export async function invalidateSession(token: string) {
  const sessionId = hashToken(token);
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}

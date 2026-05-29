import type { FastifyInstance } from "fastify";
import { generateState, generateCodeVerifier } from "arctic";
import { google } from "../auth/google";
import { prisma } from "../db";
import {
  generateSessionToken,
  createSession,
  validateSessionToken,
  invalidateSession,
} from "../auth/session";
import {
  SESSION_COOKIE_NAME,
  setSessionCookie,
  clearSessionCookie,
} from "../auth/cookie";

export async function authRoutes(app: FastifyInstance) {
  // ===== Route 1：把使用者導去 Google（這段跟之前一樣，用 Arctic）=====
  app.get("/api/auth/google", async (request, reply) => {
    // state 跟 codeVerifier 是防攻擊用的隨機字串
    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    // 產生 Google 登入網址，要求 email 跟 profile 兩個範圍
    const url = google.createAuthorizationURL(state, codeVerifier, [
      "openid",
      "profile",
      "email",
    ]);

    // 把 state 跟 codeVerifier 暫存在 cookie，callback 時要拿來核對
    const isProd = process.env.NODE_ENV === "production";
    const oauthCookieBase = {
      path: "/",
      httpOnly: true,
      maxAge: 600,
      sameSite: (isProd ? "none" : "lax") as "none" | "lax",
      secure: isProd,
    };

    reply.setCookie("google_oauth_state", state, oauthCookieBase);
    reply.setCookie("google_code_verifier", codeVerifier, oauthCookieBase);

    // 把使用者導去 Google 登入頁
    return reply.redirect(url.toString());
  });

  // ===== Route 2：Google callback（OAuth 用 Arctic，session 用自己的）=====
  app.get("/api/auth/google/callback", async (request, reply) => {
    const query = request.query as { code?: string; state?: string };
    const { code, state } = query;

    // 從 cookie 取回剛剛存的 state 跟 codeVerifier
    const storedState = request.cookies.google_oauth_state;
    const codeVerifier = request.cookies.google_code_verifier;

    // 安全檢查：缺東西，或 state 對不上 → 拒絕（防 CSRF 攻擊）
    if (
      !code ||
      !state ||
      !storedState ||
      state !== storedState ||
      !codeVerifier
    ) {
      return reply.status(400).send({ error: "Invalid OAuth state" });
    }

    try {
      // 用 code 跟 Google 換 token
      const tokens = await google.validateAuthorizationCode(code, codeVerifier);

      // 用 token 跟 Google 拿使用者資料
      const res = await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {
          headers: { Authorization: `Bearer ${tokens.accessToken()}` },
        }
      );
      const googleUser = (await res.json()) as {
        sub: string;
        email: string;
        name: string;
      };

      // 看這個 Google 使用者在我們 DB 裡存在嗎
      let user = await prisma.user.findUnique({
        where: { googleSub: googleUser.sub },
      });

      // 不存在 → 第一次登入，建立新使用者
      if (!user) {
        user = await prisma.user.create({
          data: {
            googleSub: googleUser.sub,
            email: googleUser.email,
            name: googleUser.name,
          },
        });
      }

      // 這裡改用自己的 session
      const token = generateSessionToken(); // cookies存原始token (未雜湊)
      const session = await createSession(token, user.id);
      setSessionCookie(reply, token, session.expiresAt);

      // 導回前端首頁
      const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
      return reply.redirect(frontendUrl + "/");
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: "Authentication failed" });
    }
  });

  // ===== Route 3：回傳當前登入的使用者 =====
  app.get("/api/me", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE_NAME];
    if (!token) {
      return reply.status(401).send({ user: null });
    }

    const { session, user } = await validateSessionToken(token);
    if (!session) {
      return reply.status(401).send({ user: null });
    }

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        goalMarathonSec: user.goalMarathonSec,
      },
    });
  });

  // ===== Route 4：登出 =====
  app.post("/api/auth/logout", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE_NAME];
    if (token) {
      await invalidateSession(token);
    }
    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });
}

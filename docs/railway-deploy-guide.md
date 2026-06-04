# Railway 部署指南

pnpm monorepo + Node/TS + Prisma + Postgres 部署到 Railway 的流程與常見問題處理。

## 適用情境

- Node.js + TypeScript 後端
- pnpm workspace（monorepo）
- Prisma + PostgreSQL
- 前端獨立部署在其他平台（例如 Vercel）

---

## 部署前的程式碼準備

### 1. 相對 import 必須加 `.js` 副檔名

~~~ts
// 開發時可運行，production 失敗
import { prisma } from "./db";

// 兩種環境皆可
import { prisma } from "./db.js";
~~~

規則：
- 相對 import（`./` `../` 開頭）需加 `.js`
- 第三方套件（`fastify`、`@prisma/client`）不需加

原因：TypeScript 編譯後產出 JS，Node ESM 嚴格模式要求 import 寫完整路徑含副檔名。即使原始檔為 `.ts`，編譯後執行的是 `.js`，import 路徑需寫 `.js`。

掃描需修改處：

~~~bash
grep -rn 'from "\.\.\?/' src/
~~~

### 2. Monorepo 內部套件需編譯出 `dist/`

如果 monorepo 內有共用套件（例如 `packages/shared`），該套件必須有 build script 且 main 指向編譯後的 `.js`：

~~~json
{
  "name": "@scope/shared",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc"
  }
}
~~~

tsconfig 需設定真實 emit：

~~~json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "module": "ESNext",
    "moduleResolution": "Bundler"
  },
  "include": ["src"]
}
~~~

不可設定 `"noEmit": true`。

原因：開發時 tsx / Vite 能即時讀 `.ts`，main 指向 `.ts` 可運行；但純 Node 執行時 import 拿到 `.ts` 路徑會報 `ERR_UNKNOWN_FILE_EXTENSION`。

### 3. 環境敏感的設定移除寫死值

Redirect / CORS / API base URL：

~~~ts
// 不可寫死
return reply.redirect("http://localhost:5173/");
origin: ["http://localhost:5173"]

// 改用環境變數
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
return reply.redirect(frontendUrl + "/");

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ["http://localhost:5173"];
~~~

Cookie 屬性（跨網域 production 必要設定）：

~~~ts
const isProd = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  sameSite: isProd ? "none" as const : "lax" as const,
  secure: isProd,
  path: "/",
};
~~~

若未設定，登入流程看似成功但 `/api/me` 永遠 401，因為瀏覽器拒絕送 cookie。

`.env` 載入應避開 production：

~~~ts
if (process.env.NODE_ENV !== "production") {
  await import("dotenv/config");
}
~~~

Production 環境變數由平台注入，無需讀取 `.env` 檔案。

### 4. `package.json` 必要欄位

Root `package.json`：

~~~json
{
  "packageManager": "pnpm@9.12.0",
  "engines": {
    "node": ">=20.0.0"
  }
}
~~~

無 `packageManager` 欄位時，Railway 預設使用 npm，遇到 `workspace:*` 語法會失敗。

App `package.json`（例如 `apps/api`）：

~~~json
{
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  }
}
~~~

---

## Railway Service 設定

### Project 結構

一個 project 內放所有相關 services（例如 api + Postgres）。跨 project 的 service 無法使用 `${{ServiceName.VAR}}` 引用環境變數。

### Settings 設定

| 欄位 | 值 |
|---|---|
| Root Directory | `/`（monorepo 留空或填根目錄，不填子目錄） |
| Build Command | 見下方 |
| Start Command | 見下方 |
| Watch Paths | `apps/api/**` `packages/shared/**` `pnpm-lock.yaml`（選填） |

Build Command（monorepo + pnpm + Prisma 範例）：

~~~
corepack enable && pnpm install --frozen-lockfile && pnpm --filter @scope/shared build && pnpm --filter @scope/api exec prisma generate && pnpm --filter @scope/api build
~~~

執行順序：
1. `corepack enable` — 啟用 pnpm，依 root `packageManager` 欄位決定版本
2. `pnpm install --frozen-lockfile` — 依 lockfile 安裝
3. `pnpm --filter @scope/shared build` — 內部套件先 build
4. `pnpm --filter @scope/api exec prisma generate` — 產生 Prisma Client
5. `pnpm --filter @scope/api build` — 編譯 api

Start Command：

~~~
pnpm --filter @scope/api exec prisma migrate deploy && pnpm --filter @scope/api start
~~~

`prisma migrate deploy`（非 `migrate dev`）為 production 用，不會詢問互動或產生新 migration。

### `pnpm exec` 與 `pnpm` 差異

~~~
pnpm build         # 執行 package.json 中名為 "build" 的 script
pnpm exec prisma   # 直接執行 prisma CLI binary
~~~

Prisma、ESLint、Vitest 等 CLI 工具需使用 `pnpm exec`。未加 `exec` 會出現 "None of the selected packages has a 'xxx' script"。

---

## 環境變數設定

### Raw Editor 格式

值不可包引號：

~~~
NODE_ENV=production                                              # ✅
NODE_ENV="production"                                            # ❌ 值會變成含引號的 "production"
~~~

使用 `${{ServiceName.VAR}}` 引用同 project 的 service 變數：

~~~
DATABASE_URL=${{Postgres.DATABASE_URL}}
~~~

好處：Postgres 變動密碼會自動同步，不需手動更新。

### 典型 API server 環境變數

~~~
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://<railway網址>/api/auth/google/callback
FRONTEND_URL=https://<vercel網址>
~~~

### URL 雞生蛋問題

Railway domain 在部署觸發後才產生，但 OAuth redirect URI 需要此 URL。

解法：先填 placeholder，跑一次部署後 domain 即可取得，再回頭更新為實際值。建議 placeholder 使用明顯會失敗的格式（例如 `TODO_REPLACE_ME`）而非看似合理的假網址，避免忘記更新。

~~~
GOOGLE_REDIRECT_URI=TODO_REPLACE_ME_BEFORE_GO_LIVE/api/auth/google/callback
~~~

---

## 安全紀律

### Secret 處理

1. 任何 secret 不可 commit（`.env`、API key、JWT secret、DB password）。`.gitignore` 應包含：

   ~~~
   .env
   .env.*
   !.env.example
   ~~~

2. 截圖前檢查是否含 secret 行，需擋掉或塗黑
3. 一旦曾外洩，立即 Reset / Revoke，重新產生

### `.env.example`

Repo 內放置 `.env.example`，列出所有需要的環境變數但值留空：

~~~
# .env.example
DATABASE_URL="postgresql://user:pass@host:5432/db"
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
~~~

---

## 第三方服務白名單

後端部署完成後，需更新外部服務的設定：

1. APIs & Services → Credentials → 目標 OAuth client
2. Authorized redirect URIs 加上 production 那組
3. 保留 localhost 那組（本地仍需使用）
4. OAuth consent screen 的 Test users 含測試帳號

通用原則：所有「外部服務的白名單」都需要記得加 production 網址，包含 OAuth、CORS、Webhook、CDN、API 限制等。

---

## 全端專案完整部署流程

「前端 + 獨立 API 後端」架構建議流程：

~~~
Step 1: 程式碼改用環境變數（前端與後端皆需）
Step 2: Railway 部署後端
   ├─ 取得 Railway public domain
   └─ Variables 暫填 placeholder，待 Vercel 部署完成再回來更新 FRONTEND_URL
Step 3: Vercel 部署前端
   ├─ VITE_API_BASE_URL 使用 Railway 實際網址
   └─ 取得 Vercel domain
Step 4: 回 Railway 更新 FRONTEND_URL 為 Vercel 實際網址
Step 5: Google Console（或其他 OAuth provider）加入 production redirect URI
Step 6: 等待 5〜30 分鐘讓 OAuth 設定生效
Step 7: 無痕視窗測試完整流程
Step 8: F12 → Cookies 驗證跨網域 cookie 屬性
~~~

各環境變數需對應一致：

~~~
Vercel: VITE_API_BASE_URL ─────── = Railway public domain
Railway: GOOGLE_REDIRECT_URI ─── = Railway domain + /api/auth/google/callback
Railway: FRONTEND_URL ─────────── = Vercel domain
Google Console: Authorized URIs = Railway domain + /api/auth/google/callback
~~~

任何一處網址不一致，整條鏈路會中斷。Debug 時需追蹤完整鏈路，而非只檢查單一環節。

前端詳細流程請參考 [Vercel 部署指南](./vercel-deploy-guide.md)。

---

## Debug 順序

當部署遇到問題時，依此順序排查：

1. Build log — 失敗在哪一步？最後一行錯誤是什麼？
2. Deploy log — Build 成功但 start 失敗？多為 ESM / 環境變數 / DB 連線問題
3. `/api/health` 測試連線 — Server 啟動但功能異常時先看健康檢查
4. 瀏覽器 F12 → Network — Status code、Cookie 是否帶上、Request headers
5. 瀏覽器 F12 → Application → Cookies — `secure`、`sameSite`、`httpOnly` 屬性

### 常見錯誤對照

| 錯誤訊息 | 原因 | 解法 |
|---|---|---|
| `Unsupported URL Type "workspace:"` | Railway 用 npm 跑 pnpm workspace | 加 `packageManager` 到 root `package.json` |
| `None of the selected packages has a "xxx" script` | 把 CLI 當 script 跑 | 加 `exec`：`pnpm --filter xxx exec yyy` |
| `Cannot find module '/app/.../dist/db'` | ESM import 沒寫 `.js` | 所有相對 import 加 `.js` |
| `Unknown file extension ".ts"` | 內部 package 沒 build | 該 package 加 `build` script、`main` 改指 dist |
| `Module '@prisma/client' has no exported member 'PrismaClient'` | Build command 中 `prisma generate` 未成功執行 | Build command 改為 `pnpm --filter xxx exec prisma generate` |
| `Can't reach database server` | DATABASE_URL 未設定或錯誤 | 確認 `${{Postgres.DATABASE_URL}}` 引用正確 |
| `redirect_uri_mismatch` | OAuth provider 白名單未含 prod URI | 加入 URI、等待 5〜30 分鐘生效 |
| 跳轉到 `placeholder.up.railway.app` Not Found | Variables 仍為 placeholder 未更新 | 將 `GOOGLE_REDIRECT_URI` / `FRONTEND_URL` 更新為實際網址 |
| `FRONTEND_URL` 有結尾斜線 | redirect 變成雙斜線，cookie 跨網域失敗 | 移除 `FRONTEND_URL` 結尾斜線 |
| Railway domain "The train has not arrived" | 該網域未對應到任何 service | 確認 service 的 Public Domain 已 Generate、網址無 typo |
| `CORS policy ... credentials` | CORS 沒開 credentials | `cors({ origin: [...], credentials: true })` |
| `/api/me` 持續 401 | cookie 跨網域未生效 | `sameSite: "none"` + `secure: true` |

---

## 部署 Checklist

### Phase 1：程式碼準備
- [ ] 所有相對 import 加 `.js`
- [ ] 內部 package 有 build script，`main` 指 `dist/index.js`
- [ ] redirect / CORS / cookie 改用 env 變數，無寫死的 localhost
- [ ] Cookie 屬性根據 `NODE_ENV` 切換 sameSite / secure
- [ ] `dotenv/config` 只在 dev 載入
- [ ] Root `package.json` 含 `packageManager` 欄位
- [ ] App `package.json` 的 `start` 指向 `node dist/index.js`
- [ ] `.env.example` 建好、`.env` 在 gitignore

### Phase 2：Railway Project 設定
- [ ] 建立 Project，加 Postgres service
- [ ] 從 GitHub 加 API service（與 Postgres 同 project）
- [ ] Settings：Root Directory 留空、Build / Start Command 使用 `pnpm --filter ... exec ...` 格式
- [ ] Variables：用 `${{Postgres.DATABASE_URL}}` 引用、placeholder 處理 URL 循環依賴
- [ ] Generate Domain

### Phase 3：外部服務白名單
- [ ] Google OAuth：加 production redirect URI（保留 localhost）
- [ ] OAuth Test users（仍在測試階段時）
- [ ] 其他用到的服務（Stripe webhook、API 白名單等）

### Phase 4：驗證
- [ ] `/api/health` 回 JSON 含 `db: connected`
- [ ] 前端走完整登入流程
- [ ] 瀏覽器 cookie 設定正確（secure、sameSite）
- [ ] 登出可清除 cookie

---

## 心智準備：本地能跑 ≠ 線上能跑

以下設計在開發時不會出事，部署到 Railway 時會出問題：

| 本地能跑的原因 | 上線會失敗的原因 |
|---|---|
| `tsx` / Vite 即時編譯 `.ts` | Production 使用純 Node 跑 JS，不認識 `.ts` |
| monorepo 內部套件 `main` 指 `.ts` | 純 Node 載入時找不到 `.js` |
| ESM import 未寫 `.js` 副檔名 | 編譯後執行時找不到模組 |
| `localhost:5173` / `localhost:3000` 寫死 | Production 是不同網域，cookie / CORS 失效 |
| `sameSite: lax` | 跨網域 cookie 需要 `sameSite: none` + `secure: true` |
| `.env` 本地自動讀取 | Production 由平台注入，多讀一次反而出問題 |

撰寫每段 code 時需確認：production 環境下此段是否成立。

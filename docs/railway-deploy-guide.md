# Railway 上線實戰指南（前端工程師視角）

> 給「主要寫 Vue/React 前端、偶爾要部後端」的工程師。  
> 從 pnpm monorepo + Node/TS + Prisma + Postgres 的實戰中整理。

## 為什麼這份文件存在

第一次部署到 Railway 時，會在「本地能跑、線上 100% 跑不起來」之間反覆撞牆。  
踩過的雷其實只有幾類，但分散在 monorepo 設定、套件管理、TS 編譯、ESM 規範、環境變數這幾個面向，很難一次抓到。  
這份文件用「我下次要做什麼」的順序整理，照走可以省下半天到一天的試錯。

---

## 心智準備：本地能跑 ≠ 線上能跑

下面這些開發時不會出事的設計，在 Railway 上 100% 會炸：

| 本地能跑的原因                           | 上線炸的原因                                         |
| ---------------------------------------- | ---------------------------------------------------- |
| `tsx` / Vite 即時編譯 `.ts`              | Production 用純 Node 跑 JS，不認 `.ts`               |
| monorepo 內部套件 `main` 指 `.ts`        | 純 Node 載入時找不到 `.js`                           |
| ESM import 沒寫 `.js` 副檔名             | 編譯後跑時找不到模組                                 |
| `localhost:5173` / `localhost:3000` 寫死 | Production 是不同網域，cookie/CORS 失效              |
| `sameSite: lax`                          | 跨網域 cookie 需要 `sameSite: none` + `secure: true` |
| `.env` 本地自動讀                        | Production 由 Platform 注入，多讀一次反而出問題      |

**心法**：寫每段 code 都問自己「production 環境下，這段還成立嗎」。

---

## 部署前的 Code Checklist（最容易省半天的部分）

### 1. 所有相對 import 加 `.js` 副檔名

```ts
// ❌ 本地能跑，production 炸
import { prisma } from "./db";

// ✅ 兩邊都能跑
import { prisma } from "./db.js";
```

**規則**：

- 相對 import（`./` `../` 開頭）→ 加 `.js`
- 第三方套件（`fastify`、`@prisma/client`）→ 不加

**為什麼**：TS 編譯後是 JS，Node ESM 嚴格模式要求 import 寫完整路徑含副檔名。即使原始檔是 `.ts`，編譯後跑的是 `.js`，import 路徑要寫 `.js`。

一鍵找出所有要改的地方：

```bash
grep -rn 'from "\.\.\?/' src/
```

---

### 2. Monorepo 的內部套件必須能編譯出 `dist/`

最容易漏的雷。如果你 monorepo 裡有 `packages/shared` 這類共用套件，**它也必須有 build script、且 main 指向編譯後的 `.js`**：

```json
// packages/shared/package.json
{
  "name": "@scope/shared",
  "type": "module",
  "main": "./dist/index.js", // ← 指 dist 不是 src
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc" // ← 必須有
  }
}
```

tsconfig 也要設定真的 emit：

```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "module": "ESNext",
    "moduleResolution": "Bundler"
    // 不能有 "noEmit": true
  },
  "include": ["src"]
}
```

**為什麼**：開發時 tsx/Vite 能讀 `.ts`，把 main 指 `.ts` 沒事；但 Railway 用純 Node 跑，import 拿到 `.ts` 路徑會炸 `ERR_UNKNOWN_FILE_EXTENSION`。

---

### 3. 環境敏感的設定不要寫死

**(a) Redirect / CORS / API base URL**

```ts
// ❌
return reply.redirect("http://localhost:5173/");
origin: ["http://localhost:5173"];

// ✅
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
return reply.redirect(frontendUrl + "/");

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ["http://localhost:5173"];
```

**(b) Cookie 屬性 — 跨網域 production 的關鍵**

前端 Vercel、後端 Railway 是不同網域，cookie 必須：

```ts
const isProd = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  sameSite: isProd ? ("none" as const) : ("lax" as const), // 跨網域必須 "none"
  secure: isProd, // sameSite none 強制 secure
  path: "/",
};
```

**漏這個的後果**：登入流程「看起來成功」但 `/api/me` 永遠 401，因為瀏覽器拒絕送 cookie。是隱藏最深的雷之一。

**(c) `.env` 載入要避開 production**

```ts
// 第一行
if (process.env.NODE_ENV !== "production") {
  await import("dotenv/config");
}
```

Production 由 Railway 注入環境變數，不該再去讀 `.env` 檔（沒這檔，會噴 warning 或潛在錯誤）。

---

### 4. `package.json` 該有的欄位

**Root `package.json`**：

```json
{
  "packageManager": "pnpm@9.12.0", // ← Railway 靠這個決定用哪個 pnpm
  "engines": {
    "node": ">=20.0.0" // ← 鎖定 Node 大版本，避免 prod 跑到太新版
  }
}
```

**沒有 `packageManager`** → Railway 預設用 npm → 看到 `workspace:*` 就炸。

**App `package.json`**（例如 `apps/api`）：

```json
{
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js", // ← Start 指向編譯後的 JS
    "dev": "tsx watch src/index.ts"
  }
}
```

---

## Railway Service 設定 SOP

### Project 結構

一個 project 內放所有相關的 services（例如 api + Postgres）。**跨 project 的 service 無法用 `${{ServiceName.VAR}}` 引用環境變數**——這會大幅增加維護成本，別跨。

### Settings 設定

| 欄位               | 值                                                          |
| ------------------ | ----------------------------------------------------------- |
| **Root Directory** | `/`（monorepo 留空或填根目錄，**不要**填 `apps/api`）       |
| **Build Command**  | 見下面                                                      |
| **Start Command**  | 見下面                                                      |
| **Watch Paths**    | `apps/api/**` `packages/shared/**` `pnpm-lock.yaml`（可選） |

**Build Command（monorepo + pnpm + Prisma 範例）**：

```
corepack enable && pnpm install --frozen-lockfile && pnpm --filter @scope/shared build && pnpm --filter @scope/api exec prisma generate && pnpm --filter @scope/api build
```

順序意義：

1. `corepack enable` — 啟用 pnpm（靠 root `packageManager` 欄位決定版本）
2. `pnpm install --frozen-lockfile` — 嚴格按 lockfile 安裝
3. `pnpm --filter @scope/shared build` — 內部套件先 build（依賴順序）
4. `pnpm --filter @scope/api exec prisma generate` — 產生 Prisma Client
5. `pnpm --filter @scope/api build` — 編譯 api

**Start Command**：

```
pnpm --filter @scope/api exec prisma migrate deploy && pnpm --filter @scope/api start
```

`prisma migrate deploy`（不是 `migrate dev`）才是 production 用的，不會問問題、不會產生新 migration。

### 關鍵語法：`pnpm exec` vs `pnpm`

```
pnpm build         ← 跑 package.json 裡名為 "build" 的 script
pnpm exec prisma   ← 直接執行 prisma 這個 CLI binary
```

Prisma、ESLint、Vitest 這類 CLI 工具要用 `pnpm exec`。沒加 `exec` 會噴「None of the selected packages has a 'xxx' script」。

---

## 環境變數設定 SOP

### Raw Editor 格式（Railway 介面）

**值不要包引號**：

```
NODE_ENV=production                                              # ✅
NODE_ENV="production"                                            # ❌ 值會變成含引號的 "production"
```

**用 ${{ServiceName.VAR}} 引用同 project 的服務變數**：

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

好處：Postgres 換密碼會自動同步，不用手動更新。

### 部署前該設好的環境變數（典型 API server）

```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://你的railway網址/api/auth/google/callback
FRONTEND_URL=https://你的vercel網址
```

### 「雞生蛋」問題：URL 還沒生成怎麼設

Railway domain 要部署觸發後才產生，但 OAuth redirect URI 需要這個 URL → 死循環。

**解法**：先填 placeholder，跑一次部署（會失敗或部分成功）後 domain 就生出來，再回頭改成真的。

```
GOOGLE_REDIRECT_URI=https://placeholder.up.railway.app/api/auth/google/callback
```

---

## 安全紀律

### Secret 處理三條鐵則

1. **任何 secret 都不准 commit**（`.env`、API key、JWT secret、DB password）。確認 `.gitignore`：

```
   .env
   .env.*
   !.env.example
```

2. **截圖前先把 secret 那行擋掉**（不只面試/履歷，貼到任何 chat/issue 前都要檢查）
3. **一旦曾外洩，立刻 Reset/Revoke**——不管「應該沒被看到吧」。重新產生的成本永遠比被盜的成本低

### `.env.example`

Repo 裡放一份 `.env.example`，列出所有需要的環境變數但**值留空或寫範例**。新人 clone 下來照著建自己的 `.env`：

```
# .env.example
DATABASE_URL="postgresql://user:pass@host:5432/db"
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## 第三方服務的對應設定（容易漏）

部署完後端後，**Google OAuth Console 也要更新**才能真的登入：

1. APIs & Services → Credentials → 你的 OAuth client
2. Authorized redirect URIs 加上 production 那組
3. **保留 localhost 那組**（不然本地會掛）
4. OAuth consent screen 的 Test users 必須含你要登入的帳號

通用心法：**所有「外部服務的白名單」都要記得加 production 網址**——OAuth、CORS、Webhook、CDN、API 限制。

---

## Debug 流程（卡關時的順序）

1. **看 Build log** — 失敗在哪一步？最後一行錯誤是什麼？
2. **看 Deploy log** — Build 成功但 start 失敗？通常是 ESM/環境變數/DB 連線
3. **`/api/health` 測連線** — Server 起來但功能不對？先看健康檢查
4. **瀏覽器開發者工具 → Network** — Status code、Cookie 是否帶上、Request headers
5. **瀏覽器開發者工具 → Application → Cookies** — `secure`、`sameSite`、`httpOnly` 對不對

### 常見錯誤訊息對照

| 錯誤                                               | 原因                             | 修法                                           |
| -------------------------------------------------- | -------------------------------- | ---------------------------------------------- |
| `Unsupported URL Type "workspace:"`                | Railway 用 npm 跑 pnpm workspace | 加 `packageManager` 到 root `package.json`     |
| `None of the selected packages has a "xxx" script` | 把 CLI 當 script 跑              | 加 `exec`：`pnpm --filter xxx exec yyy`        |
| `Cannot find module '/app/.../dist/db'`            | ESM import 沒寫 `.js`            | 所有相對 import 加 `.js`                       |
| `Unknown file extension ".ts"`                     | 內部 package 沒 build            | 該 package 加 `build` script、`main` 改指 dist |
| `Can't reach database server`                      | DATABASE_URL 沒設或設錯          | 確認 `${{Postgres.DATABASE_URL}}` 引用正確     |
| `redirect_uri_mismatch`                            | Google Console 沒加 prod URI     | 進 Credentials 加                              |
| `CORS policy ... credentials`                      | CORS 沒開 credentials            | `cors({ origin: [...], credentials: true })`   |
| `/api/me` 一直 401                                 | cookie 沒跨網域                  | `sameSite: "none"` + `secure: true`            |

---

## 我的標準部署流程（Checklist）

下次新專案要部署時照這個順序：

### Phase 1：Code 整理（部署前）

- [ ] 所有相對 import 加 `.js`
- [ ] 內部 package 有 build script，`main` 指 `dist/index.js`
- [ ] redirect / CORS / cookie 改用 env 變數，無寫死的 localhost
- [ ] Cookie 屬性根據 `NODE_ENV` 切換 sameSite/secure
- [ ] `dotenv/config` 只在 dev 載入
- [ ] Root `package.json` 有 `packageManager` 欄位
- [ ] App `package.json` 的 `start` 指向 `node dist/index.js`
- [ ] `.env.example` 建好、`.env` 在 gitignore

### Phase 2：Railway Project 設定

- [ ] 建 Project，加 Postgres service
- [ ] 從 GitHub 加 API service（不要分 project）
- [ ] Settings：Root Directory 留空、Build/Start Command 用 `pnpm --filter ... exec ...` 格式
- [ ] Variables：用 `${{Postgres.DATABASE_URL}}` 引用、placeholder 處理 URL 循環依賴
- [ ] Generate Domain

### Phase 3：外部服務白名單

- [ ] Google OAuth：加 production redirect URI（**保留 localhost**）
- [ ] OAuth Test users（如果還在測試階段）
- [ ] 其他用到的服務（Stripe webhook、API 白名單等）

### Phase 4：驗證

- [ ] `/api/health` 回 JSON 含 `db: connected`
- [ ] 從前端走一次登入流程
- [ ] 瀏覽器 cookie 設定正確（secure、sameSite）
- [ ] 登出能清掉 cookie

---

## 對前端工程師的補充建議

1. **第一個專案部署別追求一次到位**。預期會反覆 push、看 log、改、再 push 5〜10 次，這是正常的學習成本，不是你的問題
2. **每個 sprint 結束都更新 production**，別把所有功能做完才一次部，累積的 prod-only bug 會難 debug 到崩潰
3. **本地 Docker + 雲端 Postgres 是業界標準**，不要在雲端 DB 上開發（亂搞風險、網路延遲、吃免費額度）
4. **`pnpm exec` 跟 `pnpm` 的差別**請特別記住，這個雷你會在 CI/CD 場景反覆遇到
5. **Lockfile（`pnpm-lock.yaml`）一定要 commit**。`--frozen-lockfile` 鎖的就是這個

---

## 為什麼這份知識值錢

日本企業面試常問「これは本番で動いていますか？」（這個有跑在 production 嗎）。  
能回答「有，部署在 Railway，前端在 Vercel」是基本門檻；  
能多講「monorepo 部署踩過 X、Y、Z 這幾個雷，我這樣解決」就是加分項。  
這份指南整理的內容剛好是面試聊「部署經驗」的具體素材。

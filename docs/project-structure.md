# Project Structure

pace-lab 是一個 pnpm monorepo，前端、後端、共用 type 各自獨立但共享同個 repo。本文件說明每個資料夾的職責、檔案怎麼分。

## 整體結構（鳥瞰）

```
pace-lab/
├── apps/                     ← 應用程式（會被獨立部署的東西）
│   ├── api/                  ← 後端 (Fastify + Prisma)
│   └── web/                  ← 前端 (Vite + React)
├── packages/                 ← 共用程式碼（不獨立部署，被 apps 引用）
│   └── shared/               ← 前後端共用的 type 跟 Zod schema
├── docs/                     ← 技術文件
├── docker-compose.yml        ← 本地 Postgres 容器
├── pnpm-workspace.yaml       ← monorepo 設定
├── package.json              ← root 套件（管理工作區、共用 dev tools）
└── README.md
```

> 心法：**會單獨部署的東西放 `apps/`，被引用的共用 code 放 `packages/`。**

## 後端：`apps/api/`

```
apps/api/
├── prisma/
│   ├── schema.prisma         ← DB schema 定義（所有 model、relation、index）
│   └── migrations/           ← Prisma 自動生成的 SQL migration 檔
│       └── 20260601_xxxx/
│           └── migration.sql
├── src/
│   ├── auth/                 ← 認證相關
│   │   ├── cookie.ts         ← cookie 屬性、跨網域設定
│   │   ├── session.ts        ← session token 生成、雜湊、驗證、續期
│   │   └── google.ts         ← Arctic Google OAuth client
│   ├── routes/               ← API 路由
│   │   ├── auth.ts           ← /api/auth/* (OAuth flow、logout)
│   │   └── (之後會有 plans.ts、workouts.ts 等)
│   ├── db.ts                 ← Prisma client 實體（單一來源）
│   └── index.ts              ← Fastify app 啟動入口、CORS、plugin 註冊
├── .env                      ← 本地環境變數（不 commit）
├── .env.example              ← 環境變數範本（commit）
├── package.json
└── tsconfig.json
```

### 後端目錄使用慣例

- **新增 API 路由**：在 `src/routes/` 開新檔案，例如 `plans.ts`，然後在 `src/index.ts` 註冊
- **新增 DB 表**：改 `prisma/schema.prisma`，跑 `pnpm prisma migrate dev --name xxx`
- **新增 helper 函式**：判斷是不是「跨服務共用」——只後端用放在 `apps/api/src/`、前後端都用放在 `packages/shared/src/`
- **改 cookie / OAuth 設定**：對應檔案在 `src/auth/`
- **環境變數**：先加進 `.env.example` 再加進 `.env`，部署時記得也加進 Railway Variables

## 前端：`apps/web/`

```
apps/web/
├── public/                   ← 靜態資源（不會被 Vite 處理）
├── src/
│   ├── components/
│   │   └── ui/               ← shadcn 元件（button、card、input、select、label）
│   ├── hooks/                ← 自訂 React hooks
│   │   ├── useMe.ts          ← 取得當前使用者 + 登入登出
│   │   ├── useTheme.ts       ← dark mode 切換
│   │   └── useLocale.ts      ← 語言切換
│   ├── i18n/                 ← 多語言設定
│   │   ├── index.ts          ← i18next 設定、初始化
│   │   └── locales/
│   │       ├── ja/common.json
│   │       ├── zh/common.json
│   │       └── en/common.json
│   ├── lib/
│   │   ├── api.ts            ← fetch wrapper、API base URL
│   │   └── utils.ts          ← shadcn 的 cn() 函式
│   ├── App.tsx               ← 根元件
│   ├── main.tsx              ← React 入口、QueryClientProvider 等 wrap
│   ├── index.css             ← Tailwind v4 + CSS 變數 + 日系配色
│   └── vite-env.d.ts         ← import.meta.env 的 TS 型別擴充
├── components.json           ← shadcn 設定
├── vite.config.ts            ← Vite 設定（plugin、proxy、alias）
├── tsconfig.json
├── index.html                ← Google Fonts、root div
├── .env                      ← 本地環境變數（不 commit）
└── .env.example
```

### 前端目錄使用慣例

- **新增頁面元件**：之後加 React Router 後會建 `src/pages/`，每個 route 一個檔
- **新增可重用 UI 元件**：自製的放 `src/components/`（不在 `ui/` 裡，那是 shadcn 專用）
- **shadcn 元件**：用 `pnpm dlx shadcn@latest add <name>` 加，會自動進 `src/components/ui/`
- **新增 hook**：放 `src/hooks/`，命名 `useXxx.ts`
- **新增 i18n key**：三份 locale JSON（ja/zh/en）都要加，否則切到對應語言會 fallback
- **import alias**：用 `@/` 開頭，例如 `@/components/ui/button`、`@/hooks/useMe`
- **環境變數**：必須以 `VITE_` 開頭才會被 Vite 暴露到瀏覽器

## 共用：`packages/shared/`

```
packages/shared/
├── src/
│   ├── index.ts              ← export 所有公開內容（barrel file）
│   └── (之後會有 schemas/、types/、formulas/ 等子資料夾)
├── dist/                     ← build 產物（不 commit，但 deploy 時要存在）
├── package.json              ← main 指向 ./dist/index.js
└── tsconfig.json             ← outDir: ./dist
```

### 共用目錄使用慣例

- **放什麼**：前後端**都會用**的 type、Zod schema、純函式（例如 VDOT 公式）
- **不放什麼**：只後端用的（例如 DB 操作）、只前端用的（例如 React hook）
- **怎麼引用**：`import { xxx } from "@pace-lab/shared"`（前後端都這樣用）
- **改完 code 之後**：必須跑 `pnpm --filter @pace-lab/shared build` 才會更新 dist
- **deploy 注意**：Railway 跟 Vercel 的 build command 都要先 build shared 再 build 自己的 app

## 文件：`docs/`

```
docs/
├── railway-deploy-guide.md   ← 後端部署到 Railway 的流程、踩雷紀錄
├── vercel-deploy-guide.md    ← 前端部署到 Vercel 的流程、跨網域整合
├── ui-foundation-notes.md    ← Sprint 1.5 UI 基礎建設的設計決策
└── project-structure.md      ← 本文件
```

之後每個 sprint 結束、學到新東西，都可以在這資料夾加一份簡記。

## 根目錄重要檔案

- `package.json`：root 套件，定義 monorepo 整體的 `dev`、`build` 等指令，含 `packageManager` 欄位告訴 Railway 用 pnpm
- `pnpm-workspace.yaml`：指明哪些資料夾是 workspace 成員（通常是 `apps/*` 跟 `packages/*`）
- `docker-compose.yml`：本地開發用的 Postgres 容器
- `.gitignore`：含 `.env`、`node_modules`、`dist`、`.vite` 等
- `tsconfig.base.json`（若有）：所有 workspace 共用的 TS 編譯設定

## 「我想加 / 改 X，要動哪些檔案」對照表

| 想做的事 | 主要動的檔案 |
|---|---|
| 加新 API 路由 | `apps/api/src/routes/xxx.ts` + `apps/api/src/index.ts` 註冊 |
| 加 DB 表 / 欄位 | `apps/api/prisma/schema.prisma` + `pnpm prisma migrate dev` |
| 加前後端共用 type / 驗證 | `packages/shared/src/` + 然後 build shared |
| 加新前端頁面 | `apps/web/src/pages/xxx.tsx` + Router 設定 |
| 加新 React hook | `apps/web/src/hooks/useXxx.ts` |
| 加多語言文字 | 三份 `apps/web/src/i18n/locales/{ja,zh,en}/common.json` |
| 加 shadcn 元件 | `pnpm dlx shadcn@latest add <name>` |
| 加環境變數（前端）| `apps/web/.env` + `.env.example` + `vite-env.d.ts` 加型別 + Vercel Variables |
| 加環境變數（後端）| `apps/api/.env` + `.env.example` + Railway Variables |
| 加部署相關設定 | Railway dashboard / Vercel dashboard，code 端不動 |

## 路徑速查（常忘的）

- 後端入口：`apps/api/src/index.ts`
- 前端入口：`apps/web/src/main.tsx`
- DB schema：`apps/api/prisma/schema.prisma`
- Tailwind 設定：`apps/web/src/index.css`（v4 全部寫在 CSS 裡）
- shadcn 設定：`apps/web/components.json`
- Vite 設定：`apps/web/vite.config.ts`
- Monorepo 設定：根目錄 `pnpm-workspace.yaml`

## 為什麼這樣分

幾個關鍵設計：

**`apps/` vs `packages/`**：前者「能獨立部署」、後者「被引用」。`apps/api` 上 Railway、`apps/web` 上 Vercel，`packages/shared` 兩邊都 import。

**`hooks/` 不在 `components/` 裡**：React 慣例。hooks 是邏輯抽象，跟 UI 元件分開放更好找。

**`lib/` 放工具**：跟「商業邏輯」（hooks、pages）區分，這裡只放跨頁面共用的純函式（fetch wrapper、cn 函式等）。

**`i18n/` 自成一區**：翻譯資源跟設定邏輯放在一起，未來加新 namespace 也方便。

**schema 跟 migrations 一起放 `prisma/`**：Prisma 慣例，不分散。

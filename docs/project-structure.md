# Project Structure

pace-lab 是一個 pnpm monorepo，前端、後端、共用 type 各自獨立但共享同個 repo。本文件說明每個資料夾的職責、檔案怎麼分。

## 整體結構（鳥瞰）

```
pace-lab/
├── apps/                     ← 應用程式（會被獨立部署的東西）
│   ├── api/                  ← 後端 (Fastify + Prisma)
│   └── web/                  ← 前端 (Vite + React)
├── packages/                 ← 共用程式碼（不獨立部署，被 apps 引用）
│   └── shared/               ← 前後端共用的 type、Zod schema、純函式
├── docs/                     ← 技術文件
├── docker-compose.yml        ← 本地 Postgres 容器
├── pnpm-workspace.yaml       ← monorepo 設定
├── package.json              ← root 套件（管理工作區、共用 dev tools）
├── .npmrc                    ← pnpm 設定（含 shamefully-hoist 等）
└── README.md
```

> 心法：**會單獨部署的東西放 `apps/`，被引用的共用 code 放 `packages/`。**

## 後端：`apps/api/`

```
apps/api/
├── prisma/
│   ├── schema.prisma         ← DB schema 定義（所有 model、relation、index）
│   └── migrations/           ← Prisma 自動生成的 SQL migration 檔
│       ├── 20260601_xxxx/    ← Sprint 1: User + Session
│       └── 20260601_yyyy/    ← Sprint 2: TrainingPlan + PlannedWorkout
├── src/
│   ├── auth/                 ← 認證相關
│   │   ├── cookie.ts         ← cookie 屬性、跨網域設定
│   │   ├── session.ts        ← session token 生成、雜湊、驗證、續期
│   │   └── google.ts         ← Arctic Google OAuth client
│   ├── routes/               ← API 路由
│   │   ├── auth.ts           ← /api/auth/* (OAuth flow、logout、/api/me)
│   │   └── plans.ts          ← /api/plans (CRUD)
│   ├── db.ts                 ← Prisma client 實體（單一來源）
│   └── index.ts              ← Fastify app 啟動入口、CORS、plugin 註冊
├── .env                      ← 本地環境變數（不 commit）
├── .env.example              ← 環境變數範本（commit）
├── package.json
└── tsconfig.json
```

### 後端目錄使用慣例

- **新增 API 路由**：在 `src/routes/` 開新檔案，例如 `workouts.ts`，然後在 `src/index.ts` 註冊
- **新增 DB 表**：改 `prisma/schema.prisma`，跑 `pnpm prisma migrate dev --name xxx`
- **新增 helper 函式**：判斷是不是「跨服務共用」——只後端用放在 `apps/api/src/`、前後端都用放在 `packages/shared/src/`
- **改 cookie / OAuth 設定**：對應檔案在 `src/auth/`
- **環境變數**：先加進 `.env.example` 再加進 `.env`，部署時記得也加進 Railway Variables

## 前端：`apps/web/`

```
apps/web/
├── public/                   ← 靜態資源（不會被 Vite 處理）
├── src/
│   ├── pages/                ← 路由對應的頁面元件
│   │   ├── HomePage.tsx
│   │   ├── CreatePlanPage.tsx
│   │   └── PlanDetailPage.tsx
│   ├── components/
│   │   ├── ui/               ← shadcn 元件（不放業務邏輯）
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   └── select.tsx
│   │   └── Layout.tsx        ← 跨頁面 wrapper（top nav + Outlet）
│   ├── hooks/                ← 自訂 React hooks
│   │   ├── useMe.ts          ← 取得當前使用者 + 登入登出
│   │   ├── usePlans.ts       ← 計畫列表 / 詳情 / 刪除
│   │   ├── useTheme.ts       ← dark mode 切換
│   │   └── useLocale.ts      ← 語言切換
│   ├── i18n/                 ← 多語言設定
│   │   ├── index.ts          ← i18next 設定、初始化
│   │   └── locales/
│   │       ├── ja/common.json
│   │       ├── zh/common.json
│   │       └── en/common.json
│   ├── lib/
│   │   ├── api.ts            ← me / logout API
│   │   ├── plansApi.ts       ← 計畫相關 API
│   │   └── utils.ts          ← shadcn 的 cn() 函式
│   ├── App.tsx               ← Router 設定（BrowserRouter + Routes）
│   ├── main.tsx              ← React 入口、QueryClientProvider 等 wrap
│   ├── index.css             ← Tailwind v4 + CSS 變數 + 日系配色
│   └── vite-env.d.ts         ← import.meta.env 的 TS 型別擴充
├── components.json           ← shadcn 設定
├── vite.config.ts            ← Vite 設定（plugin、alias）
├── tsconfig.json
├── index.html                ← Google Fonts、root div
├── .env                      ← 本地環境變數（不 commit）
└── .env.example
```

### 前端目錄使用慣例

- **新增頁面元件**：放 `src/pages/`，每個 route 一個檔，然後在 `App.tsx` 加 `<Route>`
- **新增可重用 UI 元件**：自製的放 `src/components/`（不在 `ui/` 裡，那是 shadcn 專用）
- **shadcn 元件**：用 `pnpm dlx shadcn@latest add <name>` 加，會自動進 `src/components/ui/`
  - ⚠️ React 18 環境下要手動加 `forwardRef`，詳見 ui-foundation-notes.md
- **新增 hook**：放 `src/hooks/`，命名 `useXxx.ts`
- **新增 API client function**：放 `src/lib/`，按主題分檔（plansApi.ts、workoutsApi.ts 等）
- **新增 i18n key**：三份 locale JSON（ja/zh/en）都要加，否則切到對應語言會 fallback
- **import alias**：用 `@/` 開頭，例如 `@/components/ui/button`
- **環境變數**：必須以 `VITE_` 開頭才會被 Vite 暴露到瀏覽器

## 共用：`packages/shared/`

```
packages/shared/
├── src/
│   ├── training/             ← 訓練相關（Sprint 2 主要工作區）
│   │   ├── raceType.ts       ← Race type enum + 距離常數
│   │   ├── vdot.ts           ← Jack Daniels VDOT 公式、配速計算、PACE_SHORT_LABELS
│   │   ├── format.ts         ← formatDuration / formatPace / parseDuration
│   │   ├── planSchemas.ts    ← Zod schemas (createPlanInputSchema 等)
│   │   ├── generatePlan.ts   ← 計畫產生器演算法
│   │   ├── templates/
│   │   │   ├── types.ts                 ← WorkoutTemplate、WeekTemplate 型別
│   │   │   └── marathon-templates.ts    ← 8/12/16 週模板
│   │   ├── vdot.spec.ts                 ← 12 個測試
│   │   ├── format.spec.ts               ← 11 個測試
│   │   └── generatePlan.spec.ts         ← 31 個測試
│   └── index.ts              ← export 所有公開內容（barrel file）
├── dist/                     ← build 產物（不 commit、deploy 時 build）
├── package.json              ← main 指向 ./dist/index.js
├── tsconfig.json             ← outDir: ./dist
└── vitest.config.ts          ← 測試設定
```

### 共用目錄使用慣例

- **放什麼**：前後端**都會用**的 type、Zod schema、純函式
- **不放什麼**：只後端用的（例如 DB 操作）、只前端用的（例如 React hook）
- **怎麼引用**：`import { xxx } from "@pace-lab/shared"`（前後端都這樣用）
- **改完 code 之後**：**必須跑** `pnpm --filter @pace-lab/shared build` 才會更新 dist
- **deploy 注意**：Railway 跟 Vercel 的 build command 都要先 build shared 再 build 自己的 app
- **寫單元測試**：跟原始檔放同一目錄、命名 `xxx.spec.ts`，跑 `pnpm --filter @pace-lab/shared test`

### Sprint 2 加入的純函式

```typescript
// 從 packages/shared 可 import 的核心 API：
import {
  // Types
  RaceType,
  PaceType,
  PlanSummary,
  PlanDetail,
  CreatePlanInput,
  GeneratedPlan,
  WeeksTotal,

  // Zod schemas
  raceTypeSchema,
  createPlanInputSchema,
  planSummarySchema,
  planDetailSchema,

  // 純函式
  calculateVDOT,
  calculatePace,
  calculateTrainingPaces,
  generatePlan,

  // 格式工具
  formatDuration,
  formatPace,
  parseDuration,

  // 常數
  RACE_DISTANCE_KM,
  PACE_SHORT_LABELS,
  SUPPORTED_WEEKS,
} from "@pace-lab/shared";
```

## 文件：`docs/`

```
docs/
├── project-structure.md      ← 本文件
├── railway-deploy-guide.md   ← 後端部署到 Railway 的流程、踩雷紀錄
├── vercel-deploy-guide.md    ← 前端部署到 Vercel、跨網域整合
├── ui-foundation-notes.md    ← Sprint 1.5 UI 基礎建設 + Sprint 2 前端模式
└── api-design.md             ← REST 慣例、Zod 驗證、權限邊界、transaction
```

每個 sprint 結束、學到新東西，都可以在這資料夾加一份簡記或更新既有檔案。

## 根目錄重要檔案

- `package.json`：root 套件，定義 monorepo 整體的 `dev`、`build` 等指令，含 `packageManager` 欄位告訴 Railway 用 pnpm
- `pnpm-workspace.yaml`：指明哪些資料夾是 workspace 成員（`apps/*` 跟 `packages/*`）
- `.npmrc`：pnpm 設定，含 `shamefully-hoist=true` 跟 `auto-install-peers=true`（給 Sprint 1.5 後遇到的 shadcn peer dependency 問題用）
- `docker-compose.yml`：本地開發用的 Postgres 容器
- `.gitignore`：含 `.env`、`node_modules`、`dist`、`.vite` 等

## 「我想加 / 改 X，要動哪些檔案」對照表

| 想做的事                 | 主要動的檔案                                                                 |
| ------------------------ | ---------------------------------------------------------------------------- |
| 加新 API 路由            | `apps/api/src/routes/xxx.ts` + `apps/api/src/index.ts` 註冊                  |
| 加 DB 表 / 欄位          | `apps/api/prisma/schema.prisma` + `pnpm prisma migrate dev`                  |
| 加前後端共用 type / 驗證 | `packages/shared/src/` + `pnpm --filter @pace-lab/shared build`              |
| 加共用純函式             | `packages/shared/src/xxx.ts` + 寫對應 `.spec.ts` + build shared              |
| 加新前端頁面             | `apps/web/src/pages/xxx.tsx` + `App.tsx` 加 `<Route>`                        |
| 加新 React hook          | `apps/web/src/hooks/useXxx.ts`                                               |
| 加新 API client          | `apps/web/src/lib/xxxApi.ts`                                                 |
| 加多語言文字             | 三份 `apps/web/src/i18n/locales/{ja,zh,en}/common.json`                      |
| 加 shadcn 元件           | `pnpm dlx shadcn@latest add <name>` + 如果跟 RHF 整合要手動加 `forwardRef`   |
| 加環境變數（前端）       | `apps/web/.env` + `.env.example` + `vite-env.d.ts` 加型別 + Vercel Variables |
| 加環境變數（後端）       | `apps/api/.env` + `.env.example` + Railway Variables                         |
| 加部署相關設定           | Railway dashboard / Vercel dashboard，code 端不動                            |

## 路徑速查（常忘的）

- 後端入口：`apps/api/src/index.ts`
- 前端入口：`apps/web/src/main.tsx`（含 Provider 包裝）+ `apps/web/src/App.tsx`（Router）
- DB schema：`apps/api/prisma/schema.prisma`
- Tailwind 設定：`apps/web/src/index.css`（v4 全部寫在 CSS 裡）
- shadcn 設定：`apps/web/components.json`
- Vite 設定：`apps/web/vite.config.ts`
- Monorepo 設定：根目錄 `pnpm-workspace.yaml`
- pnpm 設定：根目錄 `.npmrc`

## 為什麼這樣分

幾個關鍵設計：

**`apps/` vs `packages/`**：前者「能獨立部署」、後者「被引用」。`apps/api` 上 Railway、`apps/web` 上 Vercel，`packages/shared` 兩邊都 import。

**`pages/` 跟 `components/` 分開**：route-bound 跟 reusable 區分。pages 對應 URL、components 跨頁面共用。

**`hooks/` 不在 `components/` 裡**：React 慣例。hooks 是邏輯抽象，跟 UI 元件分開放更好找。

**`lib/` 放工具**：跟「商業邏輯」（hooks、pages）區分，這裡只放跨頁面共用的純函式（fetch wrapper、cn 函式等）。

**`i18n/` 自成一區**：翻譯資源跟設定邏輯放在一起，未來加新 namespace 也方便。

**schema 跟 migrations 一起放 `prisma/`**：Prisma 慣例，不分散。

**`packages/shared/src/training/`**：按業務領域分子資料夾。未來 Sprint 3+ 加 `workouts/`、`progress/` 等是同樣 pattern。
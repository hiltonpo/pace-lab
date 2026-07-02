# pace lab 🏃

A personalized marathon training plan generator and tracker, built as a full-stack TypeScript application.

## Live Demo

- **Web**: https://pace-lab-web-58b4.vercel.app
- **API**: https://pace-labapi-production.up.railway.app
- **Health Check**: https://pace-labapi-production.up.railway.app/api/health

> Login currently requires being added to OAuth test users.

## Features

### Sprint 1: Authentication

- Google OAuth login with self-implemented session management
- Cross-origin secure cookies (Vercel ↔ Railway)
- PostgreSQL + Prisma ORM
- Shared TypeScript types between frontend and backend via monorepo

### Sprint 1.5: UI Foundation

- Tailwind CSS v4 with Japanese-inspired design tokens (OKLCH colors, Noto Sans JP)
- shadcn/ui components (Radix-based)
- Dark mode with system preference detection
- i18n support (Japanese / Traditional Chinese / English)

### Sprint 2: Training Plan Generator

- Jack Daniels VDOT formula implementation
- Training pace calculation (Easy / Marathon / Threshold / Interval / Repetition)
- 8 / 12 / 16-week marathon training plan templates
- Plan creation form with **live VDOT preview** (pure functions running in frontend)
- Plan list and detail page with full weekly training schedule
- Visual differentiation by workout type (rest / easy / quality / long / race day)
- Responsive design (mobile to desktop)

### Sprint 3: Workout Logging + Progress Charts

- Log actual workouts (distance, time, heart rate, RPE, weather, feeling, notes)
- Auto-calculated pace; completion status shown on plan detail
- **Target vs actual** comparison per workout (green = completed)
- Edit logged workouts (single form reused for create / edit)
- **Progress charts** (Recharts): weekly volume trend, pace trend (reversed Y-axis)
- Completion rate (overall + by workout type)
- **Interval structure** display (sets × distance, recovery) replacing raw total distance
- Warm-up / cool-down and per-type training notes
- Chinese validation messages; cross-field validation (max HR ≥ avg HR)

## Tech Stack

### Frontend

- React 18 + TypeScript + Vite
- TanStack Query (server state)
- **Tailwind CSS v4 + shadcn/ui** (Radix-based)
- **React Router v7** (multi-page routing)
- **React Hook Form + Zod** (form validation, shared with backend)
- **Recharts** (progress charts)
- **react-i18next** (Japanese / Traditional Chinese / English)
- **Dark mode** (system preference + manual toggle)
- Deployed on Vercel

### Backend

- Node.js 22 + TypeScript + Fastify
- Prisma ORM + PostgreSQL
- Self-implemented session auth (SHA-256 hashed tokens)
- Arctic for Google OAuth
- **Zod request validation** (shared schemas from `packages/shared`)
- REST API with CRUD + PATCH, query-string filtering
- Deployed on Railway

### Monorepo

- pnpm workspaces
- Shared types, Zod schemas, and pure functions in `packages/shared`
- Vitest unit tests
- VDOT formula, pace calculation, plan generator, format helpers all live here

## Project Structure

```
pace-lab/
├── apps/
│   ├── web/                    # Frontend (React + Vite)
│   │   ├── src/
│   │   │   ├── pages/          # 對應路由的頁面元件（Plan / Workout / Progress）
│   │   │   ├── components/     # 可重用 UI（Layout、ui/* shadcn 元件）
│   │   │   ├── hooks/          # 自訂 React hooks（usePlans / useWorkouts 等）
│   │   │   ├── i18n/           # 多語系翻譯檔
│   │   │   └── lib/            # API client、工具函式
│   │   └── ...
│   └── api/                    # Backend (Fastify + Prisma)
│       ├── src/
│       │   ├── routes/         # API endpoints (auth.ts, plans.ts, workouts.ts)
│       │   ├── auth/           # Session、cookie、OAuth 邏輯
│       │   └── db.ts           # Prisma client
│       └── prisma/             # DB schema 與 migrations
├── packages/
│   └── shared/                 # 共用 types、Zod schemas、純函式
│       └── src/training/       # VDOT 公式、計畫模板、generator、workout schemas
├── docs/
│   ├── project-structure.md
│   ├── railway-deploy-guide.md
│   ├── vercel-deploy-guide.md
│   ├── ui-foundation-notes.md
│   └── api-design.md
└── docker-compose.yml          # 本地 PostgreSQL
```

## Local Development

### Prerequisites

- Node.js 22+ (or 20+)
- pnpm 9
- Docker Desktop

### Setup

```bash

# Clone

git clone https://github.com/hiltonpo/pace-lab.git
cd pace-lab

# Install

pnpm install

# Start local PostgreSQL

docker compose up -d

# Setup environment variables

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Fill in Google OAuth credentials

# Run migrations

cd apps/api && pnpm prisma migrate dev

# Build shared (required after any change to packages/shared)

cd ../.. && pnpm --filter @pace-lab/shared build

# Start dev (both frontend and backend)

pnpm dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

### Testing

```bash

# 跑 packages/shared 的 unit tests

pnpm --filter @pace-lab/shared test

# 覆蓋 VDOT 公式、format 工具（含 parseDuration 嚴格驗證）、計畫產生器（含 interval 結構）

```

## Documentation

- [Project Structure](./docs/project-structure.md) — 目錄結構與檔案職責
- [Railway Deployment Guide](./docs/railway-deploy-guide.md) — pnpm monorepo + Prisma 部署到 Railway 的流程與問題處理
- [Vercel Deployment Guide](./docs/vercel-deploy-guide.md) — Vite 部署到 Vercel、跨網域 cookie、OAuth 整合
- [UI Foundation Notes](./docs/ui-foundation-notes.md) — UI 設計決策、Tailwind v4、shadcn、Sprint 2 前端模式、Sprint 3（Recharts、元件重用等）
- [API Design Conventions](./docs/api-design.md) — REST 慣例、Zod 驗證、權限邊界、transaction、Sprint 3（PATCH / query 篩選 / refine）

## Design Decisions

### Self-implemented sessions

Lucia 於 2025 年 3 月棄用，作者建議直接實作 session 管理。Auth.js 與 Next.js 緊密耦合，搭配獨立 Fastify 後端需要額外的整合代碼。

自行實作 session（約 40 行代碼）的考量：

- 完整控制 token 雜湊、過期、續期機制
- 不依賴可能被棄用的外部套件

### Monorepo with shared package

前端與後端共用 TypeScript types 與 Zod schemas。API contract 變更時，TypeScript 即時反映在前端，避免前後端型別不一致的問題。

Sprint 2 進一步把純函式（VDOT 公式、配速計算、計畫產生器）也放進 `packages/shared`——前端表單可以「即時預覽計畫」而不打 API、後端則用同一份函式產生資料寫入 DB。

### Prisma String + Zod enum over Prisma Enum

對於可列舉的欄位（如 `goalRaceType`、`weather`、`feeling`），DB 層用 `String`、應用層用 Zod 的 `z.enum([...])` 做 runtime 驗證。

理由：

- 新增類型不用 DB migration
- Single source of truth 集中在 `packages/shared`
- Prisma enum 無法被前端直接 import；String + Zod 可以跨前後端共用

### Pure functions in shared package

VDOT 計算、計畫產生器都是純函式（不依賴 DB、不依賴 React state）。好處：

- 同一份邏輯後端用（建立計畫時）、前端也用（即時預覽）
- 不用 mock 就能寫單元測試
- 用 `z.infer<typeof schema>` 自動推導 type，API contract 永遠對齊

### Snapshot pattern for derived data

`TrainingPlan.vdot` 存的是「建立當下計算的結果」，不是每次查詢重算。如果未來公式調整，舊計畫保留歷史值。`ActualWorkout.actualPaceSec`、`planId` 也採同樣思路——存衍生值換查詢效率。

DB 是「事件紀錄」不是「即時 view」——這個思路適用於所有衍生欄位。

### 404 over 403 for permission boundaries

當使用者請求一個不屬於自己的資源時，回 404 而不是 403：

```
403: 「這個 ID 存在、但你看不到」 ← 洩漏存在性
404: 「這個 ID 不存在或你看不到」 ← 攻擊者無法分辨
```

GitHub、GitLab 等成熟服務都採同樣做法。

### PATCH for partial updates

訓練紀錄的修改用 PATCH（部分更新）而非 PUT（整體替換）。Zod schema 用 `.partial()` 讓欄位可選；後端用 `!== undefined` 區分「沒傳」vs「傳 null/0」，只更新有給的欄位。

### Cross-origin secure cookies

Production 環境（Vercel ↔ Railway 不同網域）：

- `sameSite: "none"` + `secure: true`（必須成對）
- `FRONTEND_URL` 不能有結尾斜線
- CORS 與 fetch 兩邊都要設 `credentials: "include"`

本地開發環境（同源 localhost）：`sameSite: "lax"` + `secure: false`。

詳見 [Vercel Deployment Guide](./docs/vercel-deploy-guide.md)。

### pnpm

- 磁碟空間使用效率（單一 content-addressable store）
- 預設嚴格的依賴管理
- workspace 支援度

Sprint 2 過程中也碰到 pnpm 嚴格依賴的雷（peer dependency 如 `tslib` 沒自動 hoist），目前用 `.npmrc` 的 `shamefully-hoist=true` 解決。

## Roadmap

- [x] Sprint 1: Authentication & deployment infrastructure
- [x] Sprint 1.5: UI foundation (Tailwind v4, shadcn, dark mode, i18n)
- [x] Sprint 2: Training plan generator (Jack Daniels VDOT formula)
- [x] Sprint 3: Workout logging + progress charts
- [ ] Sprint 4: PWA support, offline-first
- [ ] Sprint 5: Personal records, plan adjustment
- [ ] Sprint 6: Polish + demo video

### Sprint 4+ Backlog (ideas parked)

- Interval-specific logging format: record the main-set pace only (excluding recovery / warm-up), to avoid diluting interval pace with "total distance ÷ total time"
- Edit plan / delete a single planned workout (will trigger `ActualWorkout` SetNull)
- Per-rep interval logging (surface pace fade across reps as a fatigue indicator)

## License

MIT

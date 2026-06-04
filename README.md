# pace lab 🏃

A personalized marathon training plan generator and tracker, built as a full-stack TypeScript application.

## Live Demo

- **Web**: https://pace-lab-web-58b4.vercel.app
- **API**: https://pace-labapi-production.up.railway.app
- **Health Check**: https://pace-labapi-production.up.railway.app/api/health

> Login currently requires being added to OAuth test users.

## Features (Sprint 1)

- Google OAuth login with self-implemented session management
- Cross-origin secure cookies (Vercel ↔ Railway)
- PostgreSQL + Prisma ORM
- Shared TypeScript types between frontend and backend via monorepo

## Tech Stack

### Frontend
- React 18 + TypeScript + Vite
- TanStack Query for server state
- Deployed on Vercel

### Backend
- Node.js + TypeScript + Fastify
- Prisma ORM + PostgreSQL
- Self-implemented session auth (hashed tokens)
- Deployed on Railway

### Monorepo
- pnpm workspaces
- Shared types and Zod schemas in `packages/shared`

## Project Structure

~~~
pace-lab/
├── apps/
│   ├── web/                  # Frontend (React + Vite)
│   └── api/                  # Backend (Fastify + Prisma)
├── packages/
│   └── shared/               # Shared TypeScript types & Zod schemas
├── docs/
│   ├── railway-deploy-guide.md
│   └── vercel-deploy-guide.md
└── docker-compose.yml        # Local PostgreSQL
~~~

## Local Development

### Prerequisites
- Node.js 22+ (or 20+)
- pnpm 9
- Docker Desktop

### Setup

~~~bash
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

# Start dev (both frontend and backend)
cd ../.. && pnpm dev
~~~

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Documentation

- [Railway Deployment Guide](./docs/railway-deploy-guide.md) — pnpm monorepo + Prisma 部署到 Railway 的流程與問題處理
- [Vercel Deployment Guide](./docs/vercel-deploy-guide.md) — Vite 部署到 Vercel、跨網域 cookie、OAuth 整合

## Design Decisions

### Self-implemented sessions

Lucia 於 2025 年 3 月棄用，作者建議直接實作 session 管理。Auth.js 與 Next.js 緊密耦合，搭配獨立 Fastify 後端需要額外的整合代碼。

自行實作 session（約 40 行代碼）的考量：
- 完整控制 token 雜湊、過期、續期機制
- 不依賴可能被棄用的外部套件

### Monorepo with shared package

前端與後端共用 TypeScript types 與 Zod schemas。API contract 變更時，TypeScript 即時反映在前端，避免前後端型別不一致的問題。

### pnpm

- 磁碟空間使用效率（單一 content-addressable store）
- 預設嚴格的依賴管理
- workspace 支援度

## Roadmap

- [x] Sprint 1: Authentication & deployment infrastructure
- [ ] Sprint 2: Training plan generator (Jack Daniels VDOT formula)
- [ ] Sprint 3: Workout logging + progress charts
- [ ] Sprint 4: PWA support, offline-first
- [ ] Sprint 5: Personal records, plan adjustment
- [ ] Sprint 6: i18n, polish, demo video

## License

MIT

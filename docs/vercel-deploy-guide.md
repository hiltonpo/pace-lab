# Vercel 部署指南

Vite + React + TypeScript monorepo 前端部署到 Vercel 的流程與常見問題處理。

## 適用情境

- 前端：Vite + React + TypeScript
- monorepo（pnpm workspace）
- 後端獨立部署在其他平台（例如 Railway）

---

## 部署前的程式碼準備

### 1. API base URL 改用環境變數

寫死 `localhost:3000` 在 production 無法運作，改成讀環境變數：

~~~ts
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
~~~

注意事項：
- Vite 使用 `import.meta.env`，不是 Node 的 `process.env`
- 環境變數名稱必須以 `VITE_` 開頭，才會被 Vite 暴露到瀏覽器端
- 使用 `??` 提供 fallback，本地未設定環境變數時仍可運作

### 2. TypeScript 型別宣告

僅修改 code 不夠，`tsc` 編譯時會報錯：

~~~
Property 'env' does not exist on type 'ImportMeta'
~~~

建立 `apps/web/src/vite-env.d.ts`：

~~~ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
~~~

說明：
- `.d.ts` 檔案中不 `export` 的 interface 會成為全域宣告
- `ImportMeta` 與 `ImportMetaEnv` 名稱固定不可修改，TypeScript 透過同名 interface 自動合併機制擴充 Vite 內建型別
- 欄位名稱對應實際的環境變數名稱

### 3. 建立 `.env.example`

~~~
# apps/web/.env.example
VITE_API_BASE_URL=http://localhost:3000
~~~

`.env.example` 需要 commit，`.env` 不能 commit。

### 4. 移除所有寫死的後端 URL

包含但不限於：
- API client 的 base URL
- OAuth 登入按鈕的 `href`
- 任何 `fetch("http://localhost:...")` 呼叫

~~~tsx
// 修改前
<a href="http://localhost:3000/api/auth/google">login</a>

// 修改後
const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
<a href={`${apiBase}/api/auth/google`}>login</a>
~~~

---

## Vercel 設定流程

### Step 1：連接 GitHub

1. 進入 [vercel.com](https://vercel.com) 使用 GitHub 登入
2. Add New → Project → Import 目標 repo
3. 第一次需授權 Vercel 存取 GitHub

### Step 2：設定 Framework 與目錄

monorepo 需手動設定：

| 欄位 | 值 |
|---|---|
| Framework Preset | Vite |
| Root Directory | `apps/web`（用 Edit 按鈕選擇資料夾） |
| Build Command | 見下方 |
| Output Directory | `dist` |
| Install Command | 見下方 |

Build Command（monorepo）：

~~~
cd ../.. && pnpm --filter @scope/shared build && pnpm --filter @scope/web build
~~~

Install Command：

~~~
cd ../.. && pnpm install --frozen-lockfile
~~~

`cd ../..` 用於回到 monorepo 根目錄執行指令。

### Step 3：環境變數

Settings → Environment Variables：

~~~
VITE_API_BASE_URL=https://<後端網址>
~~~

格式要求：
- 必須以 `https://` 開頭
- 不可加結尾斜線
- 不可加 `/api` 路徑（前端 code 會自動拼接）
- 不可包引號

環境變數修改後必須 Redeploy 才會生效。Vite 將環境變數編譯進產物中，並非 runtime 讀取。Redeploy 時取消勾選 "Use existing Build Cache" 確保完全重新建置。

### Step 4：取得 Production Domain

Deploy 成功後 Dashboard 會顯示 production domain，格式為 `xxx.vercel.app`。

注意：
- Vercel 會產生多個 domain（一個 production、多個 preview）
- 以 Dashboard 顯示的 production domain 為準

---

## 跨網域整合

前端、後端、OAuth provider 三邊的網址必須對應：

~~~
Vercel: VITE_API_BASE_URL ──── 必須 = 後端 Public Domain
                                 （加上 /api/auth/google/callback）
後端: GOOGLE_REDIRECT_URI ───── 

Google Console: Authorized URIs ─── 

Vercel domain ──── 後端: FRONTEND_URL（必須一致）
~~~

### Cookie 跨網域設定

預設 `sameSite: "lax"` 在跨網域情境下會被瀏覽器拒收，必須修改：

~~~ts
const isProd = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  sameSite: isProd ? "none" as const : "lax" as const,
  secure: isProd,
};
~~~

`sameSite: "none"` 強制 `secure: true`（必須 HTTPS）。

### CORS 設定

後端：

~~~ts
await app.register(cors, {
  origin: [process.env.FRONTEND_URL ?? "http://localhost:5173"],
  credentials: true,
});
~~~

前端 fetch：

~~~ts
fetch(url, {
  credentials: "include",
});
~~~

任一邊缺少 credentials 設定，跨網域 cookie 不會運作。

---

## 第三方服務白名單

部署後需同步更新外部服務設定：

| 服務 | 設定 |
|---|---|
| Google OAuth | Authorized redirect URIs 加上 `https://<後端>/api/auth/google/callback`，保留 localhost |
| OAuth Consent Screen | Test users 加入測試帳號 |
| 後端 `FRONTEND_URL` | 更新為 Vercel production domain（不可加結尾斜線） |

Google OAuth 設定修改後需等待 5〜30 分鐘才會生效。`redirect_uri_mismatch` 錯誤多數為同步延遲所致。

---

## Debug 順序

當部署遇到問題時，依此順序排查：

1. Vercel build log — 失敗在 install 或 build 階段
2. Vercel runtime log — 部署成功但執行時錯誤
3. 瀏覽器 F12 → Console — JavaScript 錯誤
4. 瀏覽器 F12 → Network — 失敗 request 的 Status、Response Headers、Request Headers
5. 瀏覽器 F12 → Application → Cookies — cookie 是否存在及屬性

### 常見錯誤對照

| 錯誤訊息 | 原因 | 解法 |
|---|---|---|
| `Property 'env' does not exist on type 'ImportMeta'` | TypeScript 缺少 Vite 環境變數型別宣告 | 建立 `vite-env.d.ts` |
| 點擊登入後出現 "Not Found / The train has not arrived" | `VITE_API_BASE_URL` 不是有效的後端網址，或後端 service 未設定 public domain | 確認 Vercel 環境變數值、後端 Networking 設定 |
| `redirect_uri_mismatch` | OAuth provider 白名單未包含實際 redirect URI | 加入 URI，等待 5〜30 分鐘生效 |
| 登入後畫面未更新（仍顯示未登入） | Cookie 未成功寫入瀏覽器 | 檢查 Network 的 Set-Cookie header、Application 的 Cookies 屬性 |
| `FRONTEND_URL` 多了結尾斜線 | redirect 變成 `https://xxx.vercel.app//`（雙斜線），部分瀏覽器會視為不同網域 | 移除 `FRONTEND_URL` 結尾斜線 |
| 環境變數修改後行為未變 | Vercel 沒有 redeploy 或使用了快取 | Deployments → Redeploy，取消 "Use existing Build Cache" |
| CORS 錯誤 | 後端 `FRONTEND_URL` 設定錯誤、或 `credentials: true` 未開啟 | 檢查後端 CORS 設定與前端 fetch credentials |

---

## 部署 Checklist

### Phase 1：程式碼準備
- [ ] API base URL 改用 `import.meta.env.VITE_*`
- [ ] 建立 `vite-env.d.ts`
- [ ] 所有寫死的後端 URL 改用環境變數
- [ ] 建立 `.env.example`
- [ ] 本地 `pnpm build` 成功通過 TypeScript 檢查

### Phase 2：Vercel 設定
- [ ] Import GitHub repo
- [ ] Framework 設為 Vite
- [ ] Root Directory 設為 `apps/web`
- [ ] Build / Install Command 使用 monorepo 版本（`cd ../..` + `--filter`）
- [ ] Environment Variables 設定 `VITE_API_BASE_URL`（無結尾斜線、無 `/api`）

### Phase 3：跨網域整合
- [ ] 後端 `FRONTEND_URL` 設為 Vercel domain（無結尾斜線）
- [ ] OAuth provider 白名單加入 production redirect URI
- [ ] 等待 OAuth 設定生效（5〜30 分鐘）

### Phase 4：驗證
- [ ] Vercel domain 可開啟並正常顯示
- [ ] 完整登入流程通過
- [ ] F12 → Cookies 確認 session 屬性為 Secure + HttpOnly + SameSite=None
- [ ] 登出可清除狀態
- [ ] 重新整理或重啟後仍保持登入狀態

---

## 補充說明

1. Vercel 為每個 PR 自動建立 preview deployment，OAuth 等服務白名單需要時也加入 preview URL
2. Vercel 環境變數有 Production / Preview / Development 三個 scope，跨 scope 使用需分別設定
3. 環境變數修改後若行為未變，第一步先確認 Redeploy 狀態
4. `import.meta.env` 為 build-time 注入，並非 runtime，build 完成後修改環境變數需要重新 build

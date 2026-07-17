# API Design Conventions

這份文件整理 Sprint 2 過程中建立的 API 設計慣例，未來新增 endpoint 時可參考。

## REST 慣例

- URL 描述「資源」（`/api/plans`、`/api/workouts`）
- HTTP method 描述「動作」（POST、GET、DELETE、PATCH）
- 資源名稱用複數（`/plans` 而非 `/plan`）
- 特定資源用 path 帶 ID（`/plans/:id`）
- Query string 用於 filter 與 pagination（`/plans?status=active`）

### Endpoint 命名範例

```
POST /api/plans 建立新計畫
GET /api/plans 列出所有計畫（摘要）
GET /api/plans/:id 取得單一計畫詳情
DELETE /api/plans/:id 刪除計畫
PATCH /api/plans/:id 部分更新（未來）
```

## HTTP Status Code 慣例

| Code             | 用途                                 |
| ---------------- | ------------------------------------ |
| 200 OK           | GET 成功                             |
| 201 Created      | POST 成功，資源已建立                |
| 204 No Content   | DELETE / PATCH 成功且無回傳 body     |
| 400 Bad Request  | 輸入驗證失敗（Zod 錯誤）             |
| 401 Unauthorized | 未登入 / session 過期                |
| 404 Not Found    | 資源不存在 **或** 使用者無權限       |
| 500 Server Error | 內部錯誤（不手動回傳，交給 Fastify） |

特別注意：403 Forbidden 刻意不使用。詳見下方「權限邊界」。

## 身分驗證模式

所有需要登入的 endpoint 都用 `getCurrentUser(request)` helper：

```typescript
const user = await getCurrentUser(request);
if (!user) {
  return reply.status(401).send({ error: "Unauthorized" });
}
```

Helper 內部會驗證 session cookie 並回傳 user 或 null。每個需要保護的 endpoint 都用同一行 pattern——簡單、一致、易讀。

未來 endpoint 變多（例如 10+ 個）可考慮抽成 Fastify plugin / middleware 自動掛上。但 Sprint 2 的 4 個 endpoint 手動呼叫更清楚。

## Zod 驗證

所有外部來源資料（body、params、query）都用 `packages/shared` 提供的 Zod schema 驗證：

```typescript
const parseResult = createPlanInputSchema.safeParse(request.body);
if (!parseResult.success) {
  return reply.status(400).send({
    error: "Invalid input",
    details: parseResult.error.issues,
  });
}
const input = parseResult.data; // 之後都是型別安全
```

URL params 也顯式驗證：

```typescript
const paramsSchema = z.object({ id: z.string() });
const paramsResult = paramsSchema.safeParse(request.params);
if (!paramsResult.success) {
  return reply.status(400).send({ error: "Invalid id" });
}
```

### 為什麼放在 packages/shared

把 schema 放 `packages/shared` 的好處：

- 前端 form 直接 `import { createPlanInputSchema }` 當 RHF 驗證來源
- 後端 API 用同一份 schema 驗證 request
- 改 schema → 前後端同時更新，不會型別分裂

這是 monorepo 真正的價值所在。

## 權限邊界：404 而非 403

當使用者請求一個「存在但不屬於自己」的資源時：

```typescript
if (!plan || plan.userId !== user.id) {
  return reply.status(404).send({ error: "Plan not found" });
}
```

為什麼用 404 而不是 403：

- 403 會洩漏「**這個 ID 存在、但你看不到**」的資訊
- 404 讓「**ID 不存在**」跟「**你不擁有**」變得無法區分
- 防止攻擊者用枚舉攻擊找出有效 ID

GitHub、GitLab 等成熟服務都採同樣做法。

## Transaction（資料庫事務）

多個 DB 操作必須一起成功或一起失敗時，用 `prisma.$transaction`：

```typescript
const plan = await prisma.$transaction(async (tx) => {
  const createdPlan = await tx.trainingPlan.create({
    data: {
      /* ... */
    },
  });

  await tx.plannedWorkout.createMany({
    data: workouts.map((w) => ({
      planId: createdPlan.id,
      /* ... */
    })),
  });

  return tx.trainingPlan.findUnique({
    where: { id: createdPlan.id },
    include: { plannedWorkouts: true },
  });
});
```

什麼時候用 transaction：

- 建立父資源 + 子資源（Plan + 84 個 Workouts）
- 同時更新多筆相關紀錄
- 任何「半成功狀態」會變成髒資料的場景

注意 transaction 內部要用 `tx` 而不是 `prisma`——這是 Prisma 識別「**這些操作屬於同一個 transaction**」的方式。

## 批次寫入：createMany 而非 loop create

```typescript
// ❌ 慢：發 84 個 INSERT
for (const w of workouts) {
  await tx.plannedWorkout.create({ data: w });
}

// ✅ 快：發 1 個 INSERT 含 84 行
await tx.plannedWorkout.createMany({ data: workouts });
```

`createMany` 比 loop 快 10-100 倍。每筆獨立 INSERT 要做：parse SQL、檢查 constraint、寫 disk、log——loop 重複所有步驟。

## 顯式排序

DB 預設不保證順序，要顯式 `orderBy`：

```typescript
plannedWorkouts: {
orderBy: [
{ weekNumber: "asc" },
{ dayOfWeek: "asc" },
],
}
```

即使前端會再排序，API 直接回傳排序好的好處：

- 減少前端 code
- 測試結果可預測
- 用 Postman / curl 直接打 API 的使用者也得到合理結果

## 列表 vs 詳情 payload 分離

回傳列表的 endpoint 應該輕量、詳情可以含完整巢狀資料：

```typescript
// GET /api/plans (列表)
const plans = await prisma.trainingPlan.findMany({
  where: { userId: user.id },
  orderBy: { createdAt: "desc" },
  // 沒有 include - 只回計畫摘要
});

// GET /api/plans/:id (詳情)
const plan = await prisma.trainingPlan.findUnique({
  where: { id },
  include: {
    plannedWorkouts: {
      orderBy: [{ weekNumber: "asc" }, { dayOfWeek: "asc" }],
    },
  },
});
```

理由：列表如果含 10 個計畫 × 84 個 workouts = 840 個物件。網路傳輸跟前端 render 都會慢。

「列表瀏覽、點進詳情看細節」是通用 UX，列表就回摘要、詳情才展開。

## 錯誤回傳格式

跨 endpoint 統一格式：

```typescript
// 單一錯誤
{ error: "Unauthorized" }

// 含驗證細節
{
error: "Invalid input",
details: [
{ path: ["name"], message: "計畫名稱不可為空" },
{ path: ["goalTimeSec"], message: "Must be positive" },
]
}
```

前端可以：

- `error` 顯示在 top-level toast / banner
- `details` 對應到表單欄位下方的錯誤訊息

## Helper 抽離（DRY）

重複的邏輯抽成 helper：

```typescript
async function getCurrentUser(request) {
  const token = request.cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  const result = await validateSessionToken(token);
  return result?.user ?? null;
}
```

未來方向：當需要登入的 endpoint 變多，可包成 Fastify plugin 自動掛上。但目前 4 個 endpoint 手動呼叫更直觀。

## 之後可能會擴充的方向

當資料量或使用者量成長到一定規模，會需要：

- **Pagination**：計畫列表超過 50 筆時加 `?page=1&limit=20` 或 cursor-based
- **Filtering**：`?status=active` 列出特定狀態的計畫
- **Soft delete**：標記刪除而非實際刪除 row
- **Rate limiting**：防止濫用
- **Frontend optimistic UI**：TanStack Query 支援、但要小心 rollback 邏輯

這些屬於「**之後遇到再做**」的優化——不過度設計。

## Sprint 3 新增慣例

### PATCH 部分更新

Sprint 2 只有 POST/GET/DELETE，Sprint 3 引入 PATCH（`PATCH /api/workouts/:id`）：

- Zod schema 用 `.partial()` 讓所有欄位可選（讓使用者只傳想改的欄位）
- **陷阱**：`.partial()` 要從「純 object schema」呼叫，不能從加了 `.refine()` 的版本。因為 `z.object().refine()` 回傳 `ZodEffects`，會失去 `.partial()` 方法。解法：先定義純 `workoutObjectSchema`，create 版 = object + refine、update 版 = object.partial() + refine
- 後端只更新有給的欄位：用 `input.X !== undefined` 判斷（**不是** `if (input.X)`，才能區分「沒傳」vs「傳 null/0」）
- 衍生欄位在依賴改變時重算：距離或時間改 → 重算配速，用 `?? existing` 取新值或舊值

```typescript
const data: Record<string, unknown> = {};
if (input.rpe !== undefined) data.rpe = input.rpe;
// distance 或 duration 改了才重算 pace
if (input.actualDistanceKm !== undefined || input.actualDurationSec !== undefined) {
  const distance = input.actualDistanceKm ?? existing.actualDistanceKm;
  const duration = input.actualDurationSec ?? existing.actualDurationSec;
  data.actualPaceSec = calcPaceSec(distance, duration);
}
```

### Query string 篩選

`GET /api/workouts?planId=xxx&from=&to=`：

- Zod schema 全 `optional`（篩選條件有就用、沒有就忽略）
- 動態組 where：先 `{ userId }`，有條件才 `where.X = ...`（同 Laravel 條件式 `->where()`）
- 日期範圍用 `gte` / `lte`（`>=` / `<=`）

```typescript
const where: Prisma.ActualWorkoutWhereInput = { userId: user.id };
if (planId) where.planId = planId;
if (from || to) {
  where.date = {};
  if (from) where.date.gte = new Date(from);
  if (to) where.date.lte = new Date(to);
}
```

用 `Prisma.XWhereInput` 型別而非 `any`，IDE 才會補全 gte/lte、擋掉打錯的 key。

### 跨欄位驗證用 refine

單欄位 `.min()` / `.max()` 管不到「欄位之間的關係」。`.refine()` 拿到整個物件，可驗證跨欄位規則（例如「最大心率 >= 平均心率」）：

```typescript
.refine(
  (data) => {
    if (data.avgHeartRate != null && data.maxHeartRate != null) {
      return data.maxHeartRate >= data.avgHeartRate;
    }
    return true; // 任一沒填就不檢查
  },
  { message: "最大心率不應低於平均心率", path: ["maxHeartRate"] },
)
```

### 冗餘欄位換查詢效率

`actual_workouts` 同時存 `plannedWorkoutId` 跟 `planId`（後者可由前者 join 查到）。直接存 `planId` 讓「查某計畫所有紀錄」變單一 index 查詢、不用 join——用一點冗餘換查詢效率，同 snapshot 思路。

### onDelete 三種策略

`actual_workouts` 三個外鍵用了三種 onDelete，各有語意：

| 外鍵 | onDelete | 為什麼 |
|---|---|---|
| userId | Cascade | user 刪 → 紀錄一起刪（無孤兒） |
| plannedWorkoutId | SetNull | 計畫項目刪 → 紀錄保留、連結設 null（實際跑過的事不該消失） |
| planId | Cascade | 整個計畫刪 → 相關紀錄一起刪 |

### 建立子資源時記得同步 schema 變更

**跨 sprint 的經典漏洞**：Sprint 2 寫的 `createMany`（建計畫的 plannedWorkouts）在 Sprint 3 加了 `intervals` / `warmupKm` / `cooldownKm` 欄位後，若沒同步更新 `createMany` 的 `data.map`，generatePlan 產出的新欄位不會被寫入 DB（存成 null）。schema、產生器、寫入三處改欄位時要同步。

### 使用者輸入驗證訊息中文化

會被使用者看到的欄位（距離、時間、心率、溫度、RPE）的 `.min()` / `.max()` 都帶自訂中文 message；按鈕選的欄位（weather / feeling enum）的 message 只是後端防禦（前端選按鈕不會觸發），不用講究。

## Sprint 4 新增慣例

### interval 專用欄位:mainSetPaceSec

`ActualWorkout` 加 `mainSetPaceSec`（主段平均配速），解決 interval 配速失真：

```
interval 8×1km @ 4:29 + 恢復慢跑 + warmup/cooldown
  總距離 12km、總時間 81 分 → actualPaceSec = 6:45/km（被恢復稀釋、失真）
  mainSetPaceSec = 4:32/km（只算快跑段，反映真實間歇強度）
```

- interval 紀錄兩個都存：`actualPaceSec`（整場、反映總消耗）+ `mainSetPaceSec`（主段、反映強度）
- 非 interval 的 `mainSetPaceSec` 是 null（不適用）
- 資料來源：跑者可在 Garmin Connect 過濾 Run 段取得主段平均

### schema 疊加、不改舊欄位

Sprint 4 只「加」欄位（mainSetPaceSec），不動 Sprint 3 的欄位——同 Sprint 3 加 interval 結構的疊加原則。未來若做「每趟配速」（做法 B），再加 `lapPaces Json?`，一樣疊加。

### 相似邏輯但不共用:配速與時間解析

interval 主段配速輸入（"4:32"）與時間輸入（"25:00"）格式相同（mm:ss），共用 `parseDuration` 解析；但**錯誤訊息分開**（配速用 `paceError`、時間用 `durationError`），因為使用者情境不同（範例、欄位名不同）。相似邏輯可共用，語意不同的訊息該分開。

## Sprint 5 新增慣例

### PersonalRecord：沿用既有 enum，不另立命名

PR 的 `distance` 直接用 `raceTypeSchema`（marathon/half_marathon/10k/5k），不定義新的 PR_DISTANCES：

- 單一來源：距離定義只有一套（raceType），PR 與計畫用同一組
- 可對照：之後「PR vs 計畫目標」對照時 distance 直接對得上（都是 marathon）
- 配速換算共用既有 `RACE_DISTANCE_KM`

新增綁 user 的表時，記得在 User 加反向關聯（`personalRecords PersonalRecord[]`）——Prisma 要求關聯兩邊都定義，否則 migrate 失敗。

### 同距離多筆的取捨：查詢時挑，不在寫入時限制

PR 允許同距離多筆（保留歷史，看進步）。「當前 PR」在查詢/前端挑最快（timeSec 最小），而不是寫入時限制「一距離一筆」。資料層保留完整事件、呈現層做彙整——同 snapshot 思路。

### 錯誤訊息 i18n 化：schema 存 key，前端翻譯

跨全專案的錯誤訊息多語系策略：

- schema 的 `message` 存「i18n key」（如 `errors.time.positive`），不寫死語言
- 前端顯示用 `t(errors.X.message ?? "")` 翻譯（`?? ""` 處理 message 可能 undefined 的型別）
- 三份 locale 的 `errors` 區塊提供翻譯
- `mutation.error`（API/網路錯誤）不走此機制——那是後端回傳的訊息，非 Zod key
- 好處：切語言時驗證錯誤訊息跟著變；壞處：key 要跟 i18n 完全對齊，否則原始 key 露出

## Sprint 6 新增慣例（PWA 對 API 的影響）

### API 回應的快取策略：NetworkFirst

Service Worker 對 API 請求採 **NetworkFirst**（網路優先、失敗退快取）：

```typescript
runtimeCaching: [{
  urlPattern: ({ url }) => url.origin === "https://pace-labapi-production.up.railway.app",
  handler: "NetworkFirst",
  options: {
    cacheName: "api-cache",
    expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
    cacheableResponse: { statuses: [0, 200] },
  },
}]
```

- **線上**：連 API 拿最新資料，順便更新快取
- **離線**：API 連不上 → 退用快取 → 使用者仍能看到「上次載過的」計畫與訓練
- 只快取成功回應（200），不快取錯誤

對照三種策略的取捨：

| 策略 | 行為 | 適用 |
|---|---|---|
| CacheFirst | 先找快取，沒有才連網 | 靜態資源（JS/CSS/字型/圖片） |
| NetworkFirst | 先連網，失敗才用快取 | 會變的資料（API 回應） |
| StaleWhileRevalidate | 立刻給快取、背景更新 | 可接受短暫舊資料、要求快速顯示 |

### 認證資料的快取風險

API 需要 session cookie，NetworkFirst 會把「登入後的資料」存進快取。若切換帳號，可能短暫看到前一個帳號的快取資料。

目前個人使用尚可接受；未來若支援多帳號，登出時應清除 `api-cache`（`caches.delete("api-cache")`）。

### 寫入操作在離線時應被擋下

PWA 定位是「離線可看」（層次 2），不是「離線可寫」（層次 3，需離線佇列 + 背景同步）。因此離線時前端 disable 儲存／刪除按鈕，不送出寫入請求——避免使用者填完表單才失敗。

若未來要做離線寫入，需要 IndexedDB 暫存 + Background Sync API + 衝突處理，屬獨立主題。

## Sprint 7 新增慣例（FIT 檔匯入）

### 檔案上傳 endpoint

`POST /api/fit/parse` — 接 multipart/form-data 的 .fit 檔：

```typescript
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

app.post("/api/fit/parse", async (request, reply) => {
  const user = await getCurrentUser(request);
  if (!user) return reply.status(401).send({ error: "Unauthorized" });

  const data = await request.file();          // @fastify/multipart
  if (!data) return reply.status(400).send({ error: "No file uploaded" });
  const buffer = await data.toBuffer();       // 二進位內容

  const stream = Stream.fromBuffer(buffer);
  if (!Decoder.isFIT(stream)) {               // 先驗證再解析
    return reply.status(400).send({ error: "不是有效的 FIT 檔" });
  }
  const { messages, errors } = new Decoder(stream).read();
  // ...
});
```

要點：

- **限制檔案大小**（FIT 通常 < 1MB，設 10MB 上限防濫用）
- **先 `Decoder.isFIT()` 驗證再解析**——使用者可能上傳照片/PDF，早點擋下
- **`errors` 不一定要中斷**——FIT 可能部分損壞但主要資料仍可用，log 後繼續（盡力而為）
- 外部資料欄位不保證存在，大量用 `?.` / `?? null` 防禦性取值

### 「解析」與「儲存」分離

`/api/fit/parse` **只解析、不寫 DB**，回傳結構化資料給前端預填表單，使用者確認後才走既有的 `POST /api/workouts` 儲存。

好處：

- 解析失敗不產生髒資料
- 使用者能檢查／微調再存（改類型、加備註、對應計畫項目）
- 重用既有的建立 API，不重寫儲存邏輯
- 單一職責：parse 只管解析

### 單位對應是第三方整合的日常

FIT 用公制原始單位，需轉換成應用層的單位：

```
FIT totalDistance（公尺）  → distanceKm（÷ 1000）
FIT totalTimerTime（秒，可能小數） → durationSec（Math.round）
FIT 沒有「秒/km」配速     → 自行計算：時間 ÷ 距離(km)
```

接任何第三方資料源，第一件事都是確認欄位單位與語意。

### 演算法放 shared，不放 route

`detectMainSet` 是純函式（不依賴 DB/HTTP），放 `packages/shared`：

- 可寫單元測試（用真實 FIT 資料當測試案例）
- 前後端都能用（目前後端用，未來前端也可即時分析）
- route 只負責「解析檔案 + 呼叫演算法 + 回傳」，不含業務邏輯

## Sprint 8 新增慣例（laps 儲存）

### 用 Json 存 laps，不另開表

`ActualWorkout.laps Json?` 存 FIT 解析出的每趟資料：

```prisma
model ActualWorkout {
  // ...
  laps Json?   // [{ index, distanceM, durationSec, avgHeartRate, paceSec, isMainSet }]
}
```

判斷依據（同 Sprint 3 的 `PlannedWorkout.intervals`）：

- 結構固定但筆數不定（一次訓練 3~30+ 趟）
- **不需要「依 lap 篩選查詢」**（不會查「所有 4:00 以下的趟」）→ 不用正規化
- 永遠跟著 workout 一起讀寫 → 沒有獨立生命週期

若未來要跨訓練查詢單趟資料，才需要抽成 `WorkoutLap` 表。現在不過度設計。

### 判斷結果存起來，不重算（snapshot）

存 laps 時就把 `detectMainSet` 的結果標進去：

```typescript
const mainSetIndexes = new Set(data.mainSet?.mainSetIndexes ?? []);
setValue("laps", data.laps.map((lap) => ({
  ...lap,
  isMainSet: mainSetIndexes.has(lap.index),
})));
```

顯示時直接看 `isMainSet`，不用重跑演算法。同 `vdot` / `actualPaceSec` 的 snapshot 思路——存「當下判斷的結果」。未來若讓使用者手動修正主段，改的結果也存在這裡。

### Prisma Json 欄位的 null

```typescript
laps: input.laps ?? undefined,                       // POST
if (input.laps !== undefined) data.laps = input.laps ?? undefined;   // PATCH
```

Prisma 的 Json 欄位傳 `null` 會型別報錯，要用 `undefined`（不設值）或 `Prisma.JsonNull`。Sprint 3 的 `intervals` 踩過同樣的坑。

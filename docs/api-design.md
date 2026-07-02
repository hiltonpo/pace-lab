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

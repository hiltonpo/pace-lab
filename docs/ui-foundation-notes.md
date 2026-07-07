# UI Foundation Notes (Sprint 1.5)

UI 基礎建設的設計決策與踩過的雷。這份是「設計決策紀錄」性質，不是 step-by-step tutorial——詳細操作可參考 git history 與專案 code。

## 技術選型

### CSS：Tailwind CSS v4

- **為何 v4 不選 v3**：shadcn 新版預設假設 Tailwind v4。選 v3 之後每次 `pnpm dlx shadcn add ...` 都要手動改寫成 v3 語法，長期維護成本高。
- **v4 vs v3 的關鍵差異**：
  - 設定從 `tailwind.config.js` 搬到 CSS 裡的 `@theme inline { ... }`
  - 色彩 token 用 `oklch()` 不再用 HSL
  - `darkMode: ["class"]` 變成 CSS 裡的 `@custom-variant dark (&:is(.dark *))`
  - `@import "tailwindcss"` 一行取代 `@tailwind base/components/utilities`

### Component Library：shadcn/ui + Radix

- **為何 shadcn 不選 Vuetify 風格的 library**：shadcn 的 component code 直接複製進專案、屬於自己的 repo，可任意改寫。不會被套件升級綁住。
- **為何 Radix 不選 Base UI**：Radix 生態成熟、社群討論多、文件齊全。Base UI 是 2024 才 stable 的新選項，資料少很多。
- **Preset 選 Vega**：經典 clean neutral 風格，圓角適中、留白合理，符合「日系規整」方向。Maia 太大圓角、Lyra 太銳利、Mira / Nova 太緊湊都不適合。

### 字型：Inter + Noto Sans JP

- 英數用 Inter，中日文用 Noto Sans JP
- 在 `index.html` 用 Google Fonts CDN 載入，含 preconnect 優化
- 啟用 `font-feature-settings: "palt"` 給日文比例間距，視覺更整齊

### i18n：react-i18next

- **三語**：日 (主)、繁中、英
- **架構在 Sprint 1.5 完成**：之後每個 sprint 加新頁面都直接用 `t()`，不寫死文字
- **使用者偏好存 localStorage**，下次造訪自動套用

### Dark Mode：自實作 hook

- 沒用 next-themes 等套件，30 行 `useTheme` 自己寫
- 偏好存 localStorage
- 預設跟隨 `prefers-color-scheme`

## 配色設計（日系規整方向）

亮色：

```
背景純白、邊框淡灰 (#E5E5E5 級)、深灰字 (#1F1F1F 級)
主色深靛藍 oklch(0.38 0.05 250)
圓角 0.375rem（中等）
```

暗色：

```
背景深黑 (oklch 0.13)、卡片稍亮 (0.18)
主色淺一階靛藍 (0.72 0.04 250)
```

設計原則：低彩度、留白寬鬆、圓角不誇大、無重陰影。

## 踩過的雷與解法

### 1. Vite 環境變數 TypeScript 報錯

`import.meta.env.VITE_API_BASE_URL` 在 `tsc` 編譯時報「Property 'env' does not exist on type 'ImportMeta'」。

解法：建 `src/vite-env.d.ts`，用 TypeScript 同名 interface 自動合併擴充：

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

關鍵：interface 名稱 `ImportMeta`、`ImportMetaEnv` 必須一字不差（用合併機制擴充 Vite 內建型別）。

### 2. shadcn init 寫進 v4 語法導致樣式全壞

原因：當時專案用 Tailwind v3，shadcn init 預設寫 v4 語法的 `index.css`（含 `@import "tailwindcss"`、`oklch()` 色彩），跟 v3 的 `hsl(var(--...))` 完全不相容，所有顏色變數無效。

解法：升 Tailwind v3 到 v4，順著 shadcn 預設走。

### 3. `@/` import alias 在 shadcn init 之前沒設好

shadcn init 會「先檢查環境再執行」——`tsconfig.json` 沒設 `paths` 它直接停。

解法：先在 `tsconfig.json` 加 `baseUrl + paths`、`vite.config.ts` 加 `resolve.alias`，再跑 shadcn init。

### 4. v4 沒有預設 `container` class

從 v3 的 `<div className="container ...">` 改用：

```
<div className="mx-auto max-w-7xl px-4">
```

更直觀，不依賴 v4 設定。

### 5. i18n 第一次打開 Select 顯示空白

原因：i18next 的 LanguageDetector 從 `navigator.language` 拿到的是「地區代碼」格式（例如 `"zh-TW"`），但 SelectItem 的 value 是兩字短碼 `"zh"`，value 對不上 Select 顯示空白。

兩層解法（建議都做）：

**i18n 設定**（根源處理）：

```ts
i18n.init({
  supportedLngs: ["ja", "zh", "en"],
  nonExplicitSupportedLngs: true, // 自動把 zh-TW 截成 zh
  // ...
});
```

**useLocale hook**（防禦性 fallback）：

```ts
function normalizeLocale(raw) {
  const short = (raw ?? "").slice(0, 2).toLowerCase();
  return SUPPORTED.includes(short) ? short : "ja";
}
```

## React 觀念筆記

### Vue → React 對照（這次 Sprint 用到的）

| Vue                               | React                                              |
| --------------------------------- | -------------------------------------------------- |
| `defineStore('user', ...)` 的字串 | `useQuery({ queryKey: ["me"] })` 的陣列            |
| `v-model` 雙向綁定                | `value` + `onChange` 拆兩個 props                  |
| `:items="[]"` 一個屬性給選項      | 用 `.map()` 產出多個子元件                         |
| Vuetify 一個 `<v-select>` 搞定    | shadcn 拆四層（Select / Trigger / Content / Item） |

### TypeScript 細節

- `as Locale` 是「型別斷言」——只給 TS 編譯器看，runtime 不存在
- `.d.ts` 裡不 `export` 的 interface 自動全域
- 同名 interface 會自動合併（這就是擴充 `ImportMeta` 的原理）

### 受控元件（Controlled Component）

- shadcn Select 的 `value` 必須綁到真實 state，不能寫死值
- 寫死 → 使用者選了之後 UI 不會更新（state 變了 value 沒變）
- React 沒 `v-model`，必須明示「讀」（value）跟「寫」（onChange）兩件事

## Sprint 1.5 對後續 sprint 的影響

之後寫 UI 時可以假設：

- Tailwind v4 + shadcn 隨時可用
- `useTheme`、`useLocale` 可從 hooks 引入
- 所有顯示文字都該透過 `t("...")` 走 i18n
- 新增頁面文字記得同時更新三份 locale JSON
- 配色用 CSS 變數（`bg-background`、`text-foreground` 等）不寫死顏色
- 跨網域 cookie / API base URL 已在 Sprint 1 部署時處理好

---

## Sprint 2 補充

### React Router v7

路由用 JSX 巢狀宣告，不用外部 config：

```
<BrowserRouter>
  <Routes>
    <Route element={<Layout />}> {/* 共用 layout */}
      <Route path="/" element={<HomePage />} />
      <Route path="/plans/new" element={<CreatePlanPage />} />
      <Route path="/plans/:id" element={<PlanDetailPage />} />
    </Route>
  </Routes>
</BrowserRouter>
```

關鍵觀念：

- `<Outlet />` 是 Layout 內部「子路由元件渲染位置」的 placeholder
- 動態參數：`path="/plans/:id"` + `useParams<{ id: string }>()`
- 內部跳轉用 `<Link>`，不會 reload 整頁
- 程式式跳轉用 `useNavigate()`

外部連結（OAuth redirect）仍用 `<a href>`、內部跳轉用 `<Link>`。

### React Hook Form + Zod

表單管理用 React Hook Form，驗證來源是 `packages/shared` 的 Zod schema：

```tsx
const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
  resolver: zodResolver(createPlanInputSchema),
  defaultValues: { name: "", /* ... */ },
});

// 原生 input
<input {...register("name")} />

// shadcn Select（不是原生 input）
<Select
value={watch("goalRaceType")}
onValueChange={(v) => setValue("goalRaceType", v, { shouldValidate: true })}
/>
```

為什麼 Select 要用 `setValue` 而非 `register`：shadcn 的 Select 是 Radix popover、不是原生 `<input>`。`register` 內部會把 ref / onChange 注入到 DOM element，Select 收不到。

### shadcn + React 18 的 forwardRef 雷

**重要相容性問題**：shadcn 新版本假設 React 19（function component 可直接接收 ref 當 prop）。在 React 18 環境下，這會破壞 React Hook Form——ref 沒接到底層 `<input>`、RHF 拿不到 DOM 值。

症狀：

- `watch("name")` 永遠回傳 `undefined`
- Zod 驗證永遠失敗（即使欄位有值）
- 表單按送出沒反應

修法：手動把 shadcn 元件包回 `React.forwardRef`：

```tsx
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input ref={ref} type={type} {...props} className={cn(...)} />
  )
);
Input.displayName = "Input";
```

任何要跟 RHF 的 `register` 整合的 shadcn 元件都要做同樣處理：Input、Textarea、Checkbox、Radio、Switch 等。

### TanStack Query 模式

**useQuery 讀取**：

```typescript
export function usePlans() {
  return useQuery({ queryKey: ["plans"], queryFn: listPlans });
}

export function usePlanDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["plans", id],
    queryFn: () => getPlanDetail(id!),
    enabled: !!id, // id 不存在時不執行
  });
}
```

**useMutation 寫入**：

```typescript
const mutation = useMutation({
  mutationFn: createPlan,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["plans"] });
    navigate("/");
  },
});
```

**階層式 query key 配合 invalidate**：

- `["plans"]` 對應列表 cache
- `["plans", id]` 對應特定詳情 cache
- `invalidateQueries({ queryKey: ["plans"] })` 同時讓「列表」跟「所有詳情」失效

這個 prefix matching 是 TanStack Query cache 控制的核心。

### Responsive Design

Mobile-first 寫法：

```tsx

<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
```

讀法：「**預設手機 2 欄、≥640px 變 4 欄、≥1024px 變 7 欄**」。

Tailwind 斷點：

| 前綴  | 寬度    | 對應裝置             |
| ----- | ------- | -------------------- |
| (無)  | 0+      | 手機（mobile-first） |
| `sm:` | ≥640px  | 大手機 / 小平板      |
| `md:` | ≥768px  | 平板                 |
| `lg:` | ≥1024px | 桌機                 |
| `xl:` | ≥1280px | 大桌機               |

**Card 寬度配置慣例**：

- 列表頁：`max-w-5xl` (1024px)
- 表單頁：`max-w-2xl` (672px)
- 資料密集頁：`max-w-6xl` (1152px)
- 全站外層上限：`max-w-7xl` (1280px) 在 Layout

### i18n 插值

字串含變數時用 `{{var}}` 佔位符，讓每個語言決定詞序：

```json
"week": "第 {{n}} 週" // zh
"week": "Week {{n}}" // ja / en
```

呼叫：

```tsx
{
  t("plans.detail.week", { n: weekNumber });
}
```

什麼時候需要佔位符：

- 字串含數字 / 名字 / 動態值
- 不同語言詞序不同
- 需要單複數變化

固定字串不用：`"easy": "Easy"` 不需要佔位符。

**坑點**：JSON 含 `{{n}}` 但 code 沒傳 `{ n: ... }` 時，i18next 會原樣顯示 `{{n}}`。本地 dev 模式可能有 cache 假象、Vercel build 才會暴露——Sprint 2 收尾時踩過這個雷。

### WorkoutCell 視覺層次

不同類型的訓練要視覺區分：

```
休息： bg-muted/30 (淡灰) ← 最低強調
Easy： bg-background (白)
Long： bg-accent (米色)
Quality： bg-destructive/5 (淡紅) ← 高強度
Race： bg-primary/20 + border-2 + 🏁 ← 最高強調
```

Race day 用了三層視覺強化：

1. 背景顏色（深）
2. 邊框（粗 + 有色）
3. 符號（emoji）

使用者一眼就能看到「**這天最特殊**」。

### 頁面元件組織

```
src/
├── pages/                  # 對應路由的頁面元件
│   ├── HomePage.tsx
│   ├── CreatePlanPage.tsx
│   └── PlanDetailPage.tsx
├── components/             # 可重用 UI
│   ├── ui/                 # shadcn 元件（不放業務邏輯）
│   └── Layout.tsx          # 跨頁面包裝器
├── hooks/                  # 自訂 hooks
└── lib/                    # API clients、工具
```

慣例：

- `pages/`：一個 route 一個元件
- `components/`：跨頁面可重用、不綁路由
- `components/ui/`：純 UI 原件（shadcn）

### 表單資料 raw vs normalized

使用者輸入需要轉換為機器可用格式時：

```tsx
const [goalTimeStr, setGoalTimeStr] = useState("3:59:00");
// RHF state 存 goalTimeSec: 14340

const handleGoalTimeChange = (value: string) => {
  setGoalTimeStr(value); // raw 顯示
  const sec = parseDuration(value);
  setValue("goalTimeSec", sec); // normalized 給 API
};
```

UI 層用 raw（人類好讀）、Form state 用 normalized（程式好處理）。

同樣 pattern 適用於：日期、貨幣、距離——任何「**人類好讀 vs 程式好處理**」的場景。

### 即時計算預覽（純函式跑前端）

`packages/shared` 的純函式可以即時跑在 UI：

```tsx
const watchedGoalTimeSec = watch("goalTimeSec");
const preview = (() => {
  try {
    return calculateTrainingPaces(watchedGoalRaceType, watchedGoalTimeSec);
  } catch {
    return null;
  }
})();
```

使用者打字時，VDOT 跟 5 種配速立刻更新——零延遲、不打 API、無 loading 狀態。

這是把 domain logic 放在共用純函式包的最大價值之一。

### 確認 UX（inline、不用 modal）

不可逆操作（刪除）用 inline state-toggle，不用 Dialog 元件：

```tsx
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

{
  !showDeleteConfirm ? (
    <Button onClick={() => setShowDeleteConfirm(true)}>刪除</Button>
  ) : (
    <>
      <p>確定刪除？</p>
      <Button onClick={handleDelete}>是，刪除</Button>
      <Button onClick={() => setShowDeleteConfirm(false)}>取消</Button>
    </>
  );
}
```

優點：不用多裝套件、不用解 forwardRef、視覺跟頁面一致。
缺點：不會 dim 背景。對個人專案夠用。

未來 production-grade 升級成 AlertDialog（注意 React 18 forwardRef 相容性）。

### 把扁平資料分組顯示

常見 pattern：API 回扁平陣列、UI 要顯示分組：

```typescript
const workoutsByWeek = new Map<number, PlannedWorkout[]>();
plan.plannedWorkouts.forEach((w) => {
  if (!workoutsByWeek.has(w.weekNumber)) {
    workoutsByWeek.set(w.weekNumber, []);
  }
  workoutsByWeek.get(w.weekNumber)!.push(w);
});
```

渲染時：

```tsx
{
  Array.from(workoutsByWeek.entries())
    .sort(([a], [b]) => a - b)
    .map(([weekNumber, weekWorkouts]) => (
      <WeekCard
        key={weekNumber}
        weekNumber={weekNumber}
        workouts={weekWorkouts}
      />
    ));
}
```

為什麼用 Map 不用 Record：

- 保持插入順序
- iteration 語法清晰（解構 entries）
- `Object.keys()` 回 string，`Map.keys()` 保留原 number type

### Immutable update

不能 mutate React state。要排序 / 反轉時：

```
// ❌ 直接 mutate 原陣列
plan.plannedWorkouts.sort(...);

// ✅ 建新陣列
[...plan.plannedWorkouts].sort(...);
```

適用於所有可能 mutate 的操作：

- `arr.sort()` → `[...arr].sort()`
- `arr.reverse()` → `[...arr].reverse()`
- `obj.field = x` → `{ ...obj, field: x }`

### Debug：表單莫名失敗的處理

表單按送出沒反應、又沒錯誤訊息時：

1. 加 `console.log(watch("fieldName"))` 確認 RHF 有抓到欄位
2. 在 `onSubmit` 內加 `console.log("submit:", data)` 看驗證有沒有過
3. `handleSubmit` 第二參數加錯誤 callback：`handleSubmit(onSubmit, (errors) => console.log(errors))`

`watch` 印 `undefined` 但欄位顯然有值 → register 沒接到 DOM（多半是 shadcn forwardRef 雷）。

### 踩到的雷與經驗

Sprint 2 過程中遇到的「**生產環境才暴露**」的問題：

1. **shared 改完沒 rebuild** → API 載入舊版 dist
2. **`{{n}}` JSON 跟 code 配對錯** → 本地 cache 有假象、Vercel 才照妖
3. **pnpm peer dependency 沒 hoist**（`tslib`）→ 加 `.npmrc` 的 `shamefully-hoist=true`
4. **React 18 + shadcn forwardRef** → 手動加回 forwardRef 包

這些都是 monorepo + 跨服務部署的「**真實雷**」——記下來避免 Sprint 3+ 再踩。

---

## Sprint 3 補充

### Recharts（圖表庫）

- 用「元件組合」描述圖表（`<LineChart>` 包 `<XAxis>` `<Line>` `<Tooltip>`），不像 Chart.js 給一個大設定物件——符合 React 用元件組 UI 的思路
- 資料是「物件陣列」，`dataKey` 把「資料欄位」對應到「圖表元件」

```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={weeklyData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="week" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="distance" stroke="#2563eb" dot={{ r: 4 }} />
  </LineChart>
</ResponsiveContainer>
```

關鍵點：

- `ResponsiveContainer` 包起來才能 RWD（要固定 `height`、`width="100%"`，且父容器要有明確寬度）
- 配速圖 Y 軸要 `reversed`——配速數字越小越快，反轉後「線往上 = 進步」符合直覺
- `tickFormatter` 格式化軸刻度（秒數 → `5:30`）
- 自訂 tooltip 用 `content={<X />}`，`payload[0].payload` 才是「原始那筆資料物件」（外層 payload 是 Recharts 包的陣列）
- 顏色：`--primary` 是 oklch 格式，**不能**寫 `hsl(var(--primary))`（會變無效顏色、線透明）。用 `var(--primary)` 或固定色
- 單筆資料只有一個點、沒有線 → 加 `dot={{ r: 4 }}` 才看得到點

### 使用者輸入的坑

- **`Number("") === 0`（不是 NaN）**——`parseDuration` 驗證時空字串會躲過 `parts.some(isNaN)`（`Number("")` 是 0）。要用正則 `/^\d+$/` 檢查每一段，才擋得掉 `"60:"` 這種空段
- **`valueAsNumber` 清空變 NaN**（過不了 `z.number()`）。選填數字欄位改用 `setValueAs: (v) => v === "" ? null : Number(v)`——空 → null（符合「選填」語意），有值 → 數字
- 配速預覽用 `Number.isFinite()` 防禦（擋 NaN / Infinity）

### Zod `.partial()` + `.refine()` 順序

`z.object().refine()` 回傳 `ZodEffects`，失去 `.partial()`。解法：先定義純 object schema，`createInputSchema` = object + refine，`updateInputSchema` = object.partial() + refine（先 partial 再 refine）。

### 元件重用（新增 / 編輯共用）

`CreateWorkoutPage` 用 `useParams` 判斷模式（有 `:id` = 編輯）。編輯模式用 `useEffect` + `reset()` 把既有資料填回表單（時間欄位額外用 `formatDuration` 把秒數轉回字串顯示）。少寫一個 EditPage、邏輯集中。

```tsx
const { id: editId } = useParams();
const isEditMode = !!editId;
const { data: existing } = useWorkout(editId);

useEffect(() => {
  if (existing) reset({ /* existing 的欄位 */ });
}, [existing, reset]);

const mutation = isEditMode ? updateMutation : createMutation;
```

### queryKey 帶參數 = 分開 cache

```typescript
useQuery({ queryKey: ["workouts", params ?? {}], queryFn: () => listWorkouts(params) });
```

不同篩選參數 = 不同 cache（`["workouts", {}]` vs `["workouts", { planId }]`）。`invalidateQueries({ queryKey: ["workouts"] })` 用 prefix 一次清光所有。

### 呈現方式的選擇

- 單一比例（完成率）用**進度條**，不用圖表——不是所有數據都要圖表，挑對呈現方式
- interval 顯示「8 × 1km・3min 慢跑」**取代**推算的總公里數（8km）——顯示對執行有意義的資訊，而非推算加總
- 「已完成」用綠色語意系統貫穿（打勾、標籤、數字、背景框都綠），跟「目標」的中性灰對比

### toggle 按鈕選擇

RPE / 天氣 / 體感用「點選 / 再點取消」的 toggle 按鈕，比 dropdown 快（一鍵選定）：

```tsx
onClick={() => setValue("rpe", watchedRpe === n ? null : n)}
```

RPE 加顏色漸層（綠→黃→橘→紅）讓強度高低一眼可辨。

### React 順序鐵則

- 所有 hooks（`useState` / `useQuery` / `useMutation`...）**必須**在提前 return 之前呼叫（每次 render 順序要一致，否則 React 報錯）
- 純函式定義在**元件外**（避免每次 render 重建）
- 一般計算放提前 return **之後**（此時型別已收窄，例如 `plan` 確定非 undefined，可安全用）

### dark mode 對比

深色背景上，淡色疊加（`bg-primary/5`）幾乎看不見——暗色要更高不透明度（`dark:bg-primary/20`）。用 `dark:` 前綴針對暗色給不同值，改完亮色暗色都要測。

### 資料庫：schema 改動不回填舊資料

migration 加欄位只改「表結構」，**不回填舊 row**——舊資料的新欄位是 null。開發階段測新欄位要「建新資料」，不是看舊資料。真實環境要回填得寫 data migration 腳本。

---

## Sprint 4 補充

### 條件式表單（依 workoutType 顯示不同欄位）

同一個表單，根據當前類型顯示不同欄位。用 `watch("workoutType")` 判斷（涵蓋「計畫帶來的類型」與「使用者自己選的」兩種情境）：

```tsx
const isInterval = watch("workoutType") === "interval";

{isInterval && (
  <Card>{/* interval 專用：主段平均配速輸入 */}</Card>
)}
```

interval 顯示主段配速欄位、其他類型不顯示——表單分歧的核心是「條件渲染」。

### 配速輸入的進出對稱

輸入用 `parseDuration`（"4:32" → 272 秒）、填回（編輯模式）就該用 `formatDuration`（272 → "4:32"）。**不要用 `formatPace` 填回**——它帶單位（"4:32/km"），填進輸入框會多單位、再送出時解析失敗。進（parse）出（format）要對稱、格式一致。

### 相似 handler 該不該合併

`handleDurationChange` 與 `handleMainPaceChange` 結構幾乎一樣，但**不建議合併成通用 handler**——合併要傳 4~6 個參數（state setter、欄位名、空值、錯誤 setter…），呼叫端變得又臭又長，反而更難讀。

判斷準則：抽出「純邏輯」（如解析 mm:ss）可共用；深綁元件 state 的部分（哪個欄位、哪個 setter）保留各自處理。DRY 的目的是好維護，合併後更難懂就別合併。「相似」不等於「該共用」——要看是否同一概念。

### 配色語意要單一

Sprint 3 用綠色代表「完成」（打勾、實際框）。Sprint 4 若 PaceDiff 的「快」也用綠，同一區塊兩種綠、語意衝突（完成？表現好？）。解法：完成保留綠（已是全 app 語意，動它連鎖影響），PaceDiff 改配色——「慢」用橘（警示沒達標）、「快/達標」用中性色（達標是基本、不需慶祝）。一種顏色一種意義。

### 依產品性質決定功能範圍

PaceDiff（配速差異）只用在 quality workout（tempo/marathon/interval），不用在 easy/long。因為在 Jack Daniels 訓練法裡，quality 的配速是「必須命中的目標」（達標與否重要），而 easy/long 的配速是「上限」（跑更慢是對的）——對 easy 顯示「慢了 30 秒」會誤導。功能範圍要貼合產品的訓練方法論，不是「有資料就都顯示」。

### 元件外的 i18n

定義在元件外的「元件」（大寫、回 JSX，如 `PaceDiff` / `PaceTooltip`）可以自己呼叫 `useTranslation()`（React 把它當元件、允許用 hook）。純函式（回值、非 JSX）則不能用 hook——需要翻譯時把 `t` 當參數傳入、或回傳 i18n key 讓元件內再翻譯。判斷：是不是 React 元件？是 → 自己用 hook；不是 → 傳參數或回 key。

---

## Sprint 5 補充

### TanStack Query（真正理解）

第一次深入理解 TanStack Query 的三個核心：

- **useQuery（讀）**：給 `queryKey` + `queryFn`，自動回傳 `data` / `isLoading` / `error`，不用自己 useState 管
- **useMutation（寫）**：給 `mutationFn`，用 `.mutate(data)` 觸發，有 `isPending` / `isError`
- **invalidateQueries（寫完）**：`onSuccess` 裡讓相關 queryKey 失效 → 自動重抓 → 畫面更新，不用手動 setState

```typescript
const useCreatePR = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPR,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prs"] }),
  });
};
```

`queryKey` 是快取的身分證：讀用它快取、寫完用它 invalidate，兩邊同一個 key 串起來。對比 Vue Pinia 的手動狀態管理，TanStack 專為「伺服器資料」優化（快取、自動重抓、去重）。

### 折線圖的邊緣情況

進步曲線（同距離多筆、按日期排）要處理同日期兩筆——同 X 軸位置兩個點會讓線打結。解法：`historyByDistance` 內同日期只留最快（Map 以 yyyy-mm-dd 為 key 取 timeSec 最小）。呈現層先清理資料再畫圖，避免圖形怪異。

### 依產品性質選功能（歷史曲線 vs 強弱分析）

PR 原本想做兩種分析，二擇一時依產品性質選「歷史曲線」而非「強弱分析」：

- 產品核心是「訓練追蹤、看進步」→ 曲線直接回答「我變快了嗎」
- 目標客群主攻單一距離（會累積同距離多筆）→ 曲線有資料；強弱分析需多距離、常缺資料
- 歷史曲線只比同距離時間、不碰 VDOT → 避開 VDOT 對長距離失真的問題
- 複用 Sprint 3 的 Recharts → 技術成本低

功能取捨要看產品定位與客群行為，不是「哪個聽起來厲害」。

### 日期必填：defaultValue 不能給值

要讓日期「必填、沒選擋下」，defaultValue 必須是空字串——若預設今天，等於「沒選也有值」，驗證擋不下。必填的本質是「沒填要能擋」，預設值會破壞這點。date input 綁 `value={iso.slice(0,10)}`（ISO → yyyy-mm-dd），空值時給 `""` 避免 `new Date("")` 拋錯。

### 錯誤訊息 i18n：t() 吃 optional 的處理

`errors.X.message` 型別是 `string | undefined`，但 `t()` 只吃 string。用 `t(errors.X.message ?? "")` 補 fallback——不用 `!` 斷言（有風險），`?? ""` 較安全（undefined 時傳空字串）。

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

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
  nonExplicitSupportedLngs: true,  // 自動把 zh-TW 截成 zh
  // ...
})
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

| Vue | React |
|---|---|
| `defineStore('user', ...)` 的字串 | `useQuery({ queryKey: ["me"] })` 的陣列 |
| `v-model` 雙向綁定 | `value` + `onChange` 拆兩個 props |
| `:items="[]"` 一個屬性給選項 | 用 `.map()` 產出多個子元件 |
| Vuetify 一個 `<v-select>` 搞定 | shadcn 拆四層（Select / Trigger / Content / Item） |

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

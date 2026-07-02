import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";
import { useWorkouts } from "../hooks/useWorkouts";
import { formatPace } from "@pace-lab/shared";
import type { ActualWorkoutResponse } from "@pace-lab/shared";

// ============================================================================
// 資料轉換純函式（元件外，不依賴 React state）
// ============================================================================

/** 取得某日期所在週的週一，格式化成 "M/D" */
const getWeekStart = (dateStr: string): string => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // 週日是 0，特判成距週一 6 天
  d.setDate(d.getDate() - diff);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

/** 每筆訓練 → 每週累積里程（按週分組加總） */
const buildWeeklyDistance = (workouts: ActualWorkoutResponse[]) => {
  const weekMap = new Map<string, number>();
  workouts.forEach((w) => {
    const weekKey = getWeekStart(w.date);
    const current = weekMap.get(weekKey) ?? 0;
    weekMap.set(weekKey, current + w.actualDistanceKm);
  });
  return Array.from(weekMap.entries())
    .map(([week, distance]) => ({
      week,
      distance: Math.round(distance * 10) / 10,
    }))
    .sort((a, b) => {
      const [am, ad] = a.week.split("/").map(Number);
      const [bm, bd] = b.week.split("/").map(Number);
      return am - bm || ad - bd; // 字串排序會錯，拆數字比
    });
};

/** 日期字串 → "M/D" */
const formatDateShort = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

/** 每筆訓練 → 每次配速（不分組，過濾掉無配速的） */
const buildPaceData = (workouts: ActualWorkoutResponse[]) =>
  workouts
    .filter((w) => w.actualPaceSec !== null && w.actualPaceSec > 0)
    .map((w) => ({
      date: formatDateShort(w.date),
      paceSec: w.actualPaceSec!, // 圖表定位用
      paceLabel: formatPace(w.actualPaceSec!), // tooltip 顯示用
    }))
    .sort((a, b) => {
      const [am, ad] = a.date.split("/").map(Number);
      const [bm, bd] = b.date.split("/").map(Number);
      return am - bm || ad - bd;
    });

/** 配速圖自訂 tooltip（顯示 "5:30" 而非秒數） */
const PaceTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { date: string; paceLabel: string } }>;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
      <p className="font-medium">{data.date}</p>
      <p className="text-muted-foreground">{data.paceLabel}/km</p>
    </div>
  );
};

export function ProgressPage() {
  const { t } = useTranslation();
  // 抓所有訓練紀錄（不帶 planId = 全部）
  const { data: workouts, isLoading } = useWorkouts();

  if (isLoading) {
    return <div className="max-w-4xl mx-auto">{t("common.loading")}</div>;
  }

  const weeklyData = buildWeeklyDistance(workouts ?? []);
  const paceData = buildPaceData(workouts ?? []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("progress.title")}
      </h1>
      {/* 訓練跑量 */}
      <div className="rounded-lg border p-4">
        <h2 className="text-base font-medium mb-4">
          {t("progress.weeklyVolume")}
        </h2>

        {weeklyData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            {t("progress.noData")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="week" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="distance"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 4 }} // ← 每個點畫半徑 4 的圓
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      {/* 配速趨勢 */}
      <div className="rounded-lg border p-4">
        <h2 className="text-base font-medium mb-1">
          {t("progress.paceTrend")}
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          {t("progress.paceHint")}
        </p>

        {paceData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            {t("progress.noPaceData")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={paceData}
              margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis
                reversed
                className="text-xs"
                tickFormatter={(sec) => formatPace(sec)}
              />
              <Tooltip content={<PaceTooltip />} />
              <Line
                type="monotone"
                dataKey="paceSec"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

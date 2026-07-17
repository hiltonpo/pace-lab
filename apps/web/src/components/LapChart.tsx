import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { formatDuration, type WorkoutLap } from "@pace-lab/shared";

/** 每趟配速的 tooltip */
const LapTooltip = ({ active, payload, baseline }: any) => {
  const { t } = useTranslation();
  if (!active || !payload?.length) return null;
  const lap = payload[0].payload;
  const diff = baseline ? lap.paceSec - baseline : null;

  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm space-y-0.5">
      <p className="font-medium">{t("workout.laps.lapN", { n: lap.label })}</p>
      <p className="tabular-nums">{formatDuration(lap.paceSec)}/km</p>
      {diff !== null && diff !== 0 && (
        <p
          className={`tabular-nums ${
            diff < 0
              ? "text-muted-foreground"
              : "text-orange-600 dark:text-orange-400"
          }`}
        >
          {diff < 0 ? "▼" : "▲"} {Math.abs(diff)}s
        </p>
      )}
      <p className="text-muted-foreground tabular-nums">
        {lap.distanceM}m · {formatDuration(lap.durationSec)}
      </p>
      {lap.avgHeartRate && (
        <p className="text-muted-foreground tabular-nums">
          ♥ {lap.avgHeartRate}
        </p>
      )}
    </div>
  );
};

export const LapChart = ({
  laps,
  targetPaceSec, // ← 新增：計畫的目標配速（可能沒有）
}: {
  laps: WorkoutLap[];
  targetPaceSec?: number | null;
}) => {
  const { t } = useTranslation();

  const mainSetLaps = laps.filter((l) => l.isMainSet && l.paceSec !== null);
  if (mainSetLaps.length < 2) return null;

  const data = mainSetLaps.map((l, i) => ({ ...l, label: `${i + 1}` }));
  const avgPace = Math.round(
    data.reduce((s, l) => s + l.paceSec!, 0) / data.length
  );

  // 有目標就用目標當基準，沒有就用平均
  const baseline = targetPaceSec ?? avgPace;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">{t("workout.laps.title")}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {t("workout.laps.avg")} {formatDuration(avgPace)}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-muted"
            vertical={false}
          />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis
            reversed
            domain={["dataMin - 10", "dataMax + 10"]}
            tickFormatter={(sec) => formatDuration(sec)}
            tick={{ fontSize: 10 }}
            width={45}
          />
          <Tooltip
            content={<LapTooltip baseline={baseline} />}
            cursor={{ fill: "transparent" }}
          />

          {/* 目標配速基準線 */}
          {targetPaceSec && (
            <ReferenceLine
              y={targetPaceSec}
              stroke="var(--primary)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `${t("plans.detail.target")} ${formatDuration(
                  targetPaceSec
                )}`,
                position: "insideTopRight",
                fontSize: 10,
                fill: "var(--primary)",
              }}
            />
          )}

          <Bar dataKey="paceSec" radius={[3, 3, 0, 0]}>
            {data.map((lap, i) => (
              <Cell
                key={i}
                // 達標（比基準快或等於）= 深色，沒達標 = 淡色
                fill={
                  lap.paceSec! <= baseline
                    ? "var(--primary)"
                    : "var(--muted-foreground)"
                }
                fillOpacity={lap.paceSec! <= baseline ? 0.9 : 0.4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground text-center">
        {targetPaceSec
          ? t("workout.laps.hintTarget")
          : t("workout.laps.hintAvg")}
      </p>
    </div>
  );
};

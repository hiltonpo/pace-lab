import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  calculateTrainingPaces,
  formatDuration,
  formatPace,
  PACE_SHORT_LABELS,
  type PlannedWorkoutResponse,
  type ActualWorkoutResponse,
} from "@pace-lab/shared";
import { usePlanDetail, useDeletePlan } from "../hooks/usePlans";
import { IntervalLabel } from "@/components/IntervalLabel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkouts } from "@/hooks/useWorkouts";
import { PlusCircle } from "lucide-react";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** 算某組 planned 的完成數與百分比 */
const calcStats = (
  group: PlannedWorkoutResponse[],
  actualByPlanned: Map<string, unknown>
) => {
  const total = group.length;
  const completed = group.filter((w) => actualByPlanned.has(w.id)).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, percent };
};

/** 算計畫完成率(排除 rest，看有對應 actual 的比例) */
const calcCompletion = (
  plannedWorkouts: PlannedWorkoutResponse[],
  actualByPlanned: Map<string, unknown>
) => {
  // 需要完成的(排除 rest)
  const loggable = plannedWorkouts.filter(
    (w) => w.workoutType !== "rest" && w.workoutType !== "race"
  );
  return calcStats(loggable, actualByPlanned);
};

/** 各類型的完成率(只列計畫裡有的類型) */
const calcCompletionByType = (
  plannedWorkouts: PlannedWorkoutResponse[],
  actualByPlanned: Map<string, unknown>
) =>
  ["easy", "long", "tempo", "interval", "marathon"]
    .map((type) => {
      const ofType = plannedWorkouts.filter((w) => w.workoutType === type);
      return {
        type,
        ...calcStats(ofType, actualByPlanned),
      };
    })
    .filter((x) => x.total > 0); // 計畫裡沒有的類型不顯示

export const PlanDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { data: plan, isLoading, isError } = usePlanDetail(id);
  const deleteMutation = useDeletePlan();
  // ← 新增：抓這個計畫的所有實際紀錄
  const { data: actualWorkouts } = useWorkouts(id ? { planId: id } : undefined);

  if (isLoading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  if (isError || !plan) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-destructive text-sm lg:text-lg">
            {t("plans.planNotFound")}
          </p>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="mt-4"
          >
            ← Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ← 新增：建一個 plannedWorkoutId → actual workout 的對照表
  const actualByPlanned = new Map<string, ActualWorkoutResponse>();
  actualWorkouts?.forEach((aw) => {
    if (aw.plannedWorkoutId) {
      actualByPlanned.set(aw.plannedWorkoutId, aw);
    }
  });

  // ← 新增:算完成率、各類型的完成率
  const completion = calcCompletion(plan.plannedWorkouts, actualByPlanned);
  const completionByType = calcCompletionByType(
    plan.plannedWorkouts,
    actualByPlanned
  );

  // 即時算出 VDOT 跟五種配速（不靠 DB 存的 vdot，可以驗證一致性）
  const paces = calculateTrainingPaces(plan.goalRaceType, plan.goalTimeSec);

  // 把 workouts 按週分組
  const workoutsByWeek = new Map<number, PlannedWorkoutResponse[]>();
  plan.plannedWorkouts.forEach((w) => {
    if (!workoutsByWeek.has(w.weekNumber)) {
      workoutsByWeek.set(w.weekNumber, []);
    }
    workoutsByWeek.get(w.weekNumber)!.push(w);
  });

  const handleDelete = () => {
    deleteMutation.mutate(plan.id, {
      onSuccess: () => navigate("/"),
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{plan.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t(`plans.raceTypes.${plan.goalRaceType}`)} ·{" "}
            {new Date(plan.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/")}>
          ← Back
        </Button>
      </div>
      {/* 完成率 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* 總完成率 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {t("plans.detail.completion")}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {completion.completed} / {completion.total}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${completion.percent}%` }}
              />
            </div>
            <p className="text-right text-lg font-semibold tabular-nums text-primary">
              {completion.percent}%
            </p>
          </div>

          {/* 分類型完成率 */}
          <div className="pt-2 border-t space-y-2">
            {completionByType.map((item) => (
              <div key={item.type} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{t(`plans.workout.${item.type}`)}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {item.completed}/{item.total} ({item.percent}%)
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/70 transition-all"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 計畫概覽 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("plans.detail.summary")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat
            label={t("plans.detail.goalTime")}
            value={formatDuration(plan.goalTimeSec)}
          />
          <Stat label={t("plans.detail.vdot")} value={String(plan.vdot)} />
          <Stat
            label={t("plans.detail.weeks")}
            value={String(plan.weeksTotal)}
          />
          <Stat
            label={t("plans.detail.status")}
            value={t(`plans.detail.statusTypes.${plan.status}`, {
              defaultValue: plan.status,
            })}
          />
        </CardContent>
      </Card>

      {/* 五種配速 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("plans.detail.paces")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
            {(
              [
                "easy",
                "marathon",
                "threshold",
                "interval",
                "repetition",
              ] as const
            ).map((paceType) => {
              return (
                <div key={paceType} className={`space-y-1`}>
                  <p className="text-muted-foreground">
                    {t(`plans.preview.${paceType}`, {
                      n: PACE_SHORT_LABELS[paceType],
                    })}
                  </p>
                  <p className="font-medium tabular-nums text-xl sm:text-2xl">
                    {formatPace(paces.paces[paceType])}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 訓練排程 */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("plans.detail.schedule")}
          <span className="text-sm text-red-700 ml-2">
            ({t("plans.detail.totalWeeks", { n: plan.weeksTotal })})
          </span>
        </h2>
        {Array.from(workoutsByWeek.entries())
          .sort(([a], [b]) => a - b)
          .map(([weekNumber, weekWorkouts]) => (
            <WeekCard
              key={weekNumber}
              weekNumber={weekNumber}
              workouts={weekWorkouts}
              planId={plan.id}
              actualByPlanned={actualByPlanned}
            />
          ))}
      </div>

      {/* 刪除區塊 */}
      <Card className="border-destructive/40">
        <CardContent className="pt-6 space-y-3">
          {!showDeleteConfirm ? (
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-destructive hover:text-destructive"
            >
              {t("plans.delete")}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">{t("plans.deleteConfirm")}</p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  {t("plans.deleteConfirmYes")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteMutation.isPending}
                >
                  {t("plans.deleteCancel")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// 子元件
// ============================================================================

const Stat = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums">{value}</p>
    </div>
  );
};

/** 顯示實際配速 vs 目標的差異（快=綠、慢=橘）*/
const PaceDiff = ({ actual, target }: { actual: number; target: number }) => {
  const { t } = useTranslation();
  const diff = actual - target; // 秒/km，負=比目標快
  if (diff === 0) {
    return (
      <p className="text-[9px] text-muted-foreground">
        {t("plans.detail.onTarget")}
      </p>
    );
  }
  const faster = diff < 0;
  const absDiff = Math.abs(diff);
  const mm = Math.floor(absDiff / 60);
  const ss = absDiff % 60;
  const diffStr = mm > 0 ? `${mm}:${String(ss).padStart(2, "0")}` : `${ss}s`;

  return (
    <p
      className={`text-[9px] ${
        faster
          ? "text-muted-foreground" // 快 → 中性灰
          : "text-orange-600 dark:text-orange-400" // 慢 → 橘
      }`}
    >
      {faster ? "▼" : "▲"} {diffStr}{" "}
      {faster ? t("plans.detail.faster") : t("plans.detail.slower")}
    </p>
  );
};

const WeekCard = ({
  weekNumber,
  workouts,
  planId,
  actualByPlanned,
}: {
  weekNumber: number;
  workouts: PlannedWorkoutResponse[];
  planId: string;
  actualByPlanned: Map<string, ActualWorkoutResponse>;
}) => {
  const { t } = useTranslation();
  const totalKm = workouts.reduce(
    (sum, w) => sum + (w.targetDistanceKm ?? 0),
    0
  );
  const sorted = [...workouts].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {t("plans.detail.week", { n: weekNumber })}
          </CardTitle>
          <span className="text-sm text-muted-foreground tabular-nums">
            {totalKm.toFixed(0)} km
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {sorted.map((w) => (
            <WorkoutCell
              key={w.id}
              workout={w}
              planId={planId}
              actual={actualByPlanned.get(w.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const WorkoutCell = ({
  workout,
  planId,
  actual,
}: {
  workout: PlannedWorkoutResponse;
  planId: string;
  actual?: ActualWorkoutResponse;
}) => {
  const { t } = useTranslation();
  const dayKey = DAY_KEYS[workout.dayOfWeek];

  const typeLabel = t(`plans.workout.${workout.workoutType}`);
  const displayLabel =
    workout.workoutType === "race" ? `🏁 ${typeLabel}` : typeLabel;

  const isHighIntensity = ["tempo", "interval", "marathon"].includes(
    workout.workoutType
  );
  const isLong = workout.workoutType === "long";
  const isRest = workout.workoutType === "rest";
  const isRace = workout.workoutType === "race";

  const isCompleted = !!actual;
  const isLoggable = !isRest;

  return (
    <div
      className={`relative rounded-md border p-2 text-xs space-y-1 ${
        isCompleted
          ? "bg-primary/10 dark:bg-primary/20 border-primary/50 dark:border-primary/70"
          : isRest
          ? "bg-muted/30 dark:bg-muted/20 border-muted dark:border-muted"
          : isRace
          ? "bg-primary/20 dark:bg-primary/30 border-primary border-2"
          : isHighIntensity
          ? "bg-destructive/5 dark:bg-destructive/20 border-destructive/30 dark:border-destructive/50"
          : isLong
          ? "bg-accent dark:bg-accent/40 border-accent-foreground/10 dark:border-accent-foreground/20"
          : "bg-background dark:bg-muted/10 border-input"
      }`}
    >
      {/* 完成打勾 */}
      {isCompleted && (
        <span className="absolute top-1 right-1 text-green-600 dark:text-green-400 text-sm font-bold">
          ✓
        </span>
      )}

      <p className="text-muted-foreground font-medium">
        {t(`plans.days.${dayKey}`)}
      </p>
      <p className="font-medium truncate">{displayLabel}</p>

      {/* 計畫目標 */}
      {/* 計畫目標 */}
      <div>
        {(workout.targetDistanceKm !== null ||
          workout.targetPaceSec !== null) && (
          <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground mb-0.5">
            {t("plans.detail.target")}
          </span>
        )}

        {/* interval：顯示結構取代總公里數 */}
        {workout.intervals ? (
          <p className="text-[10px] text-destructive/80 dark:text-destructive/90 leading-tight">
            <IntervalLabel intervals={workout.intervals} />
          </p>
        ) : (
          /* 非 interval：顯示總公里數 */
          workout.targetDistanceKm !== null && (
            <p className="tabular-nums">{workout.targetDistanceKm}km</p>
          )
        )}

        {/* 配速（interval 跟非 interval 都顯示）*/}
        {workout.targetPaceSec !== null && (
          <p className="tabular-nums text-muted-foreground">
            {formatPace(workout.targetPaceSec)}
          </p>
        )}

        {/* warmup/cooldown */}
        {(workout.warmupKm || workout.cooldownKm) && (
          <p className="text-[9px] text-muted-foreground">
            W{workout.warmupKm ?? 0} / C{workout.cooldownKm ?? 0} km
          </p>
        )}
      </div>

      {/* 已完成：實際數據 → 點擊進詳情 */}
      {isCompleted && actual && (
        <Link
          to={`/workouts/${actual.id}`}
          className="mt-1 block rounded bg-green-50 dark:bg-green-950/40 px-1.5 py-1 space-y-0.5 hover:ring-1 hover:ring-primary/50 transition-all"
        >
          <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
            {t("plans.detail.actual")}
          </span>

          {/* interval：主段配速 */}
          {workout.workoutType === "interval" && actual.mainSetPaceSec ? (
            <p className="tabular-nums text-green-700 dark:text-green-300 font-semibold">
              {t("plans.detail.mainSet")} {formatPace(actual.mainSetPaceSec)}
            </p>
          ) : (
            <>
              <p className="tabular-nums text-green-700 dark:text-green-300 font-semibold">
                {actual.actualDistanceKm}km
              </p>
              {actual.actualPaceSec && (
                <p className="tabular-nums text-green-600/80 dark:text-green-400/80">
                  {formatPace(actual.actualPaceSec)}
                </p>
              )}
            </>
          )}

          {/* quality workout 才顯示配速差異 */}
          {isHighIntensity && workout.targetPaceSec && (
            <PaceDiff
              actual={
                workout.workoutType === "interval"
                  ? actual.mainSetPaceSec ?? actual.actualPaceSec ?? 0
                  : actual.actualPaceSec ?? 0
              }
              target={workout.targetPaceSec}
            />
          )}
        </Link>
      )}

      {/* 未完成 + 可記錄：記錄按鈕 */}
      {!isCompleted && isLoggable && (
        <Link
          to={`/workouts/new?plannedId=${workout.id}&planId=${planId}`}
          className="flex items-center justify-center gap-1 mt-1 rounded border border-primary/40 dark:border-primary/60 text-primary dark:text-primary py-0.5 text-[10px] font-medium hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
        >
          <PlusCircle className="w-3 h-3" />
          {t("plans.detail.logWorkout")}
        </Link>
      )}
    </div>
  );
};

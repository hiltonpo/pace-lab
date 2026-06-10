import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  calculateTrainingPaces,
  formatDuration,
  formatPace,
  type PlannedWorkoutResponse,
} from "@pace-lab/shared";
import { usePlanDetail, useDeletePlan } from "../hooks/usePlans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const PACE_SHORT_LABELS: Record<string, string> = {
  easy: "E",
  marathon: "M",
  threshold: "T",
  interval: "I",
  repetition: "R",
};

export const PlanDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: plan, isLoading, isError } = usePlanDetail(id);
  const deleteMutation = useDeletePlan();

  if (isLoading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  if (isError || !plan) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-destructive">Plan not found</p>
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
          <Stat label={t("plans.detail.status")} value={plan.status} />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums">{value}</p>
    </div>
  );
}

function WeekCard({
  weekNumber,
  workouts,
}: {
  weekNumber: number;
  workouts: PlannedWorkoutResponse[];
}) {
  const { t } = useTranslation();

  const totalKm = workouts.reduce(
    (sum, w) => sum + (w.targetDistanceKm ?? 0),
    0
  );

  // 按 dayOfWeek 排序確保週日→週六順序
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
            <WorkoutCell key={w.id} workout={w} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WorkoutCell({ workout }: { workout: PlannedWorkoutResponse }) {
  const { t } = useTranslation();
  const dayKey = DAY_KEYS[workout.dayOfWeek];

  const typeLabel = t(`plans.workout.${workout.workoutType}`);
  const displayLabel =
    workout.workoutType === "race" ? `🏁 ${typeLabel}` : typeLabel;

  // 顏色強度按 workout type
  const isHighIntensity = ["tempo", "interval", "marathon"].includes(
    workout.workoutType
  );
  const isLong = workout.workoutType === "long";
  const isRest = workout.workoutType === "rest";
  const isRace = workout.workoutType === "race";

  return (
    <div
      className={`rounded-md border p-2 text-xs space-y-1 ${
        isRest
          ? "bg-muted/30 border-muted"
          : isRace
          ? "bg-primary/20 border-primary border-2"
          : isHighIntensity
          ? "bg-destructive/5 border-destructive/30"
          : isLong
          ? "bg-accent border-accent-foreground/10"
          : "bg-background"
      }`}
    >
      <p className="text-muted-foreground font-medium">
        {t(`plans.days.${dayKey}`)}
      </p>
      <p className="font-medium truncate">{displayLabel}</p>
      {workout.targetDistanceKm !== null && (
        <p className="tabular-nums">{workout.targetDistanceKm}km</p>
      )}
      {workout.targetPaceSec !== null && (
        <p className="tabular-nums text-muted-foreground">
          {formatPace(workout.targetPaceSec)}
        </p>
      )}
    </div>
  );
}

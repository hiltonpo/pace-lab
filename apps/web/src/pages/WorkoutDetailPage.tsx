import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDuration, formatPace } from "@pace-lab/shared";
import { useWorkout, useDeleteWorkout } from "@/hooks/useWorkouts";
import { usePlanDetail } from "@/hooks/usePlans";

import { IntervalLabel } from "@/components/IntervalLabel";
import { LapChart } from "@/components/LapChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PencilLineIcon, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const WEATHER_ICONS: Record<string, string> = {
  sunny: "☀️",
  cloudy: "☁️",
  rainy: "🌧️",
  hot: "🥵",
  cold: "🥶",
  windy: "💨",
};

/** 一格數據 */
const Stat = ({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) => (
  <div className="space-y-1">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-semibold tabular-nums">{value}</p>
    {sub && <p className="text-xs text-muted-foreground tabular-nums">{sub}</p>}
  </div>
);

export const WorkoutDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: workout, isLoading, isError } = useWorkout(id);
  const deleteMutation = useDeleteWorkout();
  // 有 planId 才抓計畫（對照目標用）
  const { data: planDetail } = usePlanDetail(workout?.planId ?? undefined);

  if (isLoading)
    return <p className="text-muted-foreground">{t("common.loading")}</p>;

  if (isError || !workout) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-destructive text-sm">{t("workout.notFound")}</p>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="mt-4"
          >
            ← Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 對應的計畫項目（對照目標）
  const planned = planDetail?.plannedWorkouts.find(
    (w) => w.id === workout.plannedWorkoutId
  );

  const isInterval = workout.workoutType === "interval";
  const displayPaceSec =
    isInterval && workout.mainSetPaceSec
      ? workout.mainSetPaceSec
      : workout.actualPaceSec;

  const handleDelete = () => {
    deleteMutation.mutate(workout.id, {
      onSuccess: () =>
        navigate(workout.planId ? `/plans/${workout.planId}` : "/"),
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t(`plans.workout.${workout.workoutType}`)}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(workout.date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          {/* 編輯 */}
          <Button variant="outline" size="sm" asChild>
            <Link to={`/workouts/${workout.id}/edit`}>
              <PencilLineIcon className="w-3.5 h-3.5 mr-1" />
              {t("common.edit")}
            </Link>
          </Button>
          {/* 刪除（Dialog）*/}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                {t("plans.delete")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("workout.deleteConfirm")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("workout.deleteWarning")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("plans.deleteCancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t("plans.deleteConfirmYes")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {/* 返回 */}
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            ← Back
          </Button>
        </div>
      </div>

      {/* 主要數據 */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat
            label={t("workout.form.distance")}
            value={`${workout.actualDistanceKm} km`}
            sub={
              planned?.targetDistanceKm
                ? `${t("plans.detail.target")} ${planned.targetDistanceKm}km`
                : undefined
            }
          />
          <Stat
            label={t("workout.form.duration")}
            value={formatDuration(workout.actualDurationSec)}
          />
          <Stat
            label={
              isInterval ? t("plans.detail.mainSet") : t("workout.form.pace")
            }
            value={displayPaceSec ? `${formatPace(displayPaceSec)}` : "—"}
            sub={
              planned?.targetPaceSec
                ? `${t("plans.detail.target")} ${formatPace(
                    planned.targetPaceSec
                  )}`
                : undefined
            }
          />
          <Stat
            label={t("workout.form.heartRate")}
            value={workout.avgHeartRate ? String(workout.avgHeartRate) : "—"}
            sub={
              workout.maxHeartRate ? `max ${workout.maxHeartRate}` : undefined
            }
          />
        </CardContent>
      </Card>

      {/* 計畫的 interval 結構（如果有）*/}
      {planned?.intervals && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">
              {t("plans.detail.target")}
            </p>
            <p className="text-sm font-medium text-primary">
              🔁 <IntervalLabel intervals={planned.intervals} />
            </p>
          </CardContent>
        </Card>
      )}

      {/* 每趟配速圖 */}
      {workout.laps && workout.laps.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <LapChart
              laps={workout.laps}
              targetPaceSec={planned?.targetPaceSec}
            />
          </CardContent>
        </Card>
      )}

      {/* 訓練細節 */}
      {(workout.rpe ||
        workout.weather ||
        workout.feeling ||
        workout.temperatureC) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("workout.detail.conditions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm">
            {workout.rpe && (
              <div>
                <span className="text-muted-foreground">
                  {t("workout.form.rpe")}{" "}
                </span>
                <span className="font-medium tabular-nums">
                  {workout.rpe}/10
                </span>
              </div>
            )}
            {workout.weather && (
              <div>
                <span>{WEATHER_ICONS[workout.weather]} </span>
                <span>{t(`workout.weather.${workout.weather}`)}</span>
              </div>
            )}
            {workout.temperatureC !== null && (
              <div className="tabular-nums">{workout.temperatureC}°C</div>
            )}
            {workout.feeling && (
              <div>
                <span className="text-muted-foreground">
                  {t("workout.form.feeling")}{" "}
                </span>
                <span>{t(`workout.feeling.${workout.feeling}`)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 備註 */}
      {workout.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("workout.form.notes")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{workout.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

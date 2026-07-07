import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createWorkoutInputSchema,
  parseDuration,
  formatDuration,
  formatPace,
  formatInterval,
  WEATHER_OPTIONS,
  FEELING_OPTIONS,
  type CreateWorkoutInput,
} from "@pace-lab/shared";

import {
  useCreateWorkout,
  useUpdateWorkout,
  useWorkout,
} from "../hooks/useWorkouts";
import { usePlanDetail } from "../hooks/usePlans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateWorkoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: editId } = useParams<{ id: string }>();

  const isEditMode = !!editId; // 有id = 編輯模式

  // 編輯模式：抓既有紀錄
  const { data: existingWorkout } = useWorkout(editId);

  const WEATHER_ICONS: Record<string, string> = {
    sunny: "☀️",
    cloudy: "☁️",
    rainy: "🌧️",
    hot: "🥵",
    cold: "🥶",
    windy: "💨",
  };
  const FEELING_ICONS: Record<string, string> = {
    great: "😄",
    good: "🙂",
    normal: "😐",
    tired: "😓",
    exhausted: "😵",
  };

  const rpeColor = (n: number, selected: boolean) => {
    if (!selected) return "bg-background border-input hover:border-ring";
    if (n <= 3) return "bg-green-500 text-white border-green-500";
    if (n <= 6) return "bg-yellow-500 text-white border-yellow-500";
    if (n <= 8) return "bg-orange-500 text-white border-orange-500";
    return "bg-red-500 text-white border-red-500";
  };

  // 從 URL query 拿 plannedWorkoutId / planId
  const plannedWorkoutId = searchParams.get("plannedId") ?? undefined;
  const planId = searchParams.get("planId") ?? undefined;

  // 如果有 planId，撈計畫詳情來預填目標值
  const { data: planDetail } = usePlanDetail(planId);
  const plannedWorkout = planDetail?.plannedWorkouts.find(
    (w) => w.id === plannedWorkoutId
  );

  // 時間用字串輸入（"25:00"），送出前轉秒數
  const [durationStr, setDurationStr] = useState("");
  const [durationError, setDurationError] = useState<string | null>(null);
  const [mainPaceStr, setMainPaceStr] = useState("");
  const [mainPaceError, setMainPaceError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateWorkoutInput>({
    resolver: zodResolver(createWorkoutInputSchema),
    defaultValues: {
      plannedWorkoutId: plannedWorkoutId ?? null,
      planId: planId ?? null,
      date: new Date().toISOString(),
      workoutType: plannedWorkout?.workoutType ?? "easy",
      actualDistanceKm: plannedWorkout?.targetDistanceKm ?? 0,
      actualDurationSec: 0,
    },
  });

  // 編輯模式： 資料抓到後，填回表單
  useEffect(() => {
    if (existingWorkout) {
      reset({
        plannedWorkoutId: existingWorkout.plannedWorkoutId,
        planId: existingWorkout.planId,
        date: existingWorkout.date,
        workoutType: existingWorkout.workoutType,
        actualDistanceKm: existingWorkout.actualDistanceKm,
        actualDurationSec: existingWorkout.actualDurationSec,
        mainSetPaceSec: existingWorkout.mainSetPaceSec,
        avgHeartRate: existingWorkout.avgHeartRate,
        maxHeartRate: existingWorkout.maxHeartRate,
        rpe: existingWorkout.rpe,
        weather: existingWorkout.weather as any,
        temperatureC: existingWorkout.temperatureC,
        feeling: existingWorkout.feeling as any,
        notes: existingWorkout.notes,
      });
      // 時間字串也要填回
      setDurationStr(formatDuration(existingWorkout.actualDurationSec));
      // interval 主段配速填回
      if (existingWorkout.mainSetPaceSec) {
        setMainPaceStr(formatDuration(existingWorkout.mainSetPaceSec));
      }
    }
  }, [existingWorkout, reset]);

  const watchedDistance = watch("actualDistanceKm");
  const watchedDuration = watch("actualDurationSec");
  const watchedWeather = watch("weather");
  const watchedFeeling = watch("feeling");
  const watchedRpe = watch("rpe");
  const watchedType = watch("workoutType");
  const isInterval = watchedType === "interval";

  // 即時配速預覽
  const pacePreview =
    watchedDistance > 0 && watchedDuration > 0
      ? formatPace(Math.round(watchedDuration / watchedDistance))
      : null;

  // 時間輸入處理
  const handleDurationChange = (value: string) => {
    setDurationStr(value);

    // 空字串：清掉秒數、不顯示錯誤
    if (value.trim() === "") {
      setValue("actualDurationSec", 0, { shouldValidate: true });
      setDurationError(null);
      return;
    }

    try {
      const sec = parseDuration(value);
      setValue("actualDurationSec", sec, { shouldValidate: true });
      setDurationError(null);
    } catch {
      setValue("actualDurationSec", 0, { shouldValidate: true });
      setDurationError(t("workout.form.durationError"));
    }
  };

  // 配速輸入處理
  const handleMainPaceChange = (value: string) => {
    setMainPaceStr(value);

    if (value.trim() === "") {
      setValue("mainSetPaceSec", null, { shouldValidate: true });
      setMainPaceError(null);
      return;
    }

    try {
      const sec = parseDuration(value); // "4:32" → 272 秒/km
      setValue("mainSetPaceSec", sec, { shouldValidate: true });
      setMainPaceError(null);
    } catch {
      setMainPaceError(t("workout.form.paceError"));
    }
  };

  const createMutation = useCreateWorkout();
  const updateMutation = useUpdateWorkout();
  const mutation = isEditMode ? updateMutation : createMutation;

  const onSubmit = (data: CreateWorkoutInput) => {
    if (isEditMode && editId) {
      updateMutation.mutate(
        { id: editId, input: data },
        {
          onSuccess: () => {
            navigate(data.planId ? `/plans/${data.planId}` : "/");
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          navigate(planId ? `/plans/${planId}` : "/");
        },
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("workout.title")}
        </h1>
        {plannedWorkout && (
          <div className="text-sm text-muted-foreground mt-1 space-y-1">
            <p>
              {t(`plans.workout.${plannedWorkout.workoutType}`)}
              {plannedWorkout.targetDistanceKm
                ? ` · ${t("workout.target")} ${
                    plannedWorkout.targetDistanceKm
                  }km`
                : ""}
              {plannedWorkout.targetPaceSec
                ? ` · ${formatPace(plannedWorkout.targetPaceSec)}`
                : ""}
            </p>
            {/* interval 結構 */}
            {plannedWorkout.intervals && (
              <p className="text-primary font-medium">
                🔁 {formatInterval(plannedWorkout.intervals)}
              </p>
            )}
            {/* warmup/cooldown 提示 */}
            {(plannedWorkout.warmupKm || plannedWorkout.cooldownKm) && (
              <p className="text-xs">
                {t("plans.workout.warmup")} {plannedWorkout.warmupKm}km ·{" "}
                {t("plans.workout.cooldown")} {plannedWorkout.cooldownKm}km
              </p>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 基本資料 */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* 距離 */}
            <div className="space-y-2">
              <Label htmlFor="distance">{t("workout.form.distance")}</Label>
              <Input
                id="distance"
                type="number"
                step="0.1"
                {...register("actualDistanceKm", { valueAsNumber: true })}
              />
              {errors.actualDistanceKm && (
                <p className="text-sm text-destructive">
                  {t(errors.actualDistanceKm.message ?? "")}
                </p>
              )}
            </div>

            {/* 時間 */}
            <div className="space-y-2">
              <Label htmlFor="duration">{t("workout.form.duration")}</Label>
              <Input
                id="duration"
                value={durationStr}
                onChange={(e) => handleDurationChange(e.target.value)}
                placeholder="25:00"
              />
              <p className="text-xs text-muted-foreground">
                {t("workout.form.durationHint")}
              </p>
              {/* 格式錯誤 */}
              {durationError && (
                <p className="text-sm text-destructive">{durationError}</p>
              )}
              {/* 數值錯誤（Zod），但格式沒錯時才顯示，避免兩個一起跳 */}
              {!durationError && errors.actualDurationSec && (
                <p className="text-sm text-destructive">
                  {t(errors.actualDurationSec.message ?? "")}
                </p>
              )}
            </div>

            {/* 配速預覽 */}
            {pacePreview && (
              <div className="flex items-baseline gap-2 text-sm">
                <span className="text-muted-foreground">
                  {t("workout.form.pace")}
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {pacePreview}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* interval 主段配速（只有 interval 顯示）*/}
        {isInterval && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                🔁 {t("workout.form.mainSetPace")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="mainPace">
                {t("workout.form.mainSetPaceLabel")}
              </Label>
              <Input
                id="mainPace"
                value={mainPaceStr}
                onChange={(e) => handleMainPaceChange(e.target.value)}
                placeholder="4:32"
              />
              <p className="text-xs text-muted-foreground">
                {t("workout.form.mainSetPaceHint")}
              </p>
              {mainPaceError && (
                <p className="text-sm text-destructive">{mainPaceError}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* 心率 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("workout.form.heartRate")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {/* 平均心率 */}
            <div className="space-y-2">
              <Label htmlFor="avgHr">{t("workout.form.avgHr")}</Label>
              <Input
                id="avgHr"
                type="number"
                {...register("avgHeartRate", {
                  setValueAs: (v) => (v === "" ? null : Number(v)), // 空 → null（不是 NaN）
                })}
              />
              {errors.avgHeartRate && (
                <p className="text-sm text-destructive">
                  {t(errors.avgHeartRate.message ?? "")}
                </p>
              )}
            </div>
            {/* 最大心率 */}
            <div className="space-y-2">
              <Label htmlFor="maxHr">{t("workout.form.maxHr")}</Label>
              <Input
                id="maxHr"
                type="number"
                {...register("maxHeartRate", { valueAsNumber: true })}
              />
              {errors.maxHeartRate && (
                <p className="text-sm text-destructive">
                  {t(errors.maxHeartRate.message ?? "")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* RPE */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("workout.form.rpe")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    setValue("rpe", watchedRpe === n ? null : n, {
                      shouldValidate: true,
                    })
                  }
                  className={`w-9 h-9 rounded-md border text-sm font-medium transition-colors ${rpeColor(
                    n,
                    watchedRpe === n
                  )}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t("workout.form.rpeHint")}
            </p>
          </CardContent>
        </Card>

        {/* 天氣 + 體感 */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* 天氣 */}
            <div className="space-y-2">
              <Label>{t("workout.form.weather")}</Label>
              <div className="flex flex-wrap gap-2">
                {WEATHER_OPTIONS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() =>
                      setValue("weather", watchedWeather === w ? null : w)
                    }
                    className={`px-3 h-9 rounded-md border text-sm transition-colors ${
                      watchedWeather === w
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-input hover:border-ring"
                    }`}
                  >
                    {WEATHER_ICONS[w]} {t(`workout.weather.${w}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* 體感 */}
            <div className="space-y-2">
              <Label>{t("workout.form.feeling")}</Label>
              <div className="flex flex-wrap gap-2">
                {FEELING_OPTIONS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() =>
                      setValue("feeling", watchedFeeling === f ? null : f)
                    }
                    className={`px-3 h-9 rounded-md border text-sm transition-colors ${
                      watchedFeeling === f
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-input hover:border-ring"
                    }`}
                  >
                    {t(`workout.feeling.${f}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* 溫度 */}
            <div className="space-y-2">
              <Label htmlFor="temp">{t("workout.form.temperature")}</Label>
              <Input
                id="temp"
                type="number"
                step="0.5"
                {...register("temperatureC", {
                  setValueAs: (v) => (v === "" ? null : Number(v)),
                })}
              />
            </div>
            {errors.temperatureC && (
              <p className="text-sm text-destructive">
                {t(errors.temperatureC.message ?? "")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 備註 */}
        <Card>
          <CardContent className="pt-6 space-y-2">
            <Label htmlFor="notes">{t("workout.form.notes")}</Label>
            <textarea
              id="notes"
              {...register("notes")}
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </CardContent>
        </Card>

        {/* 錯誤 */}
        {mutation.isError && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">
                {mutation.error?.message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 送出 */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1"
          >
            {mutation.isPending
              ? t("workout.form.submitting")
              : t("workout.form.submit")}
          </Button>
          <Button
            className="flex-1"
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}

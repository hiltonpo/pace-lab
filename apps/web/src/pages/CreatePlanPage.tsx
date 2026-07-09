import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPlanInputSchema,
  calculateTrainingPaces,
  parseDuration,
  formatPace,
  type CreatePlanInput,
  type RaceType,
} from "@pace-lab/shared";

import { createPlan } from "@/lib/plansApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PACE_SHORT_LABELS } from "@pace-lab/shared";
import { useOnline } from "@/hooks/useOnline";

const RACE_TYPES: RaceType[] = ["marathon", "half_marathon", "10k", "5k"];
const WEEKS_OPTIONS = [8, 12, 16] as const;

export const CreatePlanPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isOnline = useOnline();

  // 表單目標時間用字串輸入（"3:59:00"），送出前再轉秒數
  const [goalTimeStr, setGoalTimeStr] = useState("3:59:00");
  const [goalTimeError, setGoalTimeError] = useState<string | null>(null);

  // React Hook Form 設定
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreatePlanInput>({
    resolver: zodResolver(createPlanInputSchema),
    defaultValues: {
      name: "",
      goalRaceType: "marathon",
      goalTimeSec: 14340, // sub-4
      weeksTotal: 12,
    },
  });

  // 監聽欄位變化（給即時預覽用）
  const watchedGoalRaceType = watch("goalRaceType");
  const watchedGoalTimeSec = watch("goalTimeSec");

  // 即時 VDOT 預覽
  let preview: ReturnType<typeof calculateTrainingPaces> | null = null;
  try {
    if (watchedGoalTimeSec > 0) {
      preview = calculateTrainingPaces(watchedGoalRaceType, watchedGoalTimeSec);
    }
  } catch {
    preview = null;
  }

  // goalTime 輸入處理：字串 → 秒數
  const handleGoalTimeChange = (value: string) => {
    setGoalTimeStr(value);
    try {
      const sec = parseDuration(value);
      setValue("goalTimeSec", sec, { shouldValidate: true });
      setGoalTimeError(null);
    } catch {
      setGoalTimeError(t("plans.form.goalTimeHint"));
    }
  };

  // Mutation：呼叫 createPlan API
  const mutation = useMutation({
    mutationFn: createPlan,
    onSuccess: () => {
      // 讓 GET /api/plans 的快取失效，下次自動重 fetch
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      navigate("/");
    },
  });

  const onSubmit = (data: CreatePlanInput) => {
    mutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("plans.title")}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* 計畫名稱 */}
            <div className="space-y-2">
              <Label htmlFor="name">{t("plans.form.name")}</Label>
              <Input
                id="name"
                placeholder={t("plans.form.namePlaceholder")}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* 比賽類型 */}
            <div className="space-y-2">
              <Label htmlFor="goalRaceType">{t("plans.form.raceType")}</Label>
              <Select
                value={watchedGoalRaceType}
                onValueChange={(v) =>
                  setValue("goalRaceType", v as RaceType, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="goalRaceType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RACE_TYPES.map((rt) => (
                    <SelectItem key={rt} value={rt}>
                      {t(`plans.raceTypes.${rt}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 目標時間 */}
            <div className="space-y-2">
              <Label htmlFor="goalTime">{t("plans.form.goalTime")}</Label>
              <Input
                id="goalTime"
                value={goalTimeStr}
                onChange={(e) => handleGoalTimeChange(e.target.value)}
                placeholder="3:59:00"
              />
              <p className="text-xs text-muted-foreground">
                {t("plans.form.goalTimeHint")}
              </p>
              {goalTimeError && (
                <p className="text-sm text-destructive">{goalTimeError}</p>
              )}
            </div>

            {/* 週數 */}
            <div className="space-y-2">
              <Label htmlFor="weeks">{t("plans.form.weeks")}</Label>
              <Select
                value={String(watch("weeksTotal"))}
                onValueChange={(v) =>
                  setValue("weeksTotal", Number(v) as 8 | 12 | 16, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="weeks">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKS_OPTIONS.map((w) => (
                    <SelectItem key={w} value={String(w)}>
                      {w} weeks
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* VDOT 預覽 */}
        {preview && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("plans.preview.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline gap-3">
                <span className="text-sm text-muted-foreground">
                  {t("plans.preview.vdot")}
                </span>
                <span className="text-3xl font-semibold">{preview.vdot}</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {t("plans.preview.paces")}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                  {(
                    [
                      "easy",
                      "marathon",
                      "threshold",
                      "interval",
                      "repetition",
                    ] as const
                  ).map((paceType) => (
                    <div key={paceType} className="space-y-1">
                      <p className="text-muted-foreground">
                        {t(`plans.preview.${paceType}`, {
                          n: PACE_SHORT_LABELS[paceType],
                        })}
                      </p>
                      <p className="font-medium tabular-nums">
                        {formatPace(preview!.paces[paceType])}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 錯誤訊息 */}
        {mutation.isError && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">
                {mutation.error?.message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 離線提示 */}
        {!isOnline && (
          <p className="text-sm text-amber-600 dark:text-amber-500 text-center">
            {t("common.offlineCannotSave")}
          </p>
        )}
        {/* 送出按鈕 */}
        <Button
          type="submit"
          disabled={!isOnline || mutation.isPending}
          className="w-full"
        >
          {mutation.isPending
            ? t("plans.form.submitting")
            : t("plans.form.submit")}
        </Button>
      </form>
    </div>
  );
};

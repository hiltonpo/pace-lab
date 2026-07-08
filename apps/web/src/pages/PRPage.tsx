import { useState } from "react";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createPRInputSchema,
  parseDuration,
  formatDuration,
  raceTypeSchema,
  RACE_DISTANCE_KM,
  formatPace,
  calculateVDOT,
  type CreatePRInput,
  type PersonalRecordResponse,
} from "@pace-lab/shared";
import { usePRs, useCreatePR, useDeletePR } from "../hooks/usePRs";
import { usePlans } from "../hooks/usePlans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

const DISTANCES = raceTypeSchema.options; // ["marathon", "half_marathon", "10k", "5k"]

/** PR 換算配速（秒/km）*/
const prPaceSec = (pr: PersonalRecordResponse): number =>
  Math.round(pr.timeSec / RACE_DISTANCE_KM[pr.distance]);

/** 取每個距離的最佳 PR（最快）*/
const bestByDistance = (prs: PersonalRecordResponse[]) => {
  const map = new Map<string, PersonalRecordResponse>();
  prs.forEach((pr) => {
    const current = map.get(pr.distance);
    if (!current || pr.timeSec < current.timeSec) {
      map.set(pr.distance, pr);
    }
  });
  return map;
};

/** PR → VDOT */
const prVDOT = (pr: PersonalRecordResponse): number =>
  calculateVDOT(pr.distance, pr.timeSec);

/** 某距離的所有 PR，按日期排序（舊→新），轉成圖表資料 */
const historyByDistance = (prs: PersonalRecordResponse[], distance: string) =>
  prs
    .filter((pr) => pr.distance === distance)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((pr) => ({
      date: new Date(pr.date).toLocaleDateString(undefined, {
        year: "2-digit",
        month: "short",
        day: "numeric",
      }),
      timeSec: pr.timeSec,
    }));

const HistoryTooltip = (props: any) => {
  const { active, payload } = props;
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-background px-2 py-1 text-xs shadow-sm">
      <p className="tabular-nums font-medium">
        {formatDuration(payload[0].payload.timeSec)}
      </p>
      <p className="text-muted-foreground">{payload[0].payload.date}</p>
    </div>
  );
};

export const PRPage = () => {
  const { t } = useTranslation();
  const { data: prs, isLoading } = usePRs();
  const { data: plans } = usePlans();
  const createMutation = useCreatePR();
  const deleteMutation = useDeletePR();

  const [timeStr, setTimeStr] = useState("");
  const [timeError, setTimeError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedDistance, setSelectedDistance] = useState<string>("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreatePRInput>({
    resolver: zodResolver(createPRInputSchema),
    defaultValues: {
      distance: "marathon",
      timeSec: 0,
      date: "",
      note: null,
    },
  });

  const watchedDistance = watch("distance");
  const watchedDate = watch("date");

  const handleTimeChange = (value: string) => {
    setTimeStr(value);
    if (value.trim() === "") {
      setValue("timeSec", 0, { shouldValidate: true });
      setTimeError(null);
      return;
    }
    try {
      setValue("timeSec", parseDuration(value), { shouldValidate: true });
      setTimeError(null);
    } catch {
      setTimeError(t("pr.form.timeError"));
    }
  };

  const onSubmit = (data: CreatePRInput) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        reset();
        setTimeStr("");
        setShowForm(false);
      },
    });
  };

  if (isLoading)
    return <p className="text-muted-foreground">{t("common.loading")}</p>;

  // 各距離PR
  const best = bestByDistance(prs ?? []);

  // 各距離的紀錄（下拉選項）
  const availableDistances = DISTANCES.filter((d) => best.has(d));

  // 選中的距離（預設第一個有資料的）
  const activeDistance = selectedDistance || availableDistances[0] || "";

  // 該距離的歷史
  const history = activeDistance
    ? historyByDistance(prs ?? [], activeDistance)
    : [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("pr.title")}
        </h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" />
          {t("pr.add")}
        </Button>
      </div>

      {/* 新增表單 */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("pr.add")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("pr.form.distance")}</Label>
                <Select
                  value={watchedDistance}
                  onValueChange={(v) => setValue("distance", v as any)}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTANCES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {t(`plans.raceTypes.${d}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time">{t("pr.form.time")}</Label>
                  <input
                    id="time"
                    value={timeStr}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    placeholder="4:32:00"
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  {/* 格式錯誤 */}
                  {timeError && (
                    <p className="text-sm text-destructive">{timeError}</p>
                  )}
                  {/* 數值錯誤（Zod），但格式沒錯時才顯示，避免兩個一起跳 */}
                  {!timeError && errors.timeSec && (
                    <p className="text-sm text-destructive">
                      {t(errors.timeSec.message ?? "")}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">{t("pr.form.date")}</Label>
                  <input
                    id="date"
                    type="date"
                    value={watchedDate ? watchedDate.slice(0, 10) : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setValue(
                        "date",
                        v ? new Date(v).toISOString() : "", // 有選轉 ISO、沒選給空
                        { shouldValidate: true }
                      );
                    }}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring"
                  />
                  {errors.date && (
                    <p className="text-sm text-destructive">
                      {t("pr.form.dateError")}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">{t("pr.form.note")}</Label>
                <input
                  id="note"
                  {...register("note")}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring"
                />
              </div>

              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending
                  ? t("pr.form.saving")
                  : t("pr.form.save")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* PR 歷史曲線 */}
      {availableDistances.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {t("pr.history.title")}
              </CardTitle>
              {/* 距離下拉 */}
              <Select
                value={activeDistance}
                onValueChange={setSelectedDistance}
              >
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableDistances.map((d) => (
                    <SelectItem key={d} value={d}>
                      {t(`plans.raceTypes.${d}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {history.length < 2 ? (
              <p className="text-sm text-red-500 py-8 text-center">
                {t("pr.history.needMore")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart
                  data={history}
                  margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    reversed
                    domain={["dataMin - 60", "dataMax + 60"]}
                    tickFormatter={(sec) => formatDuration(sec)}
                    tick={{ fontSize: 11 }}
                    width={60}
                  />
                  <Tooltip content={<HistoryTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="timeSec"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#2563eb" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* PR 列表（各距離最佳）*/}
      {best.size === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">
          {t("pr.empty")}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DISTANCES.filter((d) => best.has(d)).map((d) => {
            const pr = best.get(d)!;
            return (
              <Card key={d}>
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div>
                      {/* PR距離 */}
                      <p className="text-sm text-muted-foreground">
                        {t(`plans.raceTypes.${d}`)}
                      </p>
                      {/* PR時間 */}
                      <p className="text-2xl font-semibold tabular-nums">
                        {formatDuration(pr.timeSec)}
                      </p>
                      {/* PR配速 */}
                      <p className="text-xs text-muted-foreground tabular-nums mt-1">
                        {formatPace(prPaceSec(pr))}/km
                      </p>
                      {/* PR推算的VDOT */}
                      <p className="text-xs text-muted-foreground mt-1">
                        VDOT {prVDOT(pr)}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(pr.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {pr.note && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {pr.note}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

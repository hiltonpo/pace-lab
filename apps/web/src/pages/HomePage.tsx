import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useMe, useLogout } from "../hooks/useMe";
import { usePlans } from "../hooks/usePlans";
import { formatDuration } from "@pace-lab/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export const HomePage = () => {
  const { t } = useTranslation();
  const { data: user, isLoading: userLoading } = useMe();
  const logout = useLogout();
  const { data: plans, isLoading: plansLoading } = usePlans();

  if (userLoading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  // 未登入
  if (!user) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-xl">{t("app.name")}</CardTitle>
          <CardDescription>{t("app.tagline")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <a href={`${apiBase}/api/auth/google`}>
              {t("auth.loginWithGoogle")}
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 已登入
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* 使用者卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {t("auth.welcome", { name: user.name })}
          </CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button asChild>
            <Link to="/plans/new">{t("plans.createNew")}</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            {logout.isPending ? t("auth.loggingOut") : t("auth.logout")}
          </Button>
        </CardContent>
      </Card>

      {/* 計畫列表 */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("plans.myPlans")}
        </h2>

        {plansLoading && (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        )}

        {!plansLoading && plans && plans.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-2">{t("plans.noPlans")}</p>
              <p className="text-sm text-muted-foreground">
                {t("plans.noPlansHint")}
              </p>
            </CardContent>
          </Card>
        )}

        {!plansLoading && plans && plans.length > 0 && (
          <div className="grid gap-3">
            {plans.map((plan) => (
              <Link key={plan.id} to={`/plans/${plan.id}`}>
                <Card className="hover:border-ring transition-colors cursor-pointer">
                  <CardContent className="pt-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {t(`plans.raceTypes.${plan.goalRaceType}`)} ·{" "}
                        {formatDuration(plan.goalTimeSec)} · {plan.weeksTotal}{" "}
                        weeks
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold">{plan.vdot}</p>
                      <p className="text-xs text-muted-foreground">VDOT</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

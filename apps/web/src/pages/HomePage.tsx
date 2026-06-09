import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useMe, useLogout } from "../hooks/useMe";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export function HomePage() {
  const { t } = useTranslation();
  const { data: user, isLoading } = useMe();
  const logout = useLogout();

  if (isLoading) {
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
    <div className="space-y-6 max-w-md mx-auto">
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
    </div>
  );
}

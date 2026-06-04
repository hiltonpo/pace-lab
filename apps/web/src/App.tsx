import { useTranslation } from "react-i18next";
import { useMe, useLogout } from "./hooks/useMe";
import { useTheme } from "./hooks/useTheme";
import { useLocale } from "./hooks/useLocale";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export function App() {
  const { t } = useTranslation();
  const { data: user, isLoading } = useMe();
  const logout = useLogout();
  const { theme, toggleTheme } = useTheme();
  const { locale, changeLocale, available, labels } = useLocale();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 flex h-14 items-center justify-between">
          <div className="font-semibold tracking-tight">{t("app.name")}</div>
          <div className="flex items-center gap-2">
            {/* 語言切換 */}
            <Select
              value={locale}
              onValueChange={(v) => changeLocale(v as any)}
            >
              <SelectTrigger size="sm" className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {available.map((l) => (
                  <SelectItem key={l} value={l}>
                    {labels[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* 主題切換 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-12">
        {isLoading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : user ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-xl">
                {t("auth.welcome", { name: user.name })}
              </CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
              >
                {logout.isPending ? t("auth.loggingOut") : t("auth.logout")}
              </Button>
            </CardContent>
          </Card>
        ) : (
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
        )}
      </main>
    </div>
  );
}

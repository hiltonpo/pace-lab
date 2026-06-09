import { Outlet, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Layout() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { locale, changeLocale, available, labels } = useLocale();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 flex h-14 items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight">
            {t("app.name")}
          </Link>
          <div className="flex items-center gap-2">
            <Select
              value={locale}
              onValueChange={(v) => changeLocale(v as any)}
            >
              <SelectTrigger className="w-[120px] h-9">
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

      <main className="mx-auto max-w-7xl px-4 py-12">
        <Outlet />
      </main>
    </div>
  );
}

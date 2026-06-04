import { useMe, useLogout } from "./hooks/useMe";
import { useTheme } from "./hooks/useTheme";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export function App() {
  const { data: user, isLoading } = useMe();
  const logout = useLogout();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 flex h-14 items-center justify-between">
          <div className="font-semibold tracking-tight">pace lab</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-12">
        {isLoading ? (
          <p className="text-muted-foreground">読み込み中…</p>
        ) : user ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-xl">
                ようこそ、{user.name} さん
              </CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
              >
                {logout.isPending ? "ログアウト中…" : "ログアウト"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-xl">pace lab</CardTitle>
              <CardDescription>マラソントレーニング設計室</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <a href={`${apiBase}/api/auth/google`}>Google でログイン</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

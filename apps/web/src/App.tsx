import { useMe, useLogout } from "./hooks/useMe";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export function App() {
  const { data: user, isLoading } = useMe();
  const logout = useLogout();

  if (isLoading) {
    return <div style={{ padding: 32 }}>Loading...</div>;
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 32, maxWidth: 600 }}>
      <h1>pace lab 🏃</h1>

      {user ? (
        <div>
          <p>
            ようこそ、<strong>{user.name}</strong> さん
          </p>
          <p style={{ color: "#666", fontSize: 14 }}>{user.email}</p>
          <button
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            {logout.isPending ? "ログアウト中..." : "ログアウト"}
          </button>
        </div>
      ) : (
        <div>
          <p>マラソントレーニング設計室へようこそ</p>
          <a
            href={`${apiBase}/api/auth/google`}
            style={{
              display: "inline-block",
              marginTop: 16,
              padding: "10px 20px",
              background: "#4285f4",
              color: "white",
              textDecoration: "none",
              borderRadius: 4,
            }}
          >
            Google でログイン
          </a>
        </div>
      )}
    </div>
  );
}

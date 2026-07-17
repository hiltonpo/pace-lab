import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../lib/api";

type User = {
  id: string;
  email: string;
  name: string;
  goalMarathonSec: number | null;
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],

    queryFn: async () => {
      try {
        const data = await apiGet<{ user: User | null }>("/api/me");
        return data.user;
      } catch {
        return null; // 401 等 = 沒登入 = null
      }
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost("/api/auth/logout"),
    onSuccess: async () => {
      // 清 Service Worker 的 API 快取（PWA 離線快取的登入後資料）
      if ("caches" in window) {
        await caches.delete("api-cache");
      }
      // 清除所有 TanStack Query 快取（不只 me，計畫/訓練/PR 都要清）
      queryClient.clear();
      // 硬導向首頁（整頁重載，確保所有 state 歸零）
      window.location.href = "/";
    },
  });
}

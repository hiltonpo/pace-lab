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
    onSuccess: () => {
      // 登出成功 → 把快取的「我是誰」清掉，畫面會自動變未登入
      queryClient.setQueryData(["me"], null);
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPlans, getPlanDetail, deletePlan } from "../lib/plansApi";

/**
 * 取得所有計畫摘要（給列表頁用）
 */
export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: listPlans,
  });
}

/**
 * 取得單一計畫詳情（含 workouts）
 */
export function usePlanDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["plans", id],
    queryFn: () => getPlanDetail(id!),
    enabled: !!id, // id 不存在時不執行
  });
}

/**
 * 刪除計畫
 */
export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePlan,
    onSuccess: () => {
      // 列表頁的快取失效
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}

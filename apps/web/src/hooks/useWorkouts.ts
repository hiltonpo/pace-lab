import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createWorkout, listWorkouts, deleteWorkout } from "../lib/workoutsApi";

/**
 * 列出訓練紀錄（可帶篩選）
 */
export function useWorkouts(params?: {
  planId?: string;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: ["workouts", params ?? {}],
    queryFn: () => listWorkouts(params),
  });
}

/**
 * 記錄訓練
 */
export function useCreateWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
    },
  });
}

/**
 * 刪除訓練紀錄
 */
export function useDeleteWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
    },
  });
}

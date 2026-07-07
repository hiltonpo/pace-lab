import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPRs, createPR, deletePR } from "../lib/prApi";

export const usePRs = () =>
  useQuery({
    queryKey: ["prs"],
    queryFn: listPRs,
  });

export const useCreatePR = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPR,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prs"] });
    },
  });
};

export const useDeletePR = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePR,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prs"] });
    },
  });
};

import { useMutation } from "@tanstack/react-query";
import { parseFit } from "../lib/fitApi";

export const useParseFit = () =>
  useMutation({
    mutationFn: parseFit,
  });

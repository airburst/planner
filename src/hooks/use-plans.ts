import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getElectronApi } from "../lib/electron-api";
import { queryKeys } from "./query-keys";

type NewPlan = Parameters<Window["api"]["createPlan"]>[0];
type UpdatePlan = Parameters<Window["api"]["updatePlan"]>[1];

export function usePlans() {
  return useQuery({
    queryKey: queryKeys.plans.all,
    queryFn: () => getElectronApi().getPlans()
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NewPlan) => getElectronApi().createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
    }
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePlan }) =>
      getElectronApi().updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
    }
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => getElectronApi().deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
    }
  });
}

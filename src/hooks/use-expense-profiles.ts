import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getElectronApi } from "../lib/electron-api";
import { queryKeys } from "./query-keys";

type NewExpenseProfile = Parameters<Window["api"]["createExpenseProfile"]>[0];
type UpdateExpenseProfile = Parameters<Window["api"]["updateExpenseProfile"]>[1];

export function useExpenseProfileByPlan(planId?: number) {
  return useQuery({
    queryKey: planId ? queryKeys.expenseProfiles.byPlan(planId) : ["expense-profiles-none"],
    queryFn: () => getElectronApi().getExpenseProfileByPlan(planId!),
    enabled: Boolean(planId)
  });
}

export function useCreateExpenseProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NewExpenseProfile) => getElectronApi().createExpenseProfile(data),
    onSuccess: (profile) => {
      if (profile?.planId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.expenseProfiles.byPlan(profile.planId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.projection.forPlan(profile.planId) });
      }
    }
  });
}

export function useUpdateExpenseProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateExpenseProfile }) =>
      getElectronApi().updateExpenseProfile(id, data),
    onSuccess: (profile) => {
      if (profile?.planId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.expenseProfiles.byPlan(profile.planId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.projection.forPlan(profile.planId) });
      }
    }
  });
}

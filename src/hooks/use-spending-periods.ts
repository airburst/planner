import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getElectronApi } from "../lib/electron-api";
import { queryKeys } from "./query-keys";

type NewSpendingPeriod = Parameters<Window["api"]["createSpendingPeriod"]>[0];
type UpdateSpendingPeriod = Parameters<Window["api"]["updateSpendingPeriod"]>[1];

export function useSpendingPeriodsByPlan(planId?: number) {
  return useQuery({
    queryKey: planId ? queryKeys.spendingPeriods.byPlan(planId) : ["spending-periods-none"],
    queryFn: () => getElectronApi().getSpendingPeriodsByPlan(planId!),
    enabled: Boolean(planId)
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, planId: number) {
  queryClient.invalidateQueries({ queryKey: queryKeys.spendingPeriods.byPlan(planId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.projection.forPlan(planId) });
}

export function useCreateSpendingPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NewSpendingPeriod) => getElectronApi().createSpendingPeriod(data),
    onSuccess: (row) => row?.planId && invalidate(queryClient, row.planId)
  });
}

export function useUpdateSpendingPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSpendingPeriod }) =>
      getElectronApi().updateSpendingPeriod(id, data),
    onSuccess: (row) => row?.planId && invalidate(queryClient, row.planId)
  });
}

export function useDeleteSpendingPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; planId: number }) => getElectronApi().deleteSpendingPeriod(id),
    onSuccess: (_, { planId }) => invalidate(queryClient, planId)
  });
}

export function useReplaceSpendingPeriods() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, periods }: { planId: number; periods: NewSpendingPeriod[] }) =>
      getElectronApi().replaceSpendingPeriods(planId, periods),
    onSuccess: (_, { planId }) => invalidate(queryClient, planId)
  });
}

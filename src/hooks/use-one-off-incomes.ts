import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getElectronApi } from "../lib/electron-api";
import { queryKeys } from "./query-keys";

type NewOneOffIncome = Parameters<Window["api"]["createOneOffIncome"]>[0];
type UpdateOneOffIncome = Parameters<Window["api"]["updateOneOffIncome"]>[1];

export function useOneOffIncomesByPlan(planId?: number) {
  return useQuery({
    queryKey: planId ? queryKeys.oneOffIncomes.byPlan(planId) : ["one-off-incomes-none"],
    queryFn: () => getElectronApi().getOneOffIncomesByPlan(planId!),
    enabled: Boolean(planId)
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, planId: number) {
  queryClient.invalidateQueries({ queryKey: queryKeys.oneOffIncomes.byPlan(planId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.projection.forPlan(planId) });
}

export function useCreateOneOffIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NewOneOffIncome) => getElectronApi().createOneOffIncome(data),
    onSuccess: (row) => row?.planId && invalidate(queryClient, row.planId)
  });
}

export function useUpdateOneOffIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateOneOffIncome }) =>
      getElectronApi().updateOneOffIncome(id, data),
    onSuccess: (row) => row?.planId && invalidate(queryClient, row.planId)
  });
}

export function useDeleteOneOffIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; planId: number }) => getElectronApi().deleteOneOffIncome(id),
    onSuccess: (_, { planId }) => invalidate(queryClient, planId)
  });
}

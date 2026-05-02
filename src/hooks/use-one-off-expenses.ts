import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getElectronApi } from "../lib/electron-api";
import { queryKeys } from "./query-keys";

type NewOneOffExpense = Parameters<Window["api"]["createOneOffExpense"]>[0];
type UpdateOneOffExpense = Parameters<Window["api"]["updateOneOffExpense"]>[1];

export function useOneOffExpensesByPlan(planId?: number) {
  return useQuery({
    queryKey: planId ? queryKeys.oneOffExpenses.byPlan(planId) : ["one-off-expenses-none"],
    queryFn: () => getElectronApi().getOneOffExpensesByPlan(planId!),
    enabled: Boolean(planId)
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, planId: number) {
  queryClient.invalidateQueries({ queryKey: queryKeys.oneOffExpenses.byPlan(planId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.projection.forPlan(planId) });
}

export function useCreateOneOffExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NewOneOffExpense) => getElectronApi().createOneOffExpense(data),
    onSuccess: (row) => row?.planId && invalidate(queryClient, row.planId)
  });
}

export function useUpdateOneOffExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateOneOffExpense }) =>
      getElectronApi().updateOneOffExpense(id, data),
    onSuccess: (row) => row?.planId && invalidate(queryClient, row.planId)
  });
}

export function useDeleteOneOffExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; planId: number }) => getElectronApi().deleteOneOffExpense(id),
    onSuccess: (_, { planId }) => invalidate(queryClient, planId)
  });
}

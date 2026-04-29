import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getElectronApi } from "../lib/electron-api";
import { queryKeys } from "./query-keys";

type NewIncomeStream = Parameters<Window["api"]["createIncomeStream"]>[0];
type UpdateIncomeStream = Parameters<Window["api"]["updateIncomeStream"]>[1];

export function useIncomeStreamsByPlan(planId?: number) {
  return useQuery({
    queryKey: planId
      ? queryKeys.incomeStreams.byPlan(planId)
      : queryKeys.incomeStreams.all,
    queryFn: () => {
      if (!planId) {
        return Promise.resolve([]);
      }
      return getElectronApi().getIncomeStreamsByPlan(planId);
    },
    enabled: Boolean(planId)
  });
}

export function useCreateIncomeStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NewIncomeStream) => getElectronApi().createIncomeStream(data),
    onSuccess: (incomeStream) => {
      if (incomeStream?.planId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.incomeStreams.byPlan(incomeStream.planId)
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.incomeStreams.all });
    }
  });
}

export function useUpdateIncomeStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateIncomeStream }) =>
      getElectronApi().updateIncomeStream(id, data),
    onSuccess: (incomeStream) => {
      if (incomeStream?.planId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.incomeStreams.byPlan(incomeStream.planId)
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.incomeStreams.all });
    }
  });
}

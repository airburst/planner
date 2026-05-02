import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getElectronApi } from "../lib/electron-api";
import { queryKeys } from "./query-keys";

type NewAssumptionSet = Parameters<Window["api"]["createAssumptionSet"]>[0];
type UpdateAssumptionSet = Parameters<Window["api"]["updateAssumptionSet"]>[1];

export function useAssumptionSetByPlan(planId: number) {
  return useQuery({
    queryKey: queryKeys.assumptionSets.byPlan(planId),
    queryFn: () => getElectronApi().getAssumptionSetByPlan(planId),
    enabled: !!planId,
  });
}

export function useCreateAssumptionSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NewAssumptionSet) => getElectronApi().createAssumptionSet(data),
    onSuccess: (result) => {
      if (result?.planId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.assumptionSets.byPlan(result.planId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.projection.forPlan(result.planId) });
      }
    },
  });
}

export function useUpdateAssumptionSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; planId: number; data: UpdateAssumptionSet }) =>
      getElectronApi().updateAssumptionSet(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assumptionSets.byPlan(variables.planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projection.forPlan(variables.planId) });
    },
  });
}

export function useDeleteAssumptionSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number; planId: number }) =>
      getElectronApi().deleteAssumptionSet(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assumptionSets.byPlan(variables.planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projection.forPlan(variables.planId) });
    },
  });
}

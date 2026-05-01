import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";

const PROJECTION_YEARS = 30;

export function useScenariosByPlan(planId: number) {
  return useQuery({
    queryKey: queryKeys.scenarios.forPlan(planId),
    queryFn: async () => {
      const scenarios = await window.api.getScenariosByPlan(planId);
      return scenarios || [];
    },
    enabled: !!planId,
  });
}

export function useScenario(scenarioId: number | null) {
  return useQuery({
    queryKey: queryKeys.scenarios.byId(scenarioId),
    queryFn: async () => {
      if (!scenarioId) return null;
      return window.api.getScenario(scenarioId);
    },
    enabled: !!scenarioId,
  });
}

export function useCreateScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: NewScenario) => {
      const result = await window.api.createScenario(data);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.scenarios.forPlan(variables.planId),
      });
    },
  });
}

export function useUpdateScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      id: number;
      planId: number;
      data: Partial<NewScenario>;
    }) => {
      return window.api.updateScenario(variables.id, variables.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.scenarios.byId(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.scenarios.forPlan(variables.planId),
      });
    },
  });
}

export function useDeleteScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: { id: number; planId: number }) => {
      return window.api.deleteScenario(variables.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.scenarios.forPlan(variables.planId),
      });
      // Also invalidate projection data
      queryClient.invalidateQueries({
        queryKey: queryKeys.projection.forPlan(variables.planId),
      });
    },
  });
}

export function useScenarioOverrides(scenarioId: number | null) {
  return useQuery({
    queryKey: queryKeys.scenarios.overrides(scenarioId),
    queryFn: async () => {
      if (!scenarioId) return [];
      return window.api.getScenarioOverrides(scenarioId);
    },
    enabled: !!scenarioId,
  });
}

export function useSetScenarioOverrides() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      scenarioId: number;
      planId: number;
      overrides: NewScenarioOverride[];
    }) => {
      return window.api.setScenarioOverrides(
        variables.scenarioId,
        variables.overrides
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.scenarios.overrides(variables.scenarioId),
      });
      // Invalidate projection to force re-run
      queryClient.invalidateQueries({
        queryKey: queryKeys.projection.forPlan(variables.planId),
      });
    },
  });
}

export function useScenarioProjection(scenarioId: number | null) {
  return useQuery({
    queryKey: [...queryKeys.scenarios.byId(scenarioId), "projection"],
    queryFn: async () => {
      if (!scenarioId) return null;
      const startYear = new Date().getFullYear();
      return window.api.runProjectionForScenario(scenarioId, {
        startYear,
        endYear: startYear + PROJECTION_YEARS,
      });
    },
    enabled: !!scenarioId,
    staleTime: 30_000,
    retry: false,
  });
}

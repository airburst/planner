import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getElectronApi } from "../lib/electron-api";
import { queryKeys } from "./query-keys";

type NewPerson = Parameters<Window["api"]["createPerson"]>[0];
type UpdatePerson = Parameters<Window["api"]["updatePerson"]>[1];

export function usePeopleByPlan(planId?: number) {
  return useQuery({
    queryKey: planId ? queryKeys.people.byPlan(planId) : queryKeys.people.all,
    queryFn: () => {
      if (!planId) {
        return Promise.resolve([]);
      }
      return getElectronApi().getPeopleByPlan(planId);
    },
    enabled: Boolean(planId)
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NewPerson) => getElectronApi().createPerson(data),
    onSuccess: (person) => {
      if (person?.planId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.people.byPlan(person.planId)
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.people.all });
    }
  });
}

export function useUpdatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePerson }) =>
      getElectronApi().updatePerson(id, data),
    onSuccess: (person) => {
      if (person?.planId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.people.byPlan(person.planId)
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.people.all });
    }
  });
}

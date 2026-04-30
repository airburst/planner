import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getElectronApi } from "../lib/electron-api";
import { queryKeys } from "./query-keys";

type NewAccount = Parameters<Window["api"]["createAccount"]>[0];
type UpdateAccount = Parameters<Window["api"]["updateAccount"]>[1];

export function useAccountsByPlan(planId?: number) {
  return useQuery({
    queryKey: planId ? queryKeys.accounts.byPlan(planId) : queryKeys.accounts.all,
    queryFn: () => {
      if (!planId) {
        return Promise.resolve([]);
      }
      return getElectronApi().getAccountsByPlan(planId);
    },
    enabled: Boolean(planId)
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NewAccount) => getElectronApi().createAccount(data),
    onSuccess: (account) => {
      if (account?.planId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts.byPlan(account.planId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.projection.forPlan(account.planId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    }
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAccount }) =>
      getElectronApi().updateAccount(id, data),
    onSuccess: (account) => {
      if (account?.planId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts.byPlan(account.planId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.projection.forPlan(account.planId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    }
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number; planId: number }) =>
      getElectronApi().deleteAccount(id),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.byPlan(planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projection.forPlan(planId) });
    }
  });
}

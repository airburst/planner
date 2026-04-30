import { useQuery } from "@tanstack/react-query";
import { getElectronApi } from "../lib/electron-api";
import { queryKeys } from "./query-keys";

const PROJECTION_YEARS = 30;

export function useProjection(planId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.projection.forPlan(planId ?? 0),
    queryFn: () => {
      const startYear = new Date().getFullYear();
      return getElectronApi().runProjectionForPlan(planId!, {
        startYear,
        endYear: startYear + PROJECTION_YEARS,
      });
    },
    enabled: !!planId,
    staleTime: 30_000,
    retry: false,
  });
}

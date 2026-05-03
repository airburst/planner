import { createContext, useContext } from "react";

export interface PlanContextValue {
  planId: number;
  selectedScenarioId: number | null;
  setSelectedScenarioId: (id: number | null) => void;
  openScenarioModal: () => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function usePlanContext(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlanContext must be used inside <PlanProvider>");
  return ctx;
}

export const PlanProvider = PlanContext.Provider;

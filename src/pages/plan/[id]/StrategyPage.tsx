import { usePlanContext } from "@/contexts/PlanContext";
import { useProjection } from "@/hooks/use-projection";
import { useScenarioProjection } from "@/hooks/use-scenarios";
import { MonteCarloPanel } from "./MonteCarloPanel";
import { ProjectionTable } from "./ProjectionTable";
import { ScenarioComparison } from "./ScenarioComparison";
import { StrategyPresetToggle } from "./StrategyPresetToggle";
import { StressTestPanel } from "./StressTestPanel";

export function StrategyPage() {
  const { planId, selectedScenarioId } = usePlanContext();
  const projectionQuery = useProjection(planId);
  const scenarioProjectionQuery = useScenarioProjection(selectedScenarioId);

  const activeProjection =
    selectedScenarioId && scenarioProjectionQuery.data
      ? scenarioProjectionQuery.data
      : projectionQuery.data;

  if (!activeProjection || activeProjection.years.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-5 text-card-foreground">
        <p className="text-sm text-muted-foreground">
          No projection data yet. Add household members and accounts to start exploring strategies.
        </p>
      </section>
    );
  }

  const baseSummary = {
    endAssets: activeProjection.years[activeProjection.years.length - 1]?.totalHouseholdAssets ?? 0,
    totalTax: activeProjection.years.reduce((s, y) => s + y.totalHouseholdTax, 0),
    totalDrawdown: activeProjection.years.reduce((s, y) => s + y.totalHouseholdWithdrawals, 0),
    hasShortfall: activeProjection.years.some((y) => !y.canSustainSpending),
    safeAnnualSpend: activeProjection.safeAnnualSpend,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Drawdown strategy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stress test the plan, run probabilistic simulations, and compare scenarios to find the most
          tax-efficient and resilient drawdown strategy.
        </p>
      </div>
      <StrategyPresetToggle planId={planId} />
      <ScenarioComparison planId={planId} selectedScenarioId={selectedScenarioId} />
      <StressTestPanel
        planId={planId}
        scenarioId={selectedScenarioId}
        baseSummary={baseSummary}
      />
      <MonteCarloPanel planId={planId} scenarioId={selectedScenarioId} />
      <ProjectionTable years={activeProjection.years} />
    </div>
  );
}

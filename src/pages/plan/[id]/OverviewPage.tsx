import { usePlanContext } from "@/contexts/PlanContext";
import { useIncomeStreamsByPlan } from "@/hooks/use-income-streams";
import { useOneOffIncomesByPlan } from "@/hooks/use-one-off-incomes";
import { usePeopleByPlan } from "@/hooks/use-people";
import { useProjection } from "@/hooks/use-projection";
import { useScenarioProjection } from "@/hooks/use-scenarios";
import { IncomePhaseChart } from "./IncomePhaseChart";
import { ProjectionError } from "./ProjectionError";
import { ProjectionSummary } from "./ProjectionSummary";
import { RecommendationPanel } from "./RecommendationPanel";

export function OverviewPage() {
  const { planId, selectedScenarioId } = usePlanContext();

  const peopleQuery = usePeopleByPlan(planId);
  const incomeStreamsQuery = useIncomeStreamsByPlan(planId);
  const oneOffIncomesQuery = useOneOffIncomesByPlan(planId);
  const projectionQuery = useProjection(planId);
  const scenarioProjectionQuery = useScenarioProjection(selectedScenarioId);

  const activeProjection =
    selectedScenarioId && scenarioProjectionQuery.data
      ? scenarioProjectionQuery.data
      : projectionQuery.data;

  const people = peopleQuery.data ?? [];
  const incomeStreams = incomeStreamsQuery.data ?? [];
  const oneOffIncomes = oneOffIncomesQuery.data ?? [];

  if (projectionQuery.isLoading) {
    return (
      <section className="rounded-lg border bg-card p-5 text-card-foreground">
        <p className="animate-pulse text-sm text-muted-foreground">Running projection…</p>
      </section>
    );
  }

  if (projectionQuery.isError) {
    return (
      <ProjectionError
        planId={planId}
        message={
          projectionQuery.error instanceof Error
            ? projectionQuery.error.message
            : "An unexpected error occurred."
        }
      />
    );
  }

  if (!activeProjection || activeProjection.years.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-5 text-card-foreground">
        <p className="text-sm text-muted-foreground">
          No projection data. Add a person with a date of birth to get started.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <ProjectionSummary
        years={activeProjection.years}
        startYear={activeProjection.startYear}
        endYear={activeProjection.endYear}
        retirementPotByPerson={activeProjection.retirementPotByPerson}
        safeAnnualSpend={activeProjection.safeAnnualSpend}
        people={people}
      />
      <IncomePhaseChart
        years={activeProjection.years}
        incomeStreams={incomeStreams}
        oneOffIncomes={oneOffIncomes}
      />
      <RecommendationPanel
        recommendations={activeProjection.recommendations}
        accumulationShortfall={activeProjection.accumulationShortfall}
      />
    </div>
  );
}

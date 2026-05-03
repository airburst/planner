import { ScoreDonut } from "@/components/layout/ScoreDonut";
import { usePlanContext } from "@/contexts/PlanContext";
import { useOneOffExpensesByPlan } from "@/hooks/use-one-off-expenses";
import { usePeopleByPlan } from "@/hooks/use-people";
import { useProjection } from "@/hooks/use-projection";
import { useScenarioProjection } from "@/hooks/use-scenarios";
import { useSpendingPeriodsByPlan } from "@/hooks/use-spending-periods";
import { OneOffExpensesPanel } from "./OneOffExpensesPanel";
import { RetirementAgeSliders } from "./RetirementAgeSliders";
import { SpendingPanel } from "./SpendingPanel";
import { fmt } from "../_shared/utils";

export function ExpensesPage() {
  const { planId, selectedScenarioId } = usePlanContext();
  const peopleQuery = usePeopleByPlan(planId);
  const spendingPeriodsQuery = useSpendingPeriodsByPlan(planId);
  const oneOffExpensesQuery = useOneOffExpensesByPlan(planId);
  const projectionQuery = useProjection(planId);
  const scenarioProjectionQuery = useScenarioProjection(selectedScenarioId);

  const people = peopleQuery.data ?? [];
  const spendingPeriods = spendingPeriodsQuery.data ?? [];
  const oneOffExpenses = oneOffExpensesQuery.data ?? [];

  const activeProjection =
    selectedScenarioId && scenarioProjectionQuery.data
      ? scenarioProjectionQuery.data
      : projectionQuery.data;

  // Sustainability score = % of years funded.
  const totalYears = activeProjection?.years.length ?? 0;
  const sustainedYears = activeProjection?.years.filter((y) => y.canSustainSpending).length ?? 0;
  const score = totalYears > 0 ? Math.round((sustainedYears / totalYears) * 100) : 0;
  const scoreLabel = score >= 95 ? "Excellent" : score >= 80 ? "On track" : score >= 60 ? "At risk" : "Off track";

  // Monthly surplus = average over years of (income - spend).
  const surplus =
    activeProjection && activeProjection.years.length > 0
      ? Math.round(
          activeProjection.years.reduce((s, y) => s + y.deficitOrSurplus, 0) /
            activeProjection.years.length /
            12
        )
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Expenditure modelling</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define your lifestyle goals and visualise how they impact long-term retirement sustainability.
        </p>
      </div>

      <RetirementAgeSliders people={people} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <SpendingPanel planId={planId} periods={spendingPeriods} people={people} />
          <OneOffExpensesPanel planId={planId} oneOffExpenses={oneOffExpenses} />
        </div>

        {/* Sustainability score side card */}
        <aside className="rounded-lg border bg-sw-on-surface p-5 text-white shadow-md">
          <p className="text-xs font-medium uppercase tracking-wider opacity-70">
            Sustainability score
          </p>
          <div className="mt-4 flex justify-center">
            <ScoreDonut score={score} label={scoreLabel} size={160} />
          </div>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <span className="opacity-70">Years sustained</span>
              <span className="font-medium">
                {sustainedYears} / {totalYears}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="opacity-70">Avg monthly surplus</span>
              <span className={surplus >= 0 ? "font-medium" : "font-medium text-red-300"}>
                {surplus >= 0 ? "+" : ""}{fmt(surplus)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="opacity-70">Inflation-adjusted</span>
              <span className="font-medium">✓</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

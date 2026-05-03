import { StatCard } from "@/components/layout/StatCard";
import { usePlanContext } from "@/contexts/PlanContext";
import { useAccountsByPlan } from "@/hooks/use-accounts";
import { useIncomeStreamsByPlan } from "@/hooks/use-income-streams";
import { useOneOffIncomesByPlan } from "@/hooks/use-one-off-incomes";
import { usePeopleByPlan } from "@/hooks/use-people";
import { useProjection } from "@/hooks/use-projection";
import { useScenarioProjection } from "@/hooks/use-scenarios";
import { Banknote, CalendarClock, Coins, Target } from "lucide-react";
import { SavingsBurndownChart } from "../_shared/SavingsBurndownChart";
import { fmt } from "../_shared/utils";
import { AssetAllocationCard } from "./AssetAllocationCard";
import { IncomePhaseChart } from "./IncomePhaseChart";
import { ProjectionError } from "./ProjectionError";
import { RecommendationPanel } from "./RecommendationPanel";

export function OverviewPage() {
  const { planId, selectedScenarioId } = usePlanContext();

  const peopleQuery = usePeopleByPlan(planId);
  const accountsQuery = useAccountsByPlan(planId);
  const incomeStreamsQuery = useIncomeStreamsByPlan(planId);
  const oneOffIncomesQuery = useOneOffIncomesByPlan(planId);
  const projectionQuery = useProjection(planId);
  const scenarioProjectionQuery = useScenarioProjection(selectedScenarioId);

  const activeProjection =
    selectedScenarioId && scenarioProjectionQuery.data
      ? scenarioProjectionQuery.data
      : projectionQuery.data;

  const people = peopleQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
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
          No projection data. Add a person with a date of birth on the Settings tab to get started.
        </p>
      </section>
    );
  }

  // Headline stats
  const totalAssets = accounts.reduce((s, a) => s + (a.currentBalance ?? 0), 0);
  const lastYear = activeProjection.years.at(-1);
  const endAssets = lastYear?.totalHouseholdAssets ?? 0;
  const assetsDelta = totalAssets > 0 ? (endAssets - totalAssets) / totalAssets : null;

  // First retirement-active year's projected income — the "annual income at retirement".
  const firstSustainableRetirementYear = activeProjection.years.find(
    (y) => y.totalHouseholdIncome > 0 && y.year >= activeProjection.startYear
  );
  const projectedAnnualIncome = firstSustainableRetirementYear?.totalHouseholdIncome ?? 0;

  // Earliest household retirement age.
  const retirementAges = people
    .map((p) => p.retirementAge)
    .filter((a): a is number => typeof a === "number");
  const earliestRetirement = retirementAges.length > 0 ? Math.min(...retirementAges) : null;

  // Sustainability score — % of years funded.
  const totalYears = activeProjection.years.length;
  const sustainedYears = activeProjection.years.filter((y) => y.canSustainSpending).length;
  const readinessScore = totalYears > 0 ? Math.round((sustainedYears / totalYears) * 100) : 0;
  const readinessLabel = readinessScore >= 95
    ? "Excellent"
    : readinessScore >= 80
      ? "On track"
      : readinessScore >= 60
        ? "At risk"
        : "Off track";

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financial overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back. Your retirement plan is{" "}
            <span className="font-medium text-foreground">{readinessLabel.toLowerCase()}</span>.
          </p>
        </div>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Target}
          label="Retirement Readiness"
          value={`${readinessScore} / 100`}
          delta={readinessLabel}
          deltaTone={readinessScore >= 80 ? "positive" : readinessScore >= 60 ? "neutral" : "negative"}
        />
        <StatCard
          icon={Coins}
          label="Total Assets"
          value={fmt(totalAssets)}
          delta={
            assetsDelta !== null
              ? `${assetsDelta >= 0 ? "+" : ""}${(assetsDelta * 100).toFixed(1)}% projected by end`
              : undefined
          }
          deltaTone={assetsDelta && assetsDelta >= 0 ? "positive" : "negative"}
        />
        <StatCard
          icon={Banknote}
          label="Projected Annual Income"
          value={fmt(projectedAnnualIncome)}
          delta="Today's pounds, retirement-year"
        />
        <StatCard
          icon={CalendarClock}
          label="Earliest Retirement"
          value={earliestRetirement !== null ? `${earliestRetirement} yrs` : "—"}
          delta={people.length > 0 ? `Across ${people.length} ${people.length === 1 ? "person" : "people"}` : undefined}
        />
      </div>

      {/* Wealth burndown — household assets over time */}
      <SavingsBurndownChart years={activeProjection.years} people={people} />

      {/* Income & drawdown phasing */}
      <IncomePhaseChart
        years={activeProjection.years}
        incomeStreams={incomeStreams}
        oneOffIncomes={oneOffIncomes}
      />

      {/* Allocation + recommendations */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AssetAllocationCard accounts={accounts} />
        <RecommendationPanel
          recommendations={activeProjection.recommendations}
          accumulationShortfall={activeProjection.accumulationShortfall}
        />
      </div>
    </div>
  );
}

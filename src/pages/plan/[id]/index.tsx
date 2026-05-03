import { Button } from "@/components/ui/button";
import { useAccountsByPlan } from "@/hooks/use-accounts";
import { useExpenseProfileByPlan } from "@/hooks/use-expense-profiles";
import { useIncomeStreamsByPlan } from "@/hooks/use-income-streams";
import { useOneOffExpensesByPlan } from "@/hooks/use-one-off-expenses";
import { useOneOffIncomesByPlan } from "@/hooks/use-one-off-incomes";
import { usePeopleByPlan } from "@/hooks/use-people";
import { usePlans } from "@/hooks/use-plans";
import { useSpendingPeriodsByPlan } from "@/hooks/use-spending-periods";
import { useProjection } from "@/hooks/use-projection";
import { useScenarioProjection } from "@/hooks/use-scenarios";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { AccountsPanel } from "./AccountsPanel";
import { AssumptionsPanel } from "./AssumptionsPanel";
import { IncomePhaseChart } from "./IncomePhaseChart";
import { IncomeStreamsPanel } from "./IncomeStreamsPanel";
import { OneOffExpensesPanel } from "./OneOffExpensesPanel";
import { OneOffIncomesPanel } from "./OneOffIncomesPanel";
import { PeoplePanel } from "./PeoplePanel";
import { ProjectionError } from "./ProjectionError";
import { ProjectionSummary } from "./ProjectionSummary";
import { ProjectionTable } from "./ProjectionTable";
import { RecommendationPanel } from "./RecommendationPanel";
import { ScenarioComparison } from "./ScenarioComparison";
import { ScenarioModal } from "./ScenarioModal";
import { ScenarioSelector } from "./ScenarioSelector";
import { SpendingPanel } from "./SpendingPanel";
import { SpendingPeriodsPanel } from "./SpendingPeriodsPanel";
import { StressTestPanel } from "./StressTestPanel";

export function PlanDetailPage() {
  const params = useParams({ from: "/plan/$planId" });
  const planId = Number(params.planId);
  const navigate = useNavigate();
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);

  const plansQuery = usePlans();
  const peopleQuery = usePeopleByPlan(planId);
  const accountsQuery = useAccountsByPlan(planId);
  const incomeStreamsQuery = useIncomeStreamsByPlan(planId);
  const oneOffIncomesQuery = useOneOffIncomesByPlan(planId);
  const oneOffExpensesQuery = useOneOffExpensesByPlan(planId);
  const spendingPeriodsQuery = useSpendingPeriodsByPlan(planId);
  const expenseProfileQuery = useExpenseProfileByPlan(planId);
  const projectionQuery = useProjection(planId);
  const scenarioProjectionQuery = useScenarioProjection(selectedScenarioId);

  // The projection that drives the chart, table, summary, and recommendations.
  // Falls back to the base plan when no scenario is selected.
  const activeProjection =
    selectedScenarioId && scenarioProjectionQuery.data
      ? scenarioProjectionQuery.data
      : projectionQuery.data;

  const selectedPlan = (plansQuery.data ?? []).find((p) => p.id === planId) ?? null;
  const people = peopleQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const incomeStreams = incomeStreamsQuery.data ?? [];
  const oneOffIncomes = oneOffIncomesQuery.data ?? [];
  const oneOffExpenses = oneOffExpensesQuery.data ?? [];
  const spendingPeriods = spendingPeriodsQuery.data ?? [];
  const expenseProfile = expenseProfileQuery.data ?? null;
  const fallbackAnnualSpending = (expenseProfile?.essentialAnnual ?? 0) + (expenseProfile?.discretionaryAnnual ?? 0);

  if (!selectedPlan) {
    return (
      <main className="mx-auto space-y-6 p-6">
        <section className="rounded-lg border bg-card p-5 text-card-foreground">
          <h2 className="text-lg font-semibold">Plan not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This plan does not exist or has not loaded yet.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => navigate({ to: "/" })}>
            ← Back to plans
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto  space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{selectedPlan.name}</h1>
          {selectedPlan.description && (
            <p className="mt-1 text-sm text-muted-foreground">{selectedPlan.description}</p>
          )}
        </div>
        <Button variant="outline" onClick={() => navigate({ to: "/" })}>
          ← Plans
        </Button>
      </div>

      {/* Plan snapshot */}
      <section className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4 text-card-foreground">
          <p className="text-xs text-muted-foreground">People</p>
          <p className="mt-1 text-2xl font-semibold">{people.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-card-foreground">
          <p className="text-xs text-muted-foreground">Accounts</p>
          <p className="mt-1 text-2xl font-semibold">{accounts.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-card-foreground">
          <p className="text-xs text-muted-foreground">Income streams</p>
          <p className="mt-1 text-2xl font-semibold">{incomeStreams.length}</p>
        </div>
      </section>

      {/* Setup panels */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Setup</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PeoplePanel people={people} />
          <SpendingPanel planId={planId} />
          <SpendingPeriodsPanel
            planId={planId}
            periods={spendingPeriods}
            people={people}
            fallbackAnnual={fallbackAnnualSpending}
          />
          <AccountsPanel planId={planId} accounts={accounts} people={people} />
          <IncomeStreamsPanel planId={planId} incomeStreams={incomeStreams} people={people} />
          <OneOffIncomesPanel planId={planId} oneOffIncomes={oneOffIncomes} people={people} />
          <OneOffExpensesPanel planId={planId} oneOffExpenses={oneOffExpenses} />
          <AssumptionsPanel planId={planId} />
        </div>
      </section>

      {/* Scenario selector */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Analysis</h2>
        <ScenarioSelector
          planId={planId}
          selectedScenarioId={selectedScenarioId}
          onScenarioSelect={setSelectedScenarioId}
          onCreateClick={() => setScenarioModalOpen(true)}
        />
      </section>

      {/* Projection loading */}
      {projectionQuery.isLoading && (
        <section className="rounded-lg border bg-card p-5 text-card-foreground">
          <p className="animate-pulse text-sm text-muted-foreground">Running projection…</p>
        </section>
      )}

      {/* Projection error */}
      {projectionQuery.isError && (
        <ProjectionError
          planId={planId}
          message={
            projectionQuery.error instanceof Error
              ? projectionQuery.error.message
              : "An unexpected error occurred."
          }
        />
      )}

      {/* Projection results */}
      {activeProjection && activeProjection.years.length > 0 && (
        <>
          <ScenarioComparison
            planId={planId}
            selectedScenarioId={selectedScenarioId}
          />
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
          <StressTestPanel
            planId={planId}
            baseSummary={projectionQuery.data ? {
              endAssets: projectionQuery.data.years[projectionQuery.data.years.length - 1]?.totalHouseholdAssets ?? 0,
              totalTax: projectionQuery.data.years.reduce((s, y) => s + y.totalHouseholdTax, 0),
              totalDrawdown: projectionQuery.data.years.reduce((s, y) => s + y.totalHouseholdWithdrawals, 0),
              hasShortfall: projectionQuery.data.years.some((y) => !y.canSustainSpending),
              safeAnnualSpend: projectionQuery.data.safeAnnualSpend,
            } : null}
          />
          <ProjectionTable years={activeProjection.years} />
        </>
      )}

      {/* Empty state */}
      {projectionQuery.data && projectionQuery.data.years.length === 0 && (
        <section className="rounded-lg border bg-card p-5 text-card-foreground">
          <p className="text-sm text-muted-foreground">
            No projection data. Add a person with a date of birth to get started.
          </p>
        </section>
      )}

      {/* Scenario modal */}
      <ScenarioModal
        planId={planId}
        open={scenarioModalOpen}
        onOpenChange={setScenarioModalOpen}
      />
    </main>
  );
}

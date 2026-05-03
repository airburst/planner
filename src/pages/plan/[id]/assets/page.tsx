import { StatCard } from "@/components/layout/StatCard";
import { usePlanContext } from "@/contexts/PlanContext";
import { useAccountsByPlan } from "@/hooks/use-accounts";
import { useIncomeStreamsByPlan } from "@/hooks/use-income-streams";
import { useOneOffIncomesByPlan } from "@/hooks/use-one-off-incomes";
import { usePeopleByPlan } from "@/hooks/use-people";
import { useProjection } from "@/hooks/use-projection";
import { Banknote, PiggyBank, TrendingUp } from "lucide-react";
import { AccountsPanel } from "./AccountsPanel";
import { IncomeStreamsPanel } from "./IncomeStreamsPanel";
import { OneOffIncomesPanel } from "./OneOffIncomesPanel";
import { fmt } from "../_shared/utils";

export function AssetsPage() {
  const { planId } = usePlanContext();
  const peopleQuery = usePeopleByPlan(planId);
  const accountsQuery = useAccountsByPlan(planId);
  const incomeStreamsQuery = useIncomeStreamsByPlan(planId);
  const oneOffIncomesQuery = useOneOffIncomesByPlan(planId);
  const projectionQuery = useProjection(planId);

  const people = peopleQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const incomeStreams = incomeStreamsQuery.data ?? [];
  const oneOffIncomes = oneOffIncomesQuery.data ?? [];
  const projection = projectionQuery.data;

  // Total recurring annual income — pre-retirement streams contributing today.
  const annualIncome = incomeStreams.reduce((sum, s) => sum + (s.annualAmount ?? 0), 0);
  // Total invested/saved assets — sum of opening balances.
  const totalAssets = accounts.reduce((sum, a) => sum + (a.currentBalance ?? 0), 0);
  // Projected net worth — peak household assets across the projection.
  const projectedNetWorth = projection?.years.reduce(
    (max, y) => Math.max(max, y.totalHouseholdAssets),
    0
  ) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Income &amp; Assets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track every income stream and asset pot to refine your retirement projection.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Banknote}
          label="Total annual income"
          value={fmt(annualIncome)}
          delta={`${incomeStreams.length} ${incomeStreams.length === 1 ? "stream" : "streams"}`}
        />
        <StatCard
          icon={PiggyBank}
          label="Total invested assets"
          value={fmt(totalAssets)}
          delta={`${accounts.length} ${accounts.length === 1 ? "pot" : "pots"}`}
        />
        <StatCard
          icon={TrendingUp}
          label="Projected peak net worth"
          value={fmt(projectedNetWorth)}
          delta={projection ? `Across ${projection.years.length} years` : undefined}
        />
      </div>

      <IncomeStreamsPanel planId={planId} incomeStreams={incomeStreams} people={people} />
      <OneOffIncomesPanel planId={planId} oneOffIncomes={oneOffIncomes} people={people} />
      <AccountsPanel planId={planId} accounts={accounts} people={people} />
    </div>
  );
}

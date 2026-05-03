import { usePlanContext } from "@/contexts/PlanContext";
import { useAccountsByPlan } from "@/hooks/use-accounts";
import { useIncomeStreamsByPlan } from "@/hooks/use-income-streams";
import { useOneOffIncomesByPlan } from "@/hooks/use-one-off-incomes";
import { usePeopleByPlan } from "@/hooks/use-people";
import { AccountsPanel } from "./AccountsPanel";
import { IncomeStreamsPanel } from "./IncomeStreamsPanel";
import { OneOffIncomesPanel } from "./OneOffIncomesPanel";

export function AssetsPage() {
  const { planId } = usePlanContext();
  const peopleQuery = usePeopleByPlan(planId);
  const accountsQuery = useAccountsByPlan(planId);
  const incomeStreamsQuery = useIncomeStreamsByPlan(planId);
  const oneOffIncomesQuery = useOneOffIncomesByPlan(planId);

  const people = peopleQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const incomeStreams = incomeStreamsQuery.data ?? [];
  const oneOffIncomes = oneOffIncomesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Income &amp; Assets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your financial engines. Track every income stream and asset pot to refine your retirement projection.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <IncomeStreamsPanel planId={planId} incomeStreams={incomeStreams} people={people} />
        <OneOffIncomesPanel planId={planId} oneOffIncomes={oneOffIncomes} people={people} />
        <div className="lg:col-span-2">
          <AccountsPanel planId={planId} accounts={accounts} people={people} />
        </div>
      </div>
    </div>
  );
}

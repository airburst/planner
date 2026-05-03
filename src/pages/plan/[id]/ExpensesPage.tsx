import { usePlanContext } from "@/contexts/PlanContext";
import { useOneOffExpensesByPlan } from "@/hooks/use-one-off-expenses";
import { usePeopleByPlan } from "@/hooks/use-people";
import { useSpendingPeriodsByPlan } from "@/hooks/use-spending-periods";
import { OneOffExpensesPanel } from "./OneOffExpensesPanel";
import { SpendingPanel } from "./SpendingPanel";

export function ExpensesPage() {
  const { planId } = usePlanContext();
  const peopleQuery = usePeopleByPlan(planId);
  const spendingPeriodsQuery = useSpendingPeriodsByPlan(planId);
  const oneOffExpensesQuery = useOneOffExpensesByPlan(planId);

  const people = peopleQuery.data ?? [];
  const spendingPeriods = spendingPeriodsQuery.data ?? [];
  const oneOffExpenses = oneOffExpensesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Expenditure modelling</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define your lifestyle goals and visualise how they impact long-term retirement sustainability.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SpendingPanel planId={planId} periods={spendingPeriods} people={people} />
        <OneOffExpensesPanel planId={planId} oneOffExpenses={oneOffExpenses} />
      </div>
    </div>
  );
}

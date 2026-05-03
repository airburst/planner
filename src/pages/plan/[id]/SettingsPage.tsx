import { usePlanContext } from "@/contexts/PlanContext";
import { usePeopleByPlan } from "@/hooks/use-people";
import { AssumptionsPanel } from "./AssumptionsPanel";
import { PeoplePanel } from "./PeoplePanel";

export function SettingsPage() {
  const { planId } = usePlanContext();
  const peopleQuery = usePeopleByPlan(planId);
  const people = peopleQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Household members, economic assumptions, and tax policy. These rarely change once set up.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PeoplePanel people={people} />
        <AssumptionsPanel planId={planId} />
      </div>
    </div>
  );
}

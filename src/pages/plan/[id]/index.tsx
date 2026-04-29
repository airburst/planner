import { Button } from "@/components/ui/button";
import { useAccountsByPlan, useCreateAccount } from "@/renderer/hooks/use-accounts";
import { useCreateIncomeStream, useIncomeStreamsByPlan } from "@/renderer/hooks/use-income-streams";
import { useCreatePerson, usePeopleByPlan } from "@/renderer/hooks/use-people";
import { usePlans } from "@/renderer/hooks/use-plans";
import { useParams } from "@tanstack/react-router";
import { useMemo } from "react";

export function PlanDetailPage() {
  const params = useParams({ from: "/plan/$planId" });
  const planId = Number(params.planId);

  const plansQuery = usePlans();
  const createPerson = useCreatePerson();
  const createAccount = useCreateAccount();
  const createIncomeStream = useCreateIncomeStream();

  const selectedPlan = (plansQuery.data ?? []).find((plan) => plan.id === planId) ?? null;

  const peopleQuery = usePeopleByPlan(selectedPlan?.id);
  const accountsQuery = useAccountsByPlan(selectedPlan?.id);
  const incomeStreamsQuery = useIncomeStreamsByPlan(selectedPlan?.id);

  const people = peopleQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const incomeStreams = incomeStreamsQuery.data ?? [];

  const primaryPerson = useMemo(
    () => people.find((person) => person.role === "primary") ?? null,
    [people]
  );

  const createPrimaryPerson = async () => {
    if (!selectedPlan) {
      return;
    }

    await createPerson.mutateAsync({
      planId: selectedPlan.id,
      role: "primary",
      firstName: "Alex",
      retirementAge: 60,
      statePensionAge: 67
    });
  };

  const createSampleAccount = async () => {
    if (!selectedPlan) {
      return;
    }

    await createAccount.mutateAsync({
      planId: selectedPlan.id,
      personId: primaryPerson?.id ?? null,
      name: "SIPP Main",
      wrapperType: "sipp",
      currentBalance: 250000,
      annualContribution: 12000
    });
  };

  const createSampleIncomeStream = async () => {
    if (!selectedPlan || !primaryPerson) {
      return;
    }

    await createIncomeStream.mutateAsync({
      planId: selectedPlan.id,
      personId: primaryPerson.id,
      streamType: "db_pension",
      name: "Defined Benefit Pension",
      startAge: 60,
      annualAmount: 18000,
      taxable: true,
      inflationLinked: true
    });
  };

  if (!selectedPlan) {
    return (
      <section className="rounded-lg border bg-card p-4 text-card-foreground">
        <h2 className="text-lg font-semibold">Plan Not Found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The selected plan does not exist or has not loaded yet.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <section className="rounded-lg border bg-card p-4 text-card-foreground">
        <h2 className="text-xl font-semibold">{selectedPlan.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan id: {selectedPlan.id}
        </p>
      </section>

      <section className="rounded-lg border bg-card p-4 text-card-foreground">
        <h3 className="mb-3 text-lg font-semibold">Plan Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button onClick={createPrimaryPerson} disabled={createPerson.isPending}>
            Add Primary Person
          </Button>
          <Button
            onClick={createSampleAccount}
            disabled={!selectedPlan || createAccount.isPending}
            variant="outline"
          >
            Add SIPP Account
          </Button>
          <Button
            onClick={createSampleIncomeStream}
            disabled={!primaryPerson || createIncomeStream.isPending}
            variant="outline"
          >
            Add DB Income Stream
          </Button>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 text-card-foreground">
        <h3 className="mb-3 text-lg font-semibold">Current Snapshot</h3>
        <p>People in plan: {people.length}</p>
        <p>Accounts in plan: {accounts.length}</p>
        <p>Income streams in plan: {incomeStreams.length}</p>
      </section>
    </section>
  );
}

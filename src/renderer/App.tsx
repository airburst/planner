import { useMemo } from "react";
import { useAccountsByPlan, useCreateAccount } from "./hooks/use-accounts";
import { useCreateIncomeStream, useIncomeStreamsByPlan } from "./hooks/use-income-streams";
import { useCreatePerson, usePeopleByPlan } from "./hooks/use-people";
import { useCreatePlan, usePlans } from "./hooks/use-plans";

export function App() {
  const plansQuery = usePlans();
  const createPlan = useCreatePlan();
  const createPerson = useCreatePerson();
  const createAccount = useCreateAccount();
  const createIncomeStream = useCreateIncomeStream();

  const plans = plansQuery.data ?? [];
  const selectedPlan = plans[0] ?? null;

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

  const createSamplePlan = async () => {
    const name = `Plan ${plans.length + 1}`;
    await createPlan.mutateAsync({ name, description: "Created from renderer flow" });
  };

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

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 980, margin: "0 auto" }}>
      <h1>Planner</h1>
      <p>Renderer hooks are now connected to IPC-backed TanStack Query data flows.</p>

      <section style={{ marginTop: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>Quick Start Actions</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <button onClick={createSamplePlan} disabled={createPlan.isPending}>
            Add Plan
          </button>
          <button
            onClick={createPrimaryPerson}
            disabled={!selectedPlan || createPerson.isPending}
          >
            Add Primary Person
          </button>
          <button
            onClick={createSampleAccount}
            disabled={!selectedPlan || createAccount.isPending}
          >
            Add SIPP Account
          </button>
          <button
            onClick={createSampleIncomeStream}
            disabled={!selectedPlan || !primaryPerson || createIncomeStream.isPending}
          >
            Add DB Income Stream
          </button>
        </div>
      </section>

      <section style={{ marginTop: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>Current Snapshot</h2>
        <p>Plans: {plans.length}</p>
        <p>People in selected plan: {people.length}</p>
        <p>Accounts in selected plan: {accounts.length}</p>
        <p>Income streams in selected plan: {incomeStreams.length}</p>
        <p>
          Selected plan: {selectedPlan ? `${selectedPlan.id} - ${selectedPlan.name}` : "none"}
        </p>
      </section>
    </main>
  );
}
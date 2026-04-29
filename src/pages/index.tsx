import { useNavigate } from "@tanstack/react-router";
import { Button } from "../../components/ui/button";
import { useCreatePlan, usePlans } from "../../renderer/hooks/use-plans";

export function HomePage() {
  const navigate = useNavigate();
  const plansQuery = usePlans();
  const createPlan = useCreatePlan();

  const plans = plansQuery.data ?? [];

  const createSamplePlan = async () => {
    const name = `Plan ${plans.length + 1}`;
    await createPlan.mutateAsync({ name, description: "Created from renderer flow" });
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-3xl font-semibold tracking-tight">Planner</h1>
      <p className="text-muted-foreground">
        Renderer hooks are now connected to IPC-backed TanStack Query data flows.
      </p>

      <section className="rounded-lg border bg-card p-4 text-card-foreground">
        <h2 className="mb-3 text-lg font-semibold">Plans</h2>
        <div className="mb-4 flex flex-wrap gap-3">
          <Button onClick={createSamplePlan} disabled={createPlan.isPending}>
            Add Plan
          </Button>
        </div>

        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No plans yet. Create your first plan.</p>
        ) : (
          <ul className="space-y-2">
            {plans.map((plan) => (
              <li
                key={plan.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">Plan id: {plan.id}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate({ to: "/plan/$planId", params: { planId: String(plan.id) } })
                  }
                >
                  Open
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
